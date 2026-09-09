"""
Traducción de una pregunta en lenguaje natural a filtros sobre el catálogo.

Lo que el modelo devuelve es una PROPUESTA de filtros, y nada más: aquí se
valida contra el mundo real antes de que llegue a una consulta. Un tema que no
está en el pool se descarta (no se busca por un id inventado, que devolvería
cero y parecería "no hay nada sobre eso"); un tipo de unidad que no existe se
descarta; un límite absurdo se recorta.

El alcance de la conversación —lo que la persona eligió a mano en el selector
de la interfaz— siempre gana sobre lo que el modelo proponga. Si alguien acotó
a tres conferencias, el agente no puede ampliar la búsqueda porque le pareció
que la pregunta pedía más.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass, replace
from typing import Any, Mapping, Sequence

from bitacora.conferencias.tipos import (
    ESTADOS_DE_VALIDACION,
    TIPOS_DE_UNIDAD,
    Tema,
)

"""
Misma lista de muletillas que `frontend/src/features/chat/generarRespuesta.ts`.

Está duplicada a conciencia: el frontend la necesita para su recuperación
local y este backend para la suya, y no hay forma de compartir una constante
entre TypeScript y Python sin montar un generador. Lo que sí importa es que
las dos digan lo mismo, porque si no, la misma pregunta encuentra cosas
distintas según quién la responda — y eso, en un producto cuya promesa es la
trazabilidad, se lee como que el catálogo cambió.
"""
MULETILLAS = frozenset(
    {
        "habla", "hablame", "hablar", "cuentame", "cuenta", "dime", "dame",
        "busca", "buscame", "quiero", "necesito", "me", "gustaria", "saber",
        "sobre", "acerca", "de", "del", "la", "las", "el", "los", "un", "una",
        "que", "algo", "informacion", "fichas", "ficha", "y", "o", "con",
        "para", "por", "en",
    }
)

"""
Tope de fichas que se recuperan para una respuesta. No es una preferencia de
formato: es el límite de lo que el modelo puede leer entero y citar con
honestidad. Con doscientas fichas en la indicación, el modelo empieza a
resumir sobre las primeras y a citar ids de las que ya no está mirando, que es
exactamente el fallo que este agente no puede tener.
"""
LIMITE_MAXIMO = 40
LIMITE_POR_DEFECTO = 12


@dataclass(frozen=True)
class FiltrosDeConsulta:
    """Los mismos ejes que `CriteriosDeCatalogo` del frontend, más el alcance."""

    palabras: tuple[str, ...] = ()
    id_tema: str | None = None
    tipo_de_unidad: str | None = None
    evento: str | None = None
    estado: str = "todos"
    ids_conferencias: tuple[str, ...] = ()
    limite: int = LIMITE_POR_DEFECTO


def normalizar(texto: str) -> str:
    sin_acentos = unicodedata.normalize("NFD", texto.strip().lower())

    return "".join(
        caracter for caracter in sin_acentos if unicodedata.category(caracter) != "Mn"
    )


def palabras_clave(pregunta: str) -> tuple[str, ...]:
    """
    Quita las muletillas para que quede lo que de verdad se busca.

    "Háblame de sesgos algorítmicos" no encontraría nada buscando todas sus
    palabras, porque ninguna ficha dice "háblame". Si al quitarlas no queda
    nada (la pregunta era pura cortesía), se devuelven las originales en vez de
    una búsqueda vacía que traería el catálogo entero.
    """
    crudas = tuple(
        palabra
        for palabra in normalizar(pregunta).replace(",", " ").replace(".", " ").split()
        if palabra
    )
    utiles = tuple(palabra for palabra in crudas if palabra not in MULETILLAS)

    return utiles or crudas


def _texto(valor: Any) -> str:
    return " ".join(str(valor or "").split())


def _resolver_id_de_tema(temas: Sequence[Tema], nombre: str) -> str | None:
    if nombre == "":
        return None

    buscado = normalizar(nombre)

    for tema in temas:
        if normalizar(tema.nombre) == buscado:
            return tema.id

    return None


def filtros_desde_propuesta(
    propuesta: Any,
    pregunta: str,
    temas: Sequence[Tema],
    eventos_visibles: Sequence[str],
) -> FiltrosDeConsulta:
    """
    Un campo que el modelo no supo llenar se queda en `None`, nunca se adivina.

    Un filtro inventado es peor que ningún filtro: recorta el catálogo por un
    criterio que la persona no pidió y deja una respuesta segura de sí misma
    sobre un subconjunto arbitrario.
    """
    if not isinstance(propuesta, Mapping):
        return FiltrosDeConsulta(palabras=palabras_clave(pregunta))

    tipo = _texto(propuesta.get("tipo_de_unidad")).lower()
    estado = _texto(propuesta.get("estado_de_validacion")).lower()
    evento = _texto(propuesta.get("evento"))

    """
    El evento se compara contra los que la persona puede ver, no contra una
    lista global: si el modelo propone un evento que esa persona no tiene, el
    filtro se descarta en vez de garantizar cero resultados.
    """
    evento_valido = next(
        (
            visible
            for visible in eventos_visibles
            if evento != "" and normalizar(visible) == normalizar(evento)
        ),
        None,
    )

    propuestas_de_palabras = propuesta.get("palabras_clave")
    if isinstance(propuestas_de_palabras, list) and propuestas_de_palabras:
        palabras = tuple(
            normalizar(_texto(palabra))
            for palabra in propuestas_de_palabras
            if _texto(palabra) != ""
        )
    else:
        palabras = palabras_clave(pregunta)

    return FiltrosDeConsulta(
        palabras=palabras,
        id_tema=_resolver_id_de_tema(temas, _texto(propuesta.get("tema"))),
        tipo_de_unidad=tipo if tipo in TIPOS_DE_UNIDAD else None,
        evento=evento_valido,
        estado=estado if estado in ESTADOS_DE_VALIDACION else "todos",
        limite=_limite(propuesta.get("cantidad")),
    )


def _limite(valor: Any) -> int:
    try:
        pedido = int(round(float(valor)))
    except (TypeError, ValueError):
        return LIMITE_POR_DEFECTO

    return min(LIMITE_MAXIMO, max(1, pedido))


def alcance_desde_jsonb(alcance: Any) -> dict[str, Any]:
    """
    El `alcance` de `conversaciones_chat` lo escribe el frontend, en camelCase.

    Se lee con la ortografía de TypeScript (`idsConferencias`, `idTema`,
    `palabraClave`) porque esa columna es de la interfaz: normalizarla a
    snake_case aquí obligaría al frontend a leer una forma y escribir otra.
    Un alcance con una forma que no se reconoce se trata como `todas`, que es
    el valor por defecto de la columna.
    """
    if not isinstance(alcance, Mapping):
        return {"tipo": "todas"}

    tipo = _texto(alcance.get("tipo"))

    if tipo == "seleccion":
        ids = alcance.get("idsConferencias")
        return {
            "tipo": "seleccion",
            "idsConferencias": tuple(str(id_) for id_ in ids) if isinstance(ids, list) else (),
        }

    if tipo == "filtro":
        return {
            "tipo": "filtro",
            "idTema": str(alcance["idTema"]) if alcance.get("idTema") else None,
            "palabraClave": _texto(alcance.get("palabraClave")),
        }

    return {"tipo": "todas"}


def aplicar_alcance(filtros: FiltrosDeConsulta, alcance: Any) -> FiltrosDeConsulta:
    """El alcance elegido a mano manda: acota, nunca amplía lo que el modelo propuso."""
    resuelto = alcance_desde_jsonb(alcance)

    if resuelto["tipo"] == "seleccion":
        return replace(filtros, ids_conferencias=tuple(resuelto["idsConferencias"]))

    if resuelto["tipo"] == "filtro":
        palabra = resuelto["palabraClave"]
        palabras = filtros.palabras
        if palabra:
            extra = tuple(normalizar(palabra).split())
            palabras = tuple(dict.fromkeys(palabras + extra))

        return replace(filtros, id_tema=resuelto["idTema"] or filtros.id_tema, palabras=palabras)

    return filtros
