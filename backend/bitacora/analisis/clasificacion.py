"""
Validación de lo que el modelo propone, y regla de validación inicial.

Este archivo es la frontera entre "lo que dijo el LLM" y "lo que entra al
catálogo". Nada de lo que devuelve el modelo se guarda sin pasar por aquí:
ni el tipo de unidad (podría inventar uno), ni el tema (podría inventar uno
que no está en el pool), ni la coordenada (podría devolver segundos que no
existen en la ventana que se le mandó). El resto del backend puede confiar en
sus salidas justamente porque este módulo desconfía de todas sus entradas.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence

from bitacora.analisis.chunking import Ventana, contexto_de
from bitacora.conferencias.tipos import (
    TIPOS_DE_UNIDAD,
    Ficha,
    PropuestaDeTema,
    Tema,
)

"""
Umbral de confianza por tipo de unidad, y el corazón del human-in-the-loop.

El README lo plantea como "100% en citas textuales, muestreo en
clasificaciones interpretativas", y el riesgo real no es el mismo en los seis
tipos:

- `cita-textual` y `dato-de-impacto` no admiten confianza alguna (umbral > 1,
  inalcanzable). Una cita mal transcrita pone en boca de una persona real algo
  que no dijo, y una cifra de impacto mal atribuida es una afirmación fáctica
  sobre un tercero: los dos son daños que el catálogo no puede reparar después
  con una nota al pie, así que los dos pasan por una persona siempre.
- `postura` atribuye una posición a alguien; es interpretación, pero
  interpretación sobre una persona identificable, así que exige mucha
  confianza.
- `metodo`, `estrategia` y `fase-del-trabajo` describen contenido técnico: si
  se clasifican mal, el costo es un filtro que devuelve de más, no una
  atribución falsa.

