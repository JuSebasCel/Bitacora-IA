"""
De una fuente cruda a segmentos con coordenada real. Todo puro y probado.

Hay tres orígenes posibles y los tres terminan en la misma lista de
`Segmento`, porque el análisis de discurso no debería tener que saber de cuál
vino: los segmentos que devuelve whisper, una transcripción escrita con marcas
de tiempo, y una transcripción sin ninguna marca.

El tercer caso es el incómodo y merece la decisión explícita que hay abajo.
"""

from __future__ import annotations

import re
from typing import Any, Iterable, Sequence

from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.conferencias.tipos import Segmento

"""
Marca de tiempo al principio de una línea: `[12:30]`, `12:30`, `[01:02:03]`,
`(1:02:03)`. Se exige que esté al inicio de la línea y no en cualquier parte
del texto para no confundir un tiempo con una cifra dicha en la charla ("el
modelo bajó de 12:30 a 8:15 minutos por lote" no es una marca).
"""
_MARCA_DE_TIEMPO = re.compile(
    r"^\s*[\[\(]?(?P<a>\d{1,2}):(?P<b>\d{2})(?::(?P<c>\d{2}))?[\]\)]?\s*"
)

"""
Etiqueta de hablante inmediatamente después de la marca: `Ana Ruiz:` o
`ANA RUIZ -`. Se limita a pocas palabras y sin puntuación interna para no
tragarse una oración entera que casualmente tenga dos puntos en medio.
"""
_ETIQUETA_DE_HABLANTE = re.compile(r"^(?P<hablante>[^:\n]{2,40}?)\s*[:\-]\s+")

"""
Cuánto texto puede quedar bajo una sola marca antes de que el reparto interno
por caracteres deje de ser honesto. Con marcas cada varios minutos, decir que
una cita ocurrió en el segundo exacto de la marca es peor que repartir dentro
del tramo, pero repartir dentro de un tramo enorme también es inventar.
"""
SEGUNDOS_MAXIMOS_POR_SEGMENTO = 90


def _a_segundos(coincidencia: re.Match[str]) -> int:
    """`mm:ss` cuando hay dos grupos, `hh:mm:ss` cuando hay tres."""
    primero = int(coincidencia.group("a"))
    segundo = int(coincidencia.group("b"))
    tercero = coincidencia.group("c")

    if tercero is None:
        return primero * 60 + segundo

    return primero * 3600 + segundo * 60 + int(tercero)


def _entero_no_negativo(valor: Any) -> int:
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        return 0

    return max(0, int(round(numero)))


def _limpiar(texto: Any) -> str:
    return " ".join(str(texto or "").split())


def normalizar_segmentos(crudos: Iterable[Any]) -> tuple[Segmento, ...]:
    """
    Segmentos tal como los devuelve la transcripción de OpenAI (`verbose_json`).

    Se aceptan tanto objetos con atributos como diccionarios porque el SDK de
    OpenAI devuelve objetos tipados y los mocks de la suite devuelven dicts;
    exigir uno de los dos obligaría a construir objetos falsos del SDK en cada
    prueba solo para leer tres campos.

    Un `fin` anterior al `inicio` no se descarta sino que se corrige a
    `inicio`: perder el fragmento por un tiempo mal reportado sería tirar
    contenido real de la charla por un defecto de la herramienta.
    """
    segmentos: list[Segmento] = []

    for crudo in crudos:
        if isinstance(crudo, dict):
            inicio_crudo = crudo.get("start")
            fin_crudo = crudo.get("end")
            texto_crudo = crudo.get("text")
        else:
            inicio_crudo = getattr(crudo, "start", None)
            fin_crudo = getattr(crudo, "end", None)
            texto_crudo = getattr(crudo, "text", None)

        texto = _limpiar(texto_crudo)
        if texto == "":
            continue

        inicio = _entero_no_negativo(inicio_crudo)
        fin = max(inicio, _entero_no_negativo(fin_crudo))

        segmentos.append(Segmento(inicio=inicio, fin=fin, texto=texto))

    return tuple(sorted(segmentos, key=lambda segmento: (segmento.inicio, segmento.fin)))


def _lineas_con_marca(texto: str) -> list[tuple[int, str | None, str]]:
    lineas: list[tuple[int, str | None, str]] = []

    for linea in texto.splitlines():
        coincidencia = _MARCA_DE_TIEMPO.match(linea)
        if coincidencia is None:
            """
            Una línea sin marca continúa la anterior (los transcriptores parten
            el párrafo largo en varias líneas). Sin marca previa a la que
            colgarse simplemente no hay coordenada, y se descarta.
            """
            if lineas and _limpiar(linea) != "":
                inicio, hablante, acumulado = lineas[-1]
                lineas[-1] = (inicio, hablante, f"{acumulado} {_limpiar(linea)}")
            continue

        resto = linea[coincidencia.end() :]
        hablante: str | None = None

        etiqueta = _ETIQUETA_DE_HABLANTE.match(resto)
        if etiqueta is not None:
            hablante = _limpiar(etiqueta.group("hablante"))
            resto = resto[etiqueta.end() :]

        lineas.append((_a_segundos(coincidencia), hablante, _limpiar(resto)))

    return [(inicio, hablante, texto) for inicio, hablante, texto in lineas if texto != ""]


