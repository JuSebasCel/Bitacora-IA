"""
El recorrido de una pregunta: filtros -> fichas reales -> respuesta citada.

El orden importa y no es negociable. La recuperación contra Supabase ocurre
ENTRE las dos llamadas al modelo, de modo que la síntesis solo puede hablar de
lo que existe y esta persona puede ver. Adelantar la respuesta o hacerla en
una sola llamada dejaría al modelo contestando de memoria, y la promesa del
producto —"sintetiza únicamente sobre entradas reales, siempre citando de
vuelta a la fuente exacta"— dejaría de ser verificable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from bitacora.agente.filtros import (
    FiltrosDeConsulta,
    aplicar_alcance,
    filtros_desde_propuesta,
)
from bitacora.agente.modelo import ProponeFiltros, Sintetiza
from bitacora.agente.recuperacion import (
    FichaRecuperada,
    PasoDeRazonamiento,
    recuperar,
)
from bitacora.agente.repositorio import RepositorioDelAgente
from bitacora.agente.sintesis import RespuestaVerificada, fichas_para_indicacion, verificar
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.conferencias.tipos import Tema

"""
Cuántos caracteres de la primera pregunta se usan como título al crear una
conversación. Es el mismo criterio que usa la interfaz al listarlas: el título
sirve para reconocer la conversación en la lista, no para describirla, así que
un recorte de la pregunta dice más que un "Conversación 3" y no cuesta una
llamada al modelo.
"""
LARGO_DEL_TITULO = 60


def titulo_desde(pregunta: str) -> str:
    limpia = " ".join(pregunta.split())

    if len(limpia) <= LARGO_DEL_TITULO:
        return limpia

    return f"{limpia[:LARGO_DEL_TITULO].rstrip()}…"


@dataclass(frozen=True)
class RespuestaDelAgente:
    id_conversacion: str
    id_mensaje: str
    contenido: str
    ids_fichas_citadas: tuple[str, ...]
    pasos_de_razonamiento: tuple[PasoDeRazonamiento, ...]
    fichas: tuple[FichaRecuperada, ...]
    filtros: FiltrosDeConsulta


def responder(
    pregunta: str,
    id_conversacion: str | None,
    repositorio: RepositorioDelAgente,
    proponer_filtros: ProponeFiltros,
    sintetizar: Sintetiza,
) -> RespuestaDelAgente:
    if pregunta.strip() == "":
        raise ErrorDeBitacora("CHAT_MENSAJE_VACIO")

    id_conversacion_real, alcance = repositorio.asegurar_conversacion(
        id_conversacion, titulo_desde(pregunta)
    )
    """
    El mensaje de la persona se guarda ANTES de llamar al modelo. Si OpenAI
    falla o la clave está vencida, la conversación conserva lo que escribió en
    vez de perderlo: reintentar es volver a preguntar, no volver a redactar.
    """
    repositorio.guardar_mensaje_de_usuario(id_conversacion_real, pregunta.strip())

    temas = repositorio.listar_temas()
    eventos = repositorio.listar_eventos_visibles()

    filtros = aplicar_alcance(
        filtros_desde_propuesta(
            proponer_filtros(pregunta, temas, eventos), pregunta, temas, eventos
        ),
        alcance,
    )

    candidatas = repositorio.buscar_fichas(filtros)
    fichas, pasos = recuperar(candidatas, filtros, temas)

    verificada = _sintetizar_verificando(pregunta, fichas, temas, sintetizar)

    id_mensaje = repositorio.guardar_respuesta(
        id_conversacion_real,
        verificada.contenido,
        verificada.ids_fichas_citadas,
        pasos,
    )

    return RespuestaDelAgente(
        id_conversacion=id_conversacion_real,
        id_mensaje=id_mensaje,
        contenido=verificada.contenido,
        ids_fichas_citadas=verificada.ids_fichas_citadas,
        pasos_de_razonamiento=pasos,
        fichas=tuple(
            ficha for ficha in fichas if ficha.id in set(verificada.ids_fichas_citadas)
        ),
        filtros=filtros,
    )


def _sintetizar_verificando(
    pregunta: str,
    fichas: Sequence[FichaRecuperada],
    temas: Sequence[Tema],
    sintetizar: Sintetiza,
) -> RespuestaVerificada:
    """
    Sin fichas recuperadas no se llama al modelo: no hay nada sobre lo que
    sintetizar, y llamarlo solo le daría la ocasión de contestar de memoria.
    """
    if not fichas:
        return verificar(None, fichas)

    nombres = {tema.id: tema.nombre for tema in temas}

    return verificar(sintetizar(pregunta, fichas_para_indicacion(fichas, nombres)), fichas)
