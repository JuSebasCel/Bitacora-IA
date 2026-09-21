"""
Endpoint de procesamiento de una conferencia.

Responde 202 y sigue trabajando en segundo plano. Procesar una charla de 45
minutos son varios minutos de transcripción más una llamada al modelo por
ventana: no cabe en una petición HTTP, y mantenerla abierta solo produciría
timeouts del proxy que se ven como fallos aunque el trabajo haya terminado
bien. El canal por el que la persona ve el avance es `conferencias.estado`,
que la interfaz ya consulta y ya sabe pintar.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, status
from pydantic import BaseModel

from bitacora.analisis.pipeline import ESTADOS_PROCESABLES, procesar_sin_propagar
from bitacora.api.dependencias import (
    Usuario,
    analizador_para,
    cliente_de_openai,
    cliente_para,
    condensador_para,
    repositorio_de_conferencias,
    transcriptor_de,
)
from bitacora.analisis.chunking import CARACTERES_POR_VENTANA
from bitacora.compartido.datos import reservar_cupo_de_audio
from bitacora.compartido.ia import es_de_groq
from bitacora.compartido.errores import ErrorDeBitacora

"""
Ventana de la transcripción por llamada al modelo cuando se analiza con Groq:
unos 1.500 tokens, que con las instrucciones y la respuesta dejan cada
petición cómodamente por debajo de 8.000 tokens por minuto.
"""
CARACTERES_POR_VENTANA_EN_GROQ = 5000


router = APIRouter(prefix="/conferencias", tags=["conferencias"])

registro = logging.getLogger("bitacora.procesamiento")


class RespuestaDeProcesamiento(BaseModel):
    id_conferencia: str
    estado: str
    mensaje: str


def registrar_fallo(id_conferencia: str, codigo: str) -> None:
    """
    Se registra el código, nunca el detalle de la excepción original.

    El log del servidor no es un lugar privado: lo lee cualquiera con acceso al
    despliegue. Un `str(excepcion)` de OpenAI puede llevar el prefijo de la
    clave del usuario, y uno de PostgREST el contenido de una fila ajena.
    """
    registro.warning("procesamiento fallido conferencia=%s codigo=%s", id_conferencia, codigo)


@router.post(
    "/{id_conferencia}/procesar",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RespuestaDeProcesamiento,
)
def procesar(
    id_conferencia: str, usuario: Usuario, tareas: BackgroundTasks
) -> RespuestaDeProcesamiento:
    """
    Las comprobaciones que pueden fallar rápido corren ANTES de aceptar.

    Que la conferencia exista y sea visible, que esté en un estado procesable y
    que la persona tenga API key configurada son las tres razones por las que
    una petición se rechaza sin haber empezado nada, y las tres se resuelven en
    milisegundos. Dejarlas para el segundo plano devolvería 202 a peticiones
    condenadas y obligaría a esperar a ver `fallida` para enterarse de algo que
    se sabía de entrada. El pipeline las vuelve a comprobar igualmente: es la
    única forma de que siga siendo correcto si algún día se invoca desde una
    cola en vez de desde aquí.
    """
    repositorio = repositorio_de_conferencias(usuario)
    conferencia = repositorio.obtener_conferencia(id_conferencia)

    if conferencia.estado not in ESTADOS_PROCESABLES:
        raise ErrorDeBitacora("PROC_ESTADO_NO_PROCESABLE", conferencia.estado)

    """
    Dos clientes y no uno: la transcripción y las fichas pueden ir con claves
    distintas (cuentas distintas de Groq, cada una con sus límites), y cada
    uno lleva la cadena de modelos de su uso.

    Con la clave compartida de la administración, la carga gasta del cupo
    diario común, y se reserva AQUÍ, antes de aceptar: descubrir en segundo
    plano que ya no quedaba cupo dejaría la conferencia `fallida` por algo
    que se sabía de entrada. Solo cuenta el audio, que es lo que Groq limita
    más; una transcripción en texto no gasta de ese cupo.
    """
    clave_de_voz = usuario.clave_de_openai("transcripcion")

    if clave_de_voz.compartida and conferencia.fuente == "audio":
        cabe = reservar_cupo_de_audio(
            usuario.cliente, conferencia.duracion_en_segundos, usuario.configuracion.secreto_del_servidor
        )
        if not cabe:
            raise ErrorDeBitacora("IA_CUPO_DIARIO_AGOTADO")

    cliente_de_voz = cliente_para(usuario, clave_de_voz, "transcripcion")
    clave_de_texto = usuario.clave_de_openai("fichas")
    cliente_de_texto = cliente_para(usuario, clave_de_texto, "fichas")

    """
    Con Groq, ventanas más cortas: el plan gratuito deja 8.000 tokens por
    minuto por modelo, y una ventana de 12.000 caracteres con sus
    instrucciones y su respuesta ya pedía unos 8.500 sola.
    """
    caracteres_por_ventana = CARACTERES_POR_VENTANA_EN_GROQ if es_de_groq(clave_de_texto) else CARACTERES_POR_VENTANA

    tareas.add_task(
        procesar_sin_propagar,
        id_conferencia,
        repositorio,
        transcriptor_de(usuario, cliente_de_voz),
        analizador_para(usuario, cliente_de_texto),
        registrar_fallo,
        condensador_para(usuario, cliente_de_texto),
        caracteres_por_ventana,
    )

    return RespuestaDeProcesamiento(
        id_conferencia=id_conferencia,
        estado="procesando",
        mensaje="La conferencia entró a procesamiento. Su estado se actualiza en la tabla.",
    )