Los números salen de esa jerarquía de daño, no de una medición: cuando haya
tasa real de corrección por tipo (la validación HITL la va a producir sola),
esto se recalibra con datos. Hasta entonces, el sesgo deliberado es hacia
`pendiente`.
"""
UMBRAL_DE_CONFIANZA_POR_TIPO: Mapping[str, float] = {
    "cita-textual": 1.01,
    "dato-de-impacto": 1.01,
    "postura": 0.85,
    "estrategia": 0.75,
    "metodo": 0.70,
    "fase-del-trabajo": 0.70,
}


@dataclass(frozen=True)
class ResultadoDeAnalisis:
    fichas: tuple[Ficha, ...]
    temas_propuestos: tuple[PropuestaDeTema, ...]


def normalizar(texto: str) -> str:
    """
    Comparación de nombres de tema sin acentos, mayúsculas ni espacios de más.

    Mismo criterio que `normalizarTexto` del frontend: el modelo escribe
    "Sesgos Algoritmicos" y el pool dice "Sesgos algorítmicos"; tratarlos como
    temas distintos llenaría `temas_propuestos` de duplicados ortográficos y
    ahogaría la curaduría en ruido, que es justo lo que esa tabla existe para
    evitar.
    """
    sin_acentos = unicodedata.normalize("NFD", texto.strip().lower())

    return " ".join(
        "".join(caracter for caracter in sin_acentos if unicodedata.category(caracter) != "Mn").split()
    )


def resolver_tema(temas: Sequence[Tema], nombre: str) -> Tema | None:
    if nombre.strip() == "":
        return None

    buscado = normalizar(nombre)

    for tema in temas:
        if normalizar(tema.nombre) == buscado:
            return tema

    return None


def estado_inicial(tipo_de_unidad: str, confianza: float, coordenada_estimada: bool) -> str:
    """
    Nunca devuelve `validada`: ese estado solo lo pone una persona.

    Que el backend pudiera marcar algo como validado vaciaría de sentido el
    paso HITL entero — el catálogo dejaría de distinguir entre "una persona lo
    confirmó" y "el modelo estaba muy seguro", que es la distinción que hace
    citable a una ficha.
    """
    if coordenada_estimada:
        """
        Una coordenada estimada no se puede dar por buena por más segura que
        esté la clasificación: la ficha sería correcta en su contenido y
        equivocada en lo único que el producto promete al segundo.
        """
        return "pendiente"

    umbral = UMBRAL_DE_CONFIANZA_POR_TIPO.get(tipo_de_unidad, 1.01)

    return "automatica" if confianza >= umbral else "pendiente"


def _numero_en_rango(valor: Any, minimo: float, maximo: float, por_defecto: float) -> float:
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return por_defecto

    return min(maximo, max(minimo, numero))


def _entero(valor: Any, por_defecto: int) -> int:
    try:
        return int(round(float(valor)))
    except (TypeError, ValueError):
        return por_defecto


def _texto(valor: Any) -> str:
    return " ".join(str(valor or "").split())


def _ajustar_coordenada(inicio: int, fin: int, ventana: Ventana) -> tuple[int, int]:
    """
    La coordenada se recorta a los límites de la ventana que se analizó.

    El modelo tiene los segundos escritos delante de cada línea, pero a veces
    devuelve el minuto redondeado o arrastra un tiempo de la ventana anterior.
    Recortar en vez de descartar conserva la ficha con una coordenada que, en
    el peor caso, apunta al borde del tramo correcto; aceptarla tal cual la
    haría apuntar a un punto de la charla donde eso no se dijo, y el
    reproductor llevaría a quien valida a otra parte.
    """
    limite_inferior, limite_superior = ventana.inicio, ventana.fin

    inicio_ajustado = min(max(inicio, limite_inferior), limite_superior)
    fin_ajustado = min(max(fin, inicio_ajustado), limite_superior)

    return inicio_ajustado, fin_ajustado


def _hablante_de(ventana: Ventana, inicio: int, ponente: str) -> str:
    """
    Quién habló en ese punto según los segmentos, con el ponente como respaldo.

    Se prefiere el hablante marcado en la transcripción sobre el ponente de la
    conferencia porque una charla puede ser un panel (`tipos.ts`: "puede no ser
    el ponente principal cuando la charla fue un panel"), y atribuirle al
    ponente algo que dijo otro es exactamente el error que la validación de
    citas textuales existe para atrapar.
    """
    for segmento in ventana.segmentos:
        if segmento.inicio <= inicio <= segmento.fin and segmento.hablante:
            return segmento.hablante

    return ponente


@dataclass(frozen=True)
class ContextoDeClasificacion:
    id_conferencia: str
    ponente: str
    temas: tuple[Tema, ...]
    """
    Tema al que caen las fichas cuyo tema propuesto no está en el pool. Se usa
    el tema principal de la conferencia si lo tiene, y si no el primero del
    pool. Es un respaldo consciente: `fichas.id_tema` es NOT NULL y con FK a
    `temas`, así que o la ficha lleva un tema existente o se pierde. Perder
    contenido real de la charla porque el vocabulario todavía no cubre su tema
    sería el peor de los dos desenlaces; la ficha queda en `pendiente` y la
    propuesta viaja a curaduría, de modo que reclasificarla después es un
    cambio de una columna y no una reprocesada entera.
    """
    id_tema_de_respaldo: str


def validar_propuestas(
    propuestas: Iterable[Any],
    ventana: Ventana,
    contexto: ContextoDeClasificacion,
) -> ResultadoDeAnalisis:
    """Convierte la salida cruda del modelo para UNA ventana en fichas guardables."""
    fichas: list[Ficha] = []
    temas_propuestos: list[PropuestaDeTema] = []

    for propuesta in propuestas:
        if not isinstance(propuesta, Mapping):
            continue

        fragmento = _texto(propuesta.get("fragmento"))
        tipo_de_unidad = _texto(propuesta.get("tipo_de_unidad")).lower()

        if fragmento == "" or tipo_de_unidad not in TIPOS_DE_UNIDAD:
            continue

        inicio, fin = _ajustar_coordenada(
            _entero(propuesta.get("segundo_inicio"), ventana.inicio),
            _entero(propuesta.get("segundo_fin"), ventana.inicio),
            ventana,
        )

        nombre_de_tema = _texto(propuesta.get("tema"))
        tema = resolver_tema(contexto.temas, nombre_de_tema)

        if tema is None and nombre_de_tema != "":
            temas_propuestos.append(
                PropuestaDeTema(
                    nombre=nombre_de_tema,
                    justificacion=_texto(propuesta.get("justificacion_del_tema"))
                    or f'El análisis clasificó "{fragmento[:120]}" bajo un tema fuera del pool.',
                )
            )

        confianza = _numero_en_rango(propuesta.get("confianza"), 0.0, 1.0, 0.0)

        fichas.append(
            Ficha(
                id_conferencia=contexto.id_conferencia,
                fragmento=fragmento,
                hablante=_texto(propuesta.get("hablante"))
                or _hablante_de(ventana, inicio, contexto.ponente),
                segundo_inicio=inicio,
                segundo_fin=fin,
                id_tema=tema.id if tema is not None else contexto.id_tema_de_respaldo,
                tipo_de_unidad=tipo_de_unidad,
                estado_de_validacion=estado_inicial(
                    tipo_de_unidad,
                    confianza,
                    ventana.estimada or tema is None,
                ),
                confianza_automatica=round(confianza, 2),
                contexto_minimo=contexto_de(ventana, inicio, fin),
            )
        )

    return ResultadoDeAnalisis(fichas=tuple(fichas), temas_propuestos=tuple(temas_propuestos))


"""
Cuánto se pueden solapar en el tiempo dos fichas del mismo tipo antes de
considerarse la misma. El solape entre ventanas hace que la misma unidad se
analice dos veces, y el modelo casi nunca devuelve exactamente los mismos
segundos las dos veces.
"""
SEGUNDOS_DE_TOLERANCIA_AL_DEDUPLICAR = 5


def deduplicar(fichas: Sequence[Ficha]) -> tuple[Ficha, ...]:
    """
    Quita las repeticiones que produce el solape entre ventanas.

    Se comparan fragmento normalizado y cercanía temporal, no el fragmento
    solo: una charla puede repetir literalmente la misma frase en dos momentos
    distintos ("y esto es lo importante"), y esas SÍ son dos fichas — cada una
    con su coordenada. Comparar solo el texto las fusionaría y borraría una
    aparición real del catálogo.

    Cuando dos son la misma, gana la de mayor confianza: es la lectura que el
    modelo hizo con más contexto alrededor.
    """
    conservadas: list[Ficha] = []

    for ficha in sorted(fichas, key=lambda f: (f.segundo_inicio, -f.confianza_automatica)):
        clave = normalizar(ficha.fragmento)
        duplicada_en = None

        for indice, conservada in enumerate(conservadas):
            if normalizar(conservada.fragmento) != clave:
                continue
            if (
                abs(conservada.segundo_inicio - ficha.segundo_inicio)
                <= SEGUNDOS_DE_TOLERANCIA_AL_DEDUPLICAR
            ):
                duplicada_en = indice
                break

        if duplicada_en is None:
            conservadas.append(ficha)
        elif ficha.confianza_automatica > conservadas[duplicada_en].confianza_automatica:
            conservadas[duplicada_en] = ficha

    return tuple(sorted(conservadas, key=lambda f: (f.segundo_inicio, f.segundo_fin)))


def deduplicar_propuestas(propuestas: Sequence[PropuestaDeTema]) -> tuple[PropuestaDeTema, ...]:
    """Una propuesta por nombre normalizado: la curaduría revisa temas, no repeticiones."""
    vistas: dict[str, PropuestaDeTema] = {}

    for propuesta in propuestas:
        vistas.setdefault(normalizar(propuesta.nombre), propuesta)

    return tuple(vistas.values())


def resumen_de(fichas: Sequence[Ficha], temas: Sequence[Tema]) -> str:
    """
    Resumen de la conferencia armado con lo que el pipeline calculó de verdad.

    No se le pide al modelo: un resumen generado sería una afirmación más sobre
    la charla, sin coordenada y sin nadie que la valide, dentro de un producto
    cuya premisa es que todo lo que se muestra es rastreable hasta un segundo
    concreto. Contar fichas y nombrar temas dice menos, pero todo lo que dice
    es verificable.
    """
    if not fichas:
        return ""

    nombres = {tema.id: tema.nombre for tema in temas}
    presentes: list[str] = []

    for ficha in fichas:
        nombre = nombres.get(ficha.id_tema)
        if nombre and nombre not in presentes:
            presentes.append(nombre)

    pendientes = sum(1 for ficha in fichas if ficha.estado_de_validacion == "pendiente")
    unidad = "ficha" if len(fichas) == 1 else "fichas"
    temas_texto = ", ".join(presentes[:3]) if presentes else "sin tema resuelto"

    return (
        f"{len(fichas)} {unidad} sobre {temas_texto}. "
        f"{pendientes} en espera de validación."
    )

