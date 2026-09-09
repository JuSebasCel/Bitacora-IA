"""
La llamada al modelo para el análisis de discurso.

Deliberadamente delgada: recibe el tramo ya renderizado, devuelve la lista
cruda de propuestas y no interpreta nada. Todo lo que hay que decidir sobre
esas propuestas (si el tipo existe, si el tema está en el pool, si la
coordenada cae dentro del tramo) pasa por `clasificacion.py`, que es puro y
está probado. Mezclar las dos cosas dejaría la validación detrás de una
llamada de red, es decir, sin pruebas.
"""

from __future__ import annotations

from typing import Any, Protocol, Sequence

from bitacora.analisis.indicaciones import INSTRUCCION_DEL_SISTEMA, indicacion_de_analisis
from bitacora.compartido.ia import (
    TEMPERATURA_DETERMINISTA,
    ClienteDeOpenAI,
    contenido_del_mensaje,
    leer_json_del_modelo,
    lista_bajo,
    traducir_fallo,
)
from bitacora.conferencias.tipos import Tema


class AnalizadorDeDiscurso(Protocol):
    def __call__(
        self,
        titulo: str,
        ponente: str,
        evento: str,
        temas: Sequence[Tema],
        tramo: str,
    ) -> list[Any]: ...




def analizador_de(cliente: ClienteDeOpenAI, modelo: str) -> AnalizadorDeDiscurso:
    def analizar(
        titulo: str,
        ponente: str,
        evento: str,
        temas: Sequence[Tema],
        tramo: str,
    ) -> list[Any]:
        try:
            respuesta: Any = cliente.chat.completions.create(
                model=modelo,
                temperature=TEMPERATURA_DETERMINISTA,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": INSTRUCCION_DEL_SISTEMA},
                    {
                        "role": "user",
                        "content": indicacion_de_analisis(titulo, ponente, evento, temas, tramo),
                    },
                ],
            )
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo(fallo) from fallo

        return lista_bajo(leer_json_del_modelo(contenido_del_mensaje(respuesta)), "fichas")

    return analizar

