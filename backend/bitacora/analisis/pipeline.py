"""
El recorrido completo de una conferencia: de `en-cola` a `procesada`/`fallida`.

Recibe sus colaboradores por parámetro (repositorio, transcriptor, analizador)
en vez de construirlos: es lo que permite ejercitar el recorrido entero —
incluyendo el camino de fallo y el estado en que queda la conferencia— sin red
ni credenciales. La composición real vive en `api/dependencias.py`.

El estado se escribe en la tabla conforme avanza y no al final, porque es lo
único que el frontend puede observar mientras esto corre: la petición HTTP ya
respondió (procesar una charla de 45 minutos tarda minutos, no cabe en un
request), así que `conferencias.estado` ES la barra de progreso.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Protocol, Sequence

from bitacora.analisis.chunking import Ventana, agrupar_en_ventanas, renderizar_ventana
from bitacora.analisis.clasificacion import (
    ContextoDeClasificacion,
    deduplicar,
    deduplicar_propuestas,
    resumen_de,
    validar_propuestas,
)
from bitacora.analisis.modelo import AnalizadorDeDiscurso
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.conferencias.repositorio import RepositorioDeConferencias
from bitacora.conferencias.tipos import Conferencia, Ficha, PropuestaDeTema, Segmento, Tema
from bitacora.transcripcion.lectura import texto_de_archivo
from bitacora.transcripcion.segmentos import duracion_de, segmentos_desde_transcripcion

"""
Estados desde los que se puede (re)procesar. `procesada` queda fuera a
propósito: reprocesar borra las fichas y con ellas el trabajo de validación
que alguien ya hizo a mano, así que no puede ser el resultado de que dos
pestañas manden la misma petición. `fallida` sí entra, porque es exactamente
el caso en que reintentar es lo que corresponde.
"""
ESTADOS_PROCESABLES = ("en-cola", "fallida")


class Transcriptor(Protocol):
    def __call__(self, nombre_de_archivo: str, contenido: bytes) -> tuple[Segmento, ...]: ...


@dataclass(frozen=True)
class ResultadoDelProcesamiento:
    id_conferencia: str
    fichas_creadas: int
    fichas_pendientes: int
    temas_propuestos: int
    duracion_en_segundos: int


def _segmentos_de_la_fuente(
    conferencia: Conferencia,
    nombre_de_archivo: str,
    contenido: bytes,
    transcribir: Transcriptor,
) -> tuple[Segmento, ...]:
    """
    Si la fuente ya es transcripción, no se transcribe: se parsea.

    Mandar una transcripción a Whisper sería pagar por convertir texto en
    texto, y de paso perder las marcas de tiempo que el propio archivo ya
    traía.
    """
    if conferencia.fuente == "transcripcion":
        return segmentos_desde_transcripcion(
            texto_de_archivo(nombre_de_archivo, contenido),
            conferencia.duracion_en_segundos,
        )

    return transcribir(nombre_de_archivo, contenido)


def _tema_de_respaldo(conferencia: Conferencia, temas: Sequence[Tema]) -> str:
    if conferencia.id_tema_principal:
        return conferencia.id_tema_principal

    return temas[0].id


def _analizar_ventanas(
    conferencia: Conferencia,
    ventanas: Sequence[Ventana],
    temas: Sequence[Tema],
    analizar: AnalizadorDeDiscurso,
) -> tuple[tuple[Ficha, ...], tuple[PropuestaDeTema, ...]]:
    contexto = ContextoDeClasificacion(
        id_conferencia=conferencia.id,
        ponente=conferencia.ponente,
        temas=tuple(temas),
        id_tema_de_respaldo=_tema_de_respaldo(conferencia, temas),
    )

    fichas: list[Ficha] = []
    propuestas: list[PropuestaDeTema] = []

    for ventana in ventanas:
        crudas = analizar(
            conferencia.titulo,
            conferencia.ponente,
            conferencia.evento,
            temas,
            renderizar_ventana(ventana),
        )
        resultado = validar_propuestas(crudas, ventana, contexto)
        fichas.extend(resultado.fichas)
        propuestas.extend(resultado.temas_propuestos)

    return deduplicar(fichas), deduplicar_propuestas(propuestas)


def procesar_conferencia(
    id_conferencia: str,
    repositorio: RepositorioDeConferencias,
    transcribir: Transcriptor,
    analizar: AnalizadorDeDiscurso,
) -> ResultadoDelProcesamiento:
    """
    Marca `fallida` ante cualquier fallo posterior a `procesando`, y solo ahí.

    Un fallo ANTES de marcar `procesando` (la conferencia no existe, no está
    en un estado procesable, no hay temas en la taxonomía) no debe tocar el
    estado: no es la conferencia la que falló, es la petición la que no
    correspondía, y dejar en `fallida` una conferencia que sigue perfectamente
    `en-cola` obligaría a alguien a recargarla para nada.
    """
    conferencia = repositorio.obtener_conferencia(id_conferencia)

    if conferencia.estado not in ESTADOS_PROCESABLES:
        raise ErrorDeBitacora("PROC_ESTADO_NO_PROCESABLE", conferencia.estado)

    temas = repositorio.listar_temas()
    if not temas:
        raise ErrorDeBitacora("PROC_SIN_TEMAS_DISPONIBLES")

    repositorio.marcar_estado(id_conferencia, "procesando")

    try:
        nombre, contenido = repositorio.descargar_fuente(conferencia)
        segmentos = _segmentos_de_la_fuente(conferencia, nombre, contenido, transcribir)

        ventanas = agrupar_en_ventanas(segmentos)
        fichas, propuestas = _analizar_ventanas(conferencia, ventanas, temas, analizar)

        if not fichas:
            raise ErrorDeBitacora("PROC_SIN_FICHAS")

        duracion = max(conferencia.duracion_en_segundos, duracion_de(segmentos))

        repositorio.guardar_resultado_del_analisis(
            id_conferencia, fichas, resumen_de(fichas, temas), duracion
        )
        """
        Las propuestas de tema se registran DESPUÉS de guardar las fichas: si
        esta escritura falla, la conferencia ya quedó procesada y lo único que
        se pierde es material de curaduría que reprocesar vuelve a producir.
        Al revés, un fallo aquí dejaría la charla entera sin fichas.
        """
        repositorio.registrar_temas_propuestos(conferencia.evento, propuestas)
    except ErrorDeBitacora:
        repositorio.marcar_estado(id_conferencia, "fallida")
        raise
    except Exception as fallo:  # noqa: BLE001
        repositorio.marcar_estado(id_conferencia, "fallida")
        raise ErrorDeBitacora("CONF_PROCESAMIENTO_FALLIDO", type(fallo).__name__) from fallo

    return ResultadoDelProcesamiento(
        id_conferencia=id_conferencia,
        fichas_creadas=len(fichas),
        fichas_pendientes=sum(
            1 for ficha in fichas if ficha.estado_de_validacion == "pendiente"
        ),
        temas_propuestos=len(propuestas),
        duracion_en_segundos=duracion,
    )


def procesar_sin_propagar(
    id_conferencia: str,
    repositorio: RepositorioDeConferencias,
    transcribir: Transcriptor,
    analizar: AnalizadorDeDiscurso,
    registrar: Callable[[str, str], None],
) -> None:
    """
    Envoltorio para correr en segundo plano, donde no hay a quién propagarle.

    El código del error se registra en el log del servidor —nunca el detalle
    de la excepción original— y el desenlace le llega a la persona por el
    único canal que sigue abierto: `conferencias.estado` en `fallida`, que la
    interfaz ya sabe traducir a `CONF_PROCESAMIENTO_FALLIDO`.
    """
    try:
        procesar_conferencia(id_conferencia, repositorio, transcribir, analizar)
    except ErrorDeBitacora as error:
        registrar(id_conferencia, error.codigo)
    except Exception as fallo:  # noqa: BLE001
        registrar(id_conferencia, f"INESPERADO:{type(fallo).__name__}")
