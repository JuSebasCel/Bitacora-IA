"""
Las dos llamadas al modelo del agente. Igual de delgadas que las del análisis:
piden, devuelven crudo, y no deciden nada. Quien decide es `filtros.py` (que
valida la propuesta contra el pool real) y `sintesis.py` (que valida las citas
contra las fichas recuperadas), los dos puros y probados.
"""

from __future__ import annotations

from typing import Any, Protocol, Sequence

from bitacora.agente.indicaciones import (
    INSTRUCCION_DE_FILTROS,
    INSTRUCCION_DE_SINTESIS,
    indicacion_de_filtros,
    indicacion_de_sintesis,
)
from bitacora.compartido.ia import (
    TEMPERATURA_DETERMINISTA,
    ClienteDeOpenAI,
    contenido_del_mensaje,
    leer_json_del_modelo,
    traducir_fallo,
)
from bitacora.conferencias.tipos import Tema


class ProponeFiltros(Protocol):
    def __call__(
        self, pregunta: str, temas: Sequence[Tema], eventos: Sequence[str]
    ) -> Any: ...


class Sintetiza(Protocol):
    def __call__(self, pregunta: str, fichas: str) -> Any: ...


def _pedir_json(
    cliente: ClienteDeOpenAI, modelo: str, instruccion: str, indicacion: str
) -> Any:
    try:
        respuesta: Any = cliente.chat.completions.create(
            model=modelo,
            temperature=TEMPERATURA_DETERMINISTA,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": instruccion},
                {"role": "user", "content": indicacion},
            ],
        )
    except Exception as fallo:  # noqa: BLE001
        raise traducir_fallo(fallo) from fallo

    return leer_json_del_modelo(contenido_del_mensaje(respuesta))


def proponedor_de_filtros(cliente: ClienteDeOpenAI, modelo: str) -> ProponeFiltros:
    def proponer(pregunta: str, temas: Sequence[Tema], eventos: Sequence[str]) -> Any:
        return _pedir_json(
            cliente,
            modelo,
            INSTRUCCION_DE_FILTROS,
            indicacion_de_filtros(pregunta, temas, eventos),
        )

    return proponer


def sintetizador(cliente: ClienteDeOpenAI, modelo: str) -> Sintetiza:
    def sintetizar(pregunta: str, fichas: str) -> Any:
        return _pedir_json(
            cliente,
            modelo,
            INSTRUCCION_DE_SINTESIS,
            indicacion_de_sintesis(pregunta, fichas),
        )

    return sintetizar
