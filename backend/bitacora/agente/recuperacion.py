"""
Recuperación: qué fichas reales responden a unos filtros, y qué se descartó.

El emparejamiento por palabra clave se hace aquí, en Python, y no en el
`where` de Postgres. La razón es que el frontend ya define qué significa que
una ficha "menciona" algo (`buscarEnCatalogo`: toda palabra de la búsqueda
tiene que aparecer como inicio de alguna palabra del fragmento, del nombre del
tema, o del título/ponente/evento de la conferencia), y un `ilike '%x%'` no es
esa regla: haría que buscar "mét" encontrara "diamétrico" y que una ficha
cuyo único vínculo está en el título de la charla desapareciera. Que el chat y
el catálogo encuentren cosas distintas ante la misma palabra sería, para quien
usa el producto, un catálogo que cambia según por dónde se mire.

El precio es traer de Postgres las filas que pasan los filtros estructurados y
descartar en memoria. Con el volumen de un grupo de investigación es
irrelevante; cuando deje de serlo, el reemplazo ya está anticipado en el
README (pgvector como búsqueda semántica de respaldo) y entra aquí, detrás de
la misma firma.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from bitacora.agente.filtros import FiltrosDeConsulta, normalizar
from bitacora.conferencias.tipos import Tema


@dataclass(frozen=True)
class ConferenciaDeFicha:
    """Lo mínimo de la conferencia que hace falta para buscar y para citar."""

    id: str
    titulo: str
    ponente: str
    evento: str
    fecha_del_evento: str


@dataclass(frozen=True)
class FichaRecuperada:
    id: str
    fragmento: str
    hablante: str
    segundo_inicio: int
    segundo_fin: int
    id_tema: str
    tipo_de_unidad: str
    estado_de_validacion: str
    conferencia: ConferenciaDeFicha


@dataclass(frozen=True)
class PasoDeRazonamiento:
    """
    Reporte de lo que un filtro real descartó, no una narración de "pensamiento".

    Misma forma que `PasoDeRazonamiento` del frontend, que ya la persiste en
    `mensajes_chat.pasos_de_razonamiento`. Se llena con lo que el pipeline
    calculó de verdad: si el chat dijera haber descartado algo que ningún
    filtro descartó, sería exactamente la clase de invención que este agente
    existe para no cometer.
    """

    descripcion: str
    descartadas: tuple[dict[str, str], ...]
    total_descartadas: int


MAX_DESCARTADAS_POR_PASO = 5


def _palabras_de(texto: str) -> list[str]:
    return [palabra for palabra in normalizar(texto).replace(",", " ").split() if palabra]


def _texto_buscable(ficha: FichaRecuperada, temas: Sequence[Tema]) -> str:
    nombre_de_tema = next(
        (tema.nombre for tema in temas if tema.id == ficha.id_tema),
        "",
    )

    return " ".join(
        (
            ficha.fragmento,
            nombre_de_tema,
            ficha.conferencia.titulo,
            ficha.conferencia.ponente,
            ficha.conferencia.evento,
        )
    )


def filtrar_por_palabras(
    fichas: Sequence[FichaRecuperada],
    palabras: Sequence[str],
    temas: Sequence[Tema],
) -> tuple[FichaRecuperada, ...]:
    """Toda palabra buscada tiene que aparecer como inicio de alguna palabra del texto."""
    buscadas = [normalizar(palabra) for palabra in palabras if palabra.strip()]

    if not buscadas:
        return tuple(fichas)

    def coincide(ficha: FichaRecuperada) -> bool:
        disponibles = _palabras_de(_texto_buscable(ficha, temas))

        return all(
            any(palabra.startswith(buscada) for palabra in disponibles) for buscada in buscadas
        )

    return tuple(ficha for ficha in fichas if coincide(ficha))


def ordenar(fichas: Sequence[FichaRecuperada]) -> tuple[FichaRecuperada, ...]:
    """
    Mismo orden que el catálogo: charla más reciente primero, y dentro de una
    charla, en el orden en que se dijo. Ordenar por "relevancia" exigiría un
    puntaje que nadie puede auditar; el orden cronológico se explica solo y
    hace que dos consultas iguales devuelvan lo mismo.
    """
    return tuple(
        sorted(
            fichas,
            key=lambda ficha: (
                _invertido(ficha.conferencia.fecha_del_evento),
                ficha.conferencia.id,
                ficha.segundo_inicio,
            ),
        )
    )


def _invertido(fecha: str) -> tuple[int, ...]:
    """Fecha ISO a una clave que ordena descendente sin depender de `reverse`."""
    return tuple(-int(parte) for parte in fecha.split("-") if parte.isdigit())


def paso_de(
    descripcion: str,
    antes: Sequence[FichaRecuperada],
    despues: Sequence[FichaRecuperada],
    motivo: str,
) -> PasoDeRazonamiento:
    ids_restantes = {ficha.id for ficha in despues}
    descartadas = [ficha for ficha in antes if ficha.id not in ids_restantes]

    return PasoDeRazonamiento(
        descripcion=descripcion,
        descartadas=tuple(
            {"idFicha": ficha.id, "motivo": motivo}
            for ficha in descartadas[:MAX_DESCARTADAS_POR_PASO]
        ),
        total_descartadas=len(descartadas),
    )


def recuperar(
    candidatas: Sequence[FichaRecuperada],
    filtros: FiltrosDeConsulta,
    temas: Sequence[Tema],
) -> tuple[tuple[FichaRecuperada, ...], tuple[PasoDeRazonamiento, ...]]:
    """
    `candidatas` ya viene filtrada por Postgres con los criterios estructurados
    y bajo RLS: lo que llegue aquí es, por construcción, lo que esta persona
    puede ver. Este paso solo aplica la búsqueda por palabra y el recorte.
    """
    texto_buscado = " ".join(filtros.palabras)

    encontradas = filtrar_por_palabras(candidatas, filtros.palabras, temas)
    paso_busqueda = paso_de(
        f'Buscando fichas que mencionen "{texto_buscado}"' if texto_buscado
        else "Sin palabra clave: todas las del alcance",
        candidatas,
        encontradas,
        f'no menciona "{texto_buscado}"',
    )

    ordenadas = ordenar(encontradas)
    citables = ordenadas[: filtros.limite]
    paso_recorte = paso_de(
        f"Recortando a las {filtros.limite} más recientes para poder citarlas enteras",
        ordenadas,
        citables,
        "quedó fuera del tope de fichas citables",
    )

    pasos = [paso_busqueda]
    if paso_recorte.total_descartadas > 0:
        pasos.append(paso_recorte)

    return citables, tuple(pasos)