def _repartir_dentro_del_tramo(
    inicio: int, fin: int, hablante: str | None, texto: str, estimado: bool
) -> list[Segmento]:
    """
    Parte un tramo demasiado largo en trozos proporcionales por oración.

    Se corta por oración y no por número fijo de caracteres para no partir una
    cita textual justo en la mitad: una ficha de tipo `cita-textual` que empieza
    a mitad de frase es inservible aunque su coordenada sea correcta.

    El primer trozo hereda el `estimado` del tramo —su inicio es el que dijo la
    marca, medido— y los siguientes salen siempre estimados, porque su inicio
    es una interpolación por caracteres y no algo que nadie haya observado.
    Distinguirlos importa: es lo que decide si una ficha puede nacer en
    `automatica` o tiene que pasar por revisión.
    """
    duracion = fin - inicio

    if duracion <= SEGUNDOS_MAXIMOS_POR_SEGMENTO or texto == "":
        return [Segmento(inicio=inicio, fin=fin, texto=texto, hablante=hablante, estimado=estimado)]

    oraciones = [pieza.strip() for pieza in re.split(r"(?<=[.!?])\s+", texto) if pieza.strip()]
    if len(oraciones) <= 1:
        return [Segmento(inicio=inicio, fin=fin, texto=texto, hablante=hablante, estimado=estimado)]

    total_caracteres = sum(len(oracion) for oracion in oraciones)
    trozos: list[Segmento] = []
    consumidos = 0

    for indice, oracion in enumerate(oraciones):
        desde = inicio + round(duracion * consumidos / total_caracteres)
        consumidos += len(oracion)
        hasta = fin if indice == len(oraciones) - 1 else inicio + round(
            duracion * consumidos / total_caracteres
        )

        trozos.append(
            Segmento(
                inicio=desde,
                fin=max(desde, hasta),
                texto=oracion,
                hablante=hablante,
                estimado=estimado or indice > 0,
            )
        )

    return trozos


def segmentos_desde_transcripcion(texto: str, duracion_en_segundos: int) -> tuple[Segmento, ...]:
    """
    Transcripción escrita. Con marcas de tiempo se usan; sin marcas se reparte.

    El reparto proporcional por caracteres sobre la duración declarada es una
    estimación, no una medición, y por eso los segmentos salen con
    `estimado=True` y sus fichas nunca podrán nacer en `automatica`. La
    alternativa —guardar todas las fichas en el segundo 0— sería peor de una
    forma silenciosa: la coordenada existiría, se vería igual de fiable en la
    interfaz, y estaría siempre mal.

    Sin marcas y sin duración declarada, la duración se estima por ritmo de
    habla. Antes se fallaba en vez de estimar, pero la interfaz nunca declara
    duración al subir una transcripción —solo la conoce de un audio—, así que
    todo texto sin marcas moría ahí. Los segmentos siguen saliendo con
    `estimado=True`: la coordenada se sabe aproximada y se trata como tal.
    """
    marcadas = _lineas_con_marca(texto)

    if marcadas:
        segmentos: list[Segmento] = []

        for indice, (inicio, hablante, contenido) in enumerate(marcadas):
            """
            El fin de un tramo es el inicio del siguiente: la marca dice cuándo
            empieza a hablar, nunca cuándo termina. El último tramo se cierra
            con la duración declarada, o con una estimación de lectura si la
            conferencia no la trae.
            """
            if indice + 1 < len(marcadas):
                fin = max(inicio, marcadas[indice + 1][0])
            elif duracion_en_segundos > inicio:
                fin = duracion_en_segundos
            else:
                fin = inicio + _segundos_de_lectura(contenido)

            segmentos.extend(
                _repartir_dentro_del_tramo(inicio, fin, hablante, contenido, estimado=False)
            )

        return tuple(segmentos)

    contenido = _limpiar(texto)
    if contenido == "":
        raise ErrorDeBitacora("PROC_TRANSCRIPCION_VACIA")

    if duracion_en_segundos <= 0:
        duracion_en_segundos = _segundos_de_lectura(contenido)

    return tuple(
        _repartir_dentro_del_tramo(0, duracion_en_segundos, None, contenido, estimado=True)
    )


"""
Ritmo de habla de referencia para cerrar el último tramo de una transcripción
marcada cuando la conferencia no declara duración. ~150 palabras por minuto es
el promedio citado para exposición oral en español; el número exacto importa
poco porque solo afecta al `segundo_fin` del último fragmento.
"""
PALABRAS_POR_MINUTO = 150


def _segundos_de_lectura(texto: str) -> int:
    palabras = len(texto.split())

    return max(1, round(palabras * 60 / PALABRAS_POR_MINUTO))


def duracion_de(segmentos: Sequence[Segmento]) -> int:
    """Duración observada de la charla: la usa el pipeline para completar la conferencia."""
    return max((segmento.fin for segmento in segmentos), default=0)
