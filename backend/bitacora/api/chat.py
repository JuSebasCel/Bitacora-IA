"""
Endpoint del agente conversacional.

Este sí responde en línea: una pregunta son dos llamadas a un modelo pequeño y
una consulta, segundos y no minutos, y la interfaz necesita la respuesta para
pintarla. El mensaje ya quedó persistido de todos modos, así que un timeout
del navegador no pierde la conversación.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from bitacora.agente.pipeline import responder
from bitacora.api.dependencias import Usuario, agente_para, cliente_de_openai, repositorio_del_agente

router = APIRouter(prefix="/chat", tags=["chat"])


class PreguntaDelUsuario(BaseModel):
    pregunta: str = Field(min_length=1)
    """
    Sin id se crea una conversación nueva; con id se continúa esa. El alcance
    NO viaja en el cuerpo: se lee de la fila, ver `asegurar_conversacion`.
    """
    id_conversacion: str | None = None


class FichaCitada(BaseModel):
    """
    La ficha se devuelve entera, no solo su id.

    La interfaz pinta una tarjeta por ficha citada debajo de la respuesta
    (`TarjetaDeFichaEnChat`), y con solo los ids tendría que hacer una segunda
    consulta por cada una para poder mostrarla. Los datos ya están en memoria
    aquí y salieron de una consulta que RLS ya autorizó.
    """

    id: str
    fragmento: str
    hablante: str
    segundo_inicio: int
    segundo_fin: int
    id_tema: str
    tipo_de_unidad: str
    estado_de_validacion: str
    id_conferencia: str
    titulo_de_conferencia: str
    evento: str


class PasoDeRazonamientoExpuesto(BaseModel):
    descripcion: str
    descartadas: list[dict[str, str]]
    total_descartadas: int


class RespuestaDelChat(BaseModel):
    id_conversacion: str
    id_mensaje: str
    contenido: str
    ids_fichas_citadas: list[str]
    fichas: list[FichaCitada]
    pasos_de_razonamiento: list[PasoDeRazonamientoExpuesto]


@router.post("/preguntar", response_model=RespuestaDelChat)
def preguntar(cuerpo: PreguntaDelUsuario, usuario: Usuario) -> RespuestaDelChat:
    proponer, sintetizar = agente_para(usuario, cliente_de_openai(usuario))

    resultado = responder(
        cuerpo.pregunta,
        cuerpo.id_conversacion,
        repositorio_del_agente(usuario),
        proponer,
        sintetizar,
    )

    return RespuestaDelChat(
        id_conversacion=resultado.id_conversacion,
        id_mensaje=resultado.id_mensaje,
        contenido=resultado.contenido,
        ids_fichas_citadas=list(resultado.ids_fichas_citadas),
        fichas=[
            FichaCitada(
                id=ficha.id,
                fragmento=ficha.fragmento,
                hablante=ficha.hablante,
                segundo_inicio=ficha.segundo_inicio,
                segundo_fin=ficha.segundo_fin,
                id_tema=ficha.id_tema,
                tipo_de_unidad=ficha.tipo_de_unidad,
                estado_de_validacion=ficha.estado_de_validacion,
                id_conferencia=ficha.conferencia.id,
                titulo_de_conferencia=ficha.conferencia.titulo,
                evento=ficha.conferencia.evento,
            )
            for ficha in resultado.fichas
        ],
        pasos_de_razonamiento=[
            PasoDeRazonamientoExpuesto(
                descripcion=paso.descripcion,
                descartadas=[dict(descartada) for descartada in paso.descartadas],
                total_descartadas=paso.total_descartadas,
            )
            for paso in resultado.pasos_de_razonamiento
        ],
    )
