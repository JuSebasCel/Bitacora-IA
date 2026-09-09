"""
Pruebas del catálogo de errores.

Lo que se comprueba no es que un diccionario tenga claves, sino las tres
promesas que el catálogo hace al resto del sistema: que ningún código quede
sin mensaje accionable, que ningún mensaje filtre detalle técnico, y que los
códigos que el frontend ya sabe traducir estén escritos exactamente igual en
los dos lados — porque si difieren, la interfaz cae a su mensaje genérico sin
que nadie se entere.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import get_args

import pytest

from bitacora.compartido.errores import (
    CODIGOS_DE_ERROR,
    MENSAJE_GENERICO,
    CodigoError,
    ErrorDeBitacora,
    estado_http_de_error,
    mensaje_de_error,
)

ERRORES_DEL_FRONTEND = (
    Path(__file__).resolve().parent.parent.parent
    / "frontend"
    / "src"
    / "shared"
    / "errors"
    / "index.ts"
)


def test_todo_codigo_declarado_en_el_tipo_tiene_mensaje() -> None:
    assert set(get_args(CodigoError)) == set(CODIGOS_DE_ERROR)


@pytest.mark.parametrize("codigo", CODIGOS_DE_ERROR)
def test_cada_mensaje_es_accionable_y_no_tecnico(codigo: str) -> None:
    mensaje = mensaje_de_error(codigo)

    assert mensaje != MENSAJE_GENERICO or codigo == "IA_FALLO_INESPERADO"
    assert mensaje.endswith((".", "!")), "un mensaje de interfaz es una frase, no un fragmento"
    assert mensaje[0].isupper()

    """
    Vocabulario que delata que el mensaje está contando la implementación en
    vez del problema. «PostgREST», «RLS» y «SQLSTATE» no significan nada para
    quien usa la aplicación, y «JWT» o «bearer» describen un mecanismo, no algo
    que la persona pueda hacer.

    «OpenAI» sí está permitido y por eso no aparece aquí: la persona configura
    su propia API key de OpenAI en la aplicación, así que nombrarlo es lo que
    convierte «no pudimos analizar» en «revisa tu clave», que es accionable.
    """
    prohibidas = (
        "postgrest", "sqlstate", "rls", "jwt", "traceback", "exception",
        "null", "500", "http", "bearer", "supabase", "vault",
    )
    for palabra in prohibidas:
        assert palabra not in mensaje.lower(), f"{codigo} filtra «{palabra}»"


def test_un_codigo_desconocido_cae_al_generico_sin_filtrar_nada() -> None:
    assert mensaje_de_error("PGRST301") == MENSAJE_GENERICO
    assert mensaje_de_error("") == MENSAJE_GENERICO


def test_el_detalle_tecnico_nunca_entra_en_la_respuesta() -> None:
    error = ErrorDeBitacora("IA_API_KEY_RECHAZADA", "sk-proj-abc123 rechazada por OpenAI")

    respuesta = error.como_respuesta()

    assert set(respuesta) == {"codigo", "mensaje"}
    assert "sk-proj" not in repr(respuesta)
    assert "sk-proj" not in repr(error)


def test_los_estados_http_distinguen_lo_que_la_interfaz_puede_actuar() -> None:
    assert estado_http_de_error("AUTH_TOKEN_AUSENTE") == 401
    assert estado_http_de_error("CONF_NO_ENCONTRADA") == 404
    assert estado_http_de_error("DATOS_SIN_PERMISO") == 403
    assert estado_http_de_error("IA_LIMITE_DE_USO") == 429
    """Un código sin estado declarado es un fallo del servidor, no de la petición."""
    assert estado_http_de_error("IA_FALLO_INESPERADO") == 500
    assert estado_http_de_error("CODIGO_QUE_NO_EXISTE") == 500


def test_los_codigos_compartidos_estan_escritos_igual_en_el_frontend() -> None:
    """
    El backend manda el código además del mensaje justamente para que la
    interfaz pueda usar su propia redacción. Una `Z` de más en un código
    rompe esa traducción en silencio: se sigue viendo un mensaje, solo que el
    genérico.
    """
    if not ERRORES_DEL_FRONTEND.exists():
        pytest.skip("el frontend no está en este árbol")

    fuente = ERRORES_DEL_FRONTEND.read_text(encoding="utf-8")
    del_frontend = set(re.findall(r"^\s{2}([A-Z][A-Z0-9_]+):", fuente, re.MULTILINE))

    compartidos = {
        codigo
        for codigo in CODIGOS_DE_ERROR
        if codigo.startswith(("DATOS_", "CONF_", "CHAT_", "CONFIG_"))
    }

    assert compartidos <= del_frontend, (
        "estos códigos del backend no existen en el catálogo del frontend: "
        f"{sorted(compartidos - del_frontend)}"
    )
