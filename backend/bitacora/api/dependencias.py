"""
Composición: dónde se juntan la sesión del usuario, Supabase y OpenAI.

Es el único lugar del backend donde se construyen clientes reales. Todo lo
demás recibe protocolos, y por eso la suite puede recorrer los pipelines
enteros sin red: sustituir este módulo es sustituir el mundo exterior
completo.

Se construye un contexto POR PETICIÓN y nunca se cachea entre peticiones. Un
cliente de Supabase lleva dentro el token de una persona concreta, y un caché
compartido serviría a la segunda petición con la identidad de la primera —el
fallo más caro posible en un backend cuyo aislamiento vive en RLS.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header

from bitacora.agente.modelo import ProponeFiltros, Sintetiza, proponedor_de_filtros, sintetizador
from bitacora.agente.repositorio import RepositorioSupabaseDelAgente
from bitacora.analisis.modelo import AnalizadorDeDiscurso, analizador_de
from bitacora.analisis.pipeline import Transcriptor
from bitacora.compartido.configuracion import Configuracion, leer_configuracion
from bitacora.compartido.datos import (
    ClienteSupabase,
    Sesion,
    crear_cliente,
    leer_api_key_de_openai,
    verificar_sesion,
)
from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.compartido.ia import (
    ClaveDeOpenAI,
    ClienteDeOpenAI,
    crear_cliente as crear_cliente_de_openai,
)
from bitacora.conferencias.repositorio import RepositorioSupabase
from bitacora.conferencias.tipos import Segmento
from bitacora.analisis.condensacion import Condensador, condensador_de
from bitacora.memorias.redaccion import Redactor, redactor_de
from bitacora.transcripcion.openai import transcribir


@lru_cache(maxsize=1)
def configuracion() -> Configuracion:
    """
    La configuración sí se cachea: no depende de quién pregunta, y releer el
    entorno en cada petición solo repetiría la misma validación. El fallo
    rápido de `leer_configuracion` ocurre en el primer uso, que en la práctica
    es el arranque (ver `main.py`, que la pide antes de servir).
    """
    return leer_configuracion(os.environ)


PREFIJO_BEARER = "Bearer "


def token_de(autorizacion: str | None) -> str:
    if not autorizacion or not autorizacion.startswith(PREFIJO_BEARER):
        raise ErrorDeBitacora("AUTH_TOKEN_AUSENTE")

    token = autorizacion[len(PREFIJO_BEARER) :].strip()

    if token == "":
        raise ErrorDeBitacora("AUTH_TOKEN_AUSENTE")

    return token


@dataclass(frozen=True)
class ContextoDeUsuario:
    """Todo lo que una petición necesita, ya resuelto con la identidad de quien la hizo."""

    sesion: Sesion
    cliente: ClienteSupabase
    configuracion: Configuracion

    def clave_de_openai(self) -> ClaveDeOpenAI:
        """
        Se lee tarde, no al construir el contexto: los endpoints que no llaman
        a OpenAI no deberían fallar con `CONFIG_API_KEY_REQUERIDA` ni descifrar
        un secreto de Vault que no van a usar.
        """
        return leer_api_key_de_openai(self.cliente)


def contexto_de_usuario(
    authorization: Annotated[str | None, Header()] = None,
) -> ContextoDeUsuario:
    ajustes = configuracion()
    token = token_de(authorization)
    cliente = crear_cliente(ajustes, token)

    return ContextoDeUsuario(
        sesion=verificar_sesion(cliente, token),
        cliente=cliente,
        configuracion=ajustes,
    )


Usuario = Annotated[ContextoDeUsuario, Depends(contexto_de_usuario)]


def repositorio_de_conferencias(contexto: ContextoDeUsuario) -> RepositorioSupabase:
    return RepositorioSupabase(contexto.cliente)


def repositorio_del_agente(contexto: ContextoDeUsuario) -> RepositorioSupabaseDelAgente:
    return RepositorioSupabaseDelAgente(contexto.cliente, contexto.sesion.id_usuario)


def cliente_de_openai(contexto: ContextoDeUsuario) -> ClienteDeOpenAI:
    """
    Un cliente por petición, no uno por colaborador.

    Construirlo dentro de `transcriptor_de` y otra vez dentro de
    `analizador_para` costaría dos llamadas RPC a `leer_mi_api_key()` —dos
    descifrados en Vault— para el mismo endpoint y la misma clave.
    """
    return crear_cliente_de_openai(contexto.clave_de_openai())


def transcriptor_de(contexto: ContextoDeUsuario, cliente: ClienteDeOpenAI) -> Transcriptor:
    modelo = contexto.configuracion.modelo_de_transcripcion

    def transcriptor(nombre_de_archivo: str, contenido: bytes) -> tuple[Segmento, ...]:
        return transcribir(cliente, modelo, nombre_de_archivo, contenido)

    return transcriptor


def analizador_para(contexto: ContextoDeUsuario, cliente: ClienteDeOpenAI) -> AnalizadorDeDiscurso:
    return analizador_de(cliente, contexto.configuracion.modelo_de_analisis)


def condensador_para(contexto: ContextoDeUsuario, cliente: ClienteDeOpenAI) -> Condensador:
    """Usa el modelo de analisis: es la misma tarea de leer discurso, no una conversacion."""
    return condensador_de(cliente, contexto.configuracion.modelo_de_analisis)


def agente_para(
    contexto: ContextoDeUsuario, cliente: ClienteDeOpenAI
) -> tuple[ProponeFiltros, Sintetiza]:
    modelo = contexto.configuracion.modelo_de_agente

    return proponedor_de_filtros(cliente, modelo), sintetizador(cliente, modelo)


def redactor_para(contexto: ContextoDeUsuario, cliente: ClienteDeOpenAI) -> Redactor:
    """El modelo de análisis: escribir una memoria es leer discurso, no conversar."""
    return redactor_de(cliente, contexto.configuracion.modelo_de_analisis)
