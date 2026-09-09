"""
Transcripción del audio con la API de OpenAI, usando la clave del usuario.

La única decisión de peso está en pedir `verbose_json` con
`timestamp_granularities=["segment"]`: es lo que devuelve la coordenada real
de cada tramo, que es el requisito no funcional duro del producto. Sin eso la
respuesta trae solo el texto y las fichas no tendrían dónde apuntar.
"""

from __future__ import annotations

from io import BytesIO
from typing import Any

from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.compartido.ia import ClienteDeOpenAI, traducir_fallo
from bitacora.conferencias.tipos import Segmento
from bitacora.transcripcion.segmentos import normalizar_segmentos


def transcribir(
    cliente: ClienteDeOpenAI,
    modelo: str,
    nombre_de_archivo: str,
    contenido: bytes,
    idioma: str = "es",
) -> tuple[Segmento, ...]:
    """
    `idioma` se fija en español por defecto en vez de dejar que el modelo lo
    detecte. Las charlas de este grupo son en español, y la autodetección
    falla justo donde más duele: en los primeros segundos, donde suele haber
    una presentación con nombres propios en inglés, y una detección errónea
    ahí degrada la transcripción de la charla entera. Sigue siendo un
    parámetro por si alguna vez se carga una conferencia en otro idioma.
    """
    archivo = BytesIO(contenido)
    archivo.name = nombre_de_archivo

    try:
        respuesta: Any = cliente.audio.transcriptions.create(
            model=modelo,
            file=archivo,
            language=idioma,
            response_format="verbose_json",
            timestamp_granularities=["segment"],
        )
    except Exception as fallo:  # noqa: BLE001 - se traduce al catálogo, nunca se propaga crudo
        raise traducir_fallo(fallo) from fallo

    crudos = (
        respuesta.get("segments")
        if isinstance(respuesta, dict)
        else getattr(respuesta, "segments", None)
    )

    segmentos = normalizar_segmentos(crudos or [])

    if not segmentos:
        raise ErrorDeBitacora("PROC_TRANSCRIPCION_VACIA")

    return segmentos
