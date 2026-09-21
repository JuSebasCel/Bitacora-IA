"""
Endpoints de memorias: redactar los huecos y convertir el resultado a PDF.

Son dos y no uno a propósito. Entre medias está el llenado del `.docx`, que
hace el frontend con la misma librería con la que ya reconocía los
marcadores; juntarlos obligaría a reescribir ese llenado aquí o a mandar la
plantilla de ida y vuelta.

Los dos responden en línea. Redactar es una sola llamada al modelo y convertir
tarda segundos, no minutos: no justifican el 202 con seguimiento que usa el
análisis de una conferencia.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from bitacora.api.dependencias import Usuario, cliente_de_openai, redactor_para
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.memorias.pdf import convertir_a_pdf
from bitacora.memorias.redaccion import Hueco
from bitacora.memorias.repositorio import leer_material

router = APIRouter(prefix="/memorias", tags=["memorias"])


class HuecoPedido(BaseModel):
    id: str = Field(min_length=1)
    nombre: str
    instruccion: str = ""
    formato: Literal["parrafo", "lista_vinetas", "lista_numerada"] = "parrafo"


class PedidoDeRedaccion(BaseModel):
    id_conferencia: str = Field(min_length=1)
    huecos: list[HuecoPedido]


class RespuestaDeRedaccion(BaseModel):
    """`null` en un hueco significa que la charla no dio material para él."""

    secciones: dict[str, str | None]


@router.post("/redactar", response_model=RespuestaDeRedaccion)
def redactar(cuerpo: PedidoDeRedaccion, usuario: Usuario) -> RespuestaDeRedaccion:
    """
    Se comprueba que haya huecos ANTES de leer nada o pedir la clave: una
    plantilla sin marcadores no tiene nada que redactar, y descubrirlo después
    de gastar una lectura y una llamada al modelo sería pagar por un error que
    se veía en la petición.
    """
    if not cuerpo.huecos:
        raise ErrorDeBitacora("MEM_SIN_HUECOS")

    charla, fichas = leer_material(usuario.cliente, cuerpo.id_conferencia)
    redactar_con = redactor_para(usuario, cliente_de_openai(usuario))

    secciones = redactar_con(
        charla,
        fichas,
        [
            Hueco(
                id=hueco.id,
                nombre=hueco.nombre.strip(),
                instruccion=hueco.instruccion.strip(),
                formato=hueco.formato,
            )
            for hueco in cuerpo.huecos
        ],
    )

    return RespuestaDeRedaccion(secciones=secciones)


@router.post("/pdf", response_class=Response)
async def a_pdf(peticion: Request, usuario: Usuario) -> Response:
    """
    El `.docx` llega como cuerpo crudo y no como formulario multiparte: es un
    solo archivo sin campos alrededor, y así no hace falta otra dependencia
    solo para desempaquetarlo.

    Pide sesión aunque no lea nada de la base: sin ella, esto sería un
    conversor de documentos abierto a cualquiera que encuentre la URL.
    """
    del usuario

    docx = await peticion.body()
    pdf = await run_in_threadpool(convertir_a_pdf, docx)

    return Response(content=pdf, media_type="application/pdf")
