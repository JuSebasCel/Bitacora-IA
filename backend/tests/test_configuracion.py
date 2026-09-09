"""Pruebas de la lectura de configuración: el fallo rápido y los valores por defecto."""

from __future__ import annotations

import pytest

from bitacora.compartido.configuracion import (
    MODELO_DE_ANALISIS_POR_DEFECTO,
    MODELO_DE_TRANSCRIPCION_POR_DEFECTO,
    leer_configuracion,
)

MINIMO = {"SUPABASE_URL": "https://p.supabase.co", "SUPABASE_ANON_KEY": "anon"}


@pytest.mark.parametrize("faltante", sorted(MINIMO))
def test_falta_una_variable_obligatoria_y_el_mensaje_dice_cual(faltante: str) -> None:
    entorno = {clave: valor for clave, valor in MINIMO.items() if clave != faltante}

    with pytest.raises(RuntimeError) as fallo:
        leer_configuracion(entorno)

    """
    El mensaje tiene que nombrar la variable Y dónde completarla: un
    "configuración inválida" obliga a leer el código para saber qué falta,
    que es exactamente lo que el fallo rápido quiere evitar.
    """
    assert faltante in str(fallo.value)
    assert "backend/.env.example" in str(fallo.value)


def test_una_variable_en_blanco_cuenta_como_ausente() -> None:
    """Un `SUPABASE_URL=` olvidado en el .env es más común que la variable ausente."""
    with pytest.raises(RuntimeError):
        leer_configuracion({**MINIMO, "SUPABASE_URL": "   "})


def test_los_modelos_tienen_valor_por_defecto_y_se_pueden_sobreescribir() -> None:
    por_defecto = leer_configuracion(MINIMO)

    assert por_defecto.modelo_de_transcripcion == MODELO_DE_TRANSCRIPCION_POR_DEFECTO
    assert por_defecto.modelo_de_analisis == MODELO_DE_ANALISIS_POR_DEFECTO

    ajustada = leer_configuracion({**MINIMO, "OPENAI_MODELO_ANALISIS": "gpt-5"})

    assert ajustada.modelo_de_analisis == "gpt-5"


def test_los_origenes_permitidos_se_leen_como_lista() -> None:
    configuracion = leer_configuracion(
        {**MINIMO, "BITACORA_ORIGENES_PERMITIDOS": "https://a.app, https://b.app ,"}
    )

    assert configuracion.origenes_permitidos == ("https://a.app", "https://b.app")


def test_no_existe_ninguna_variable_de_service_role_ni_de_api_key_del_servidor() -> None:
    """
    La ausencia es la característica, así que se prueba como tal.

    Si algún día alguien agrega `SUPABASE_SERVICE_ROLE_KEY` "solo para una
    consulta puntual", esta prueba falla y obliga a justificarlo en una
    revisión, en vez de que el salto de RLS entre en silencio.
    """
    from dataclasses import fields

    from bitacora.compartido.configuracion import Configuracion

    nombres = {campo.name for campo in fields(Configuracion)}

    assert not any("service" in nombre for nombre in nombres)
    assert not any(nombre.endswith("api_key") for nombre in nombres)
