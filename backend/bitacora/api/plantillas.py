"""
Endpoint de plantillas: proponer qué debe escribir la IA en cada campo.

Responde en línea: es una sola llamada al modelo sobre los nombres y el
contexto de los campos —texto corto, sin audio ni transcripción de por medio—,
así que no justifica el 202 con seguimiento del análisis de una conferencia.

El `.docx` no viaja: el frontend ya reconoció los campos al subirlo y guarda
el texto que rodea a cada uno, que es lo único que hace falta.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from bitacora.api.dependencias import Usuario, cliente_de_openai, proponente_para
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.plantillas.instrucciones import CampoPorConfigurar

router = APIRouter(prefix="/plantillas", tags=["plantillas"])

"""
Tope de campos por petición. Una plantilla de más de cien campos no existe en
la práctica, y sin límite una petición inventada mandaría un texto enorme al
modelo con la clave de quien la pide.
"""
MAXIMO_DE_CAMPOS = 100


class CampoPedido(BaseModel):
    id: str = Field(min_length=1)
    nombre: str = Field(default="", max_length=200)
    contexto: str = Field(default="", max_length=2000)


class PedidoDeInstrucciones(BaseModel):
    nombre: str = Field(default="", max_length=200)
    campos: list[CampoPedido] = Field(max_length=MAXIMO_DE_CAMPOS)


class CampoPropuesto(BaseModel):
    id: str
    instruccion: str
    formato: str
    modo: str
    extension: str


class RespuestaDeInstrucciones(BaseModel):
    """Solo los campos para los que hubo propuesta; los demás se quedan como estaban."""

    campos: list[CampoPropuesto]


@router.post("/instrucciones", response_model=RespuestaDeInstrucciones)
def proponer_instrucciones(cuerpo: PedidoDeInstrucciones, usuario: Usuario) -> RespuestaDeInstrucciones:
    if not cuerpo.campos:
        raise ErrorDeBitacora("PLANT_SIN_CAMPOS")

    proponer = proponente_para(usuario, cliente_de_openai(usuario, "fichas"))

    propuestas = proponer(
        cuerpo.nombre.strip(),
        [
            CampoPorConfigurar(id=campo.id, nombre=campo.nombre.strip(), contexto=campo.contexto.strip())
            for campo in cuerpo.campos
        ],
    )

    return RespuestaDeInstrucciones(
        campos=[
            CampoPropuesto(
                id=propuesta.id,
                instruccion=propuesta.instruccion,
                formato=propuesta.formato,
                modo=propuesta.modo,
                extension=propuesta.extension,
            )
            for propuesta in propuestas
        ]
    )
