"""
Redactar los huecos de una plantilla a partir de las fichas de una conferencia.

Cada hueco es un `[[marcador]]` que alguien escribió en Word, con una
instrucción de qué debe ir ahí ("resume en dos párrafos la tesis del
ponente"). El modelo escribe cada uno usando solo lo que la charla dejó en sus
fichas. El formato visual —fuente, tamaño, color— no es asunto suyo: lo hereda
el texto del marcador en el documento.

Va en una sola llamada con todos los huecos, no una por hueco. Una memoria
tiene entre tres y quince, y las fichas son el mismo material para todos:
mandarlas quince veces sería pagar quince veces el mismo contexto.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Literal, Protocol, Sequence

from bitacora.compartido.ia import (
    TEMPERATURA_DETERMINISTA,
    ClienteDeOpenAI,
    contenido_del_mensaje,
    leer_json_del_modelo,
    lista_bajo,
    traducir_fallo,
)

Formato = Literal["parrafo", "lista_vinetas", "lista_numerada"]


@dataclass(frozen=True)
class Hueco:
    id: str
    """Lo que está entre los corchetes: `Resumen de la tesis`."""
    nombre: str
    """Vacía si quien diseñó la plantilla no escribió ninguna: entonces manda el nombre."""
    instruccion: str
    formato: Formato


@dataclass(frozen=True)
class DatosDeLaCharla:
    titulo: str
    ponente: str
    evento: str
    fecha: str
    resumen: str


@dataclass(frozen=True)
class FichaParaRedactar:
    tipo: str
    """El condensado si lo hay; si no, la literal. Es lo que se lee, no lo que se cita."""
    texto: str


INSTRUCCION = """\
Escribes el contenido de una memoria institucional sobre una charla. La \
memoria es una plantilla de Word con huecos; cada hueco trae un `id`, un \
`nombre` y a veces una `instruccion` de quien diseñó la plantilla.

Recibes los datos de la charla y sus fichas: las ideas que dejó, ya \
extraídas de la transcripción.

Reglas:

1. Escribe SOLO con lo que está en los datos y las fichas. No añadas \
contexto, cifras ni afirmaciones que no estén ahí, aunque las sepas. Una \
memoria que dice algo que el ponente no dijo es peor que una memoria corta.
2. Si un hueco pide algo que el material no contiene —una tesis que la charla \
no planteó, cifras que no dio—, devuelve `null` en su `texto`. No lo \
rellenes con generalidades para que no quede vacío.
3. Si el hueco trae `instruccion`, obedécela. Si no, guíate por su `nombre`: \
"Ponente" es el nombre del ponente, "Resumen de la tesis" es un resumen de la \
tesis.
4. Respeta el `formato`: `parrafo` es prosa corrida; `lista_vinetas` y \
`lista_numerada` son elementos cortos, uno por línea, sin viñetas ni números \
delante —el documento los pone—.
5. Escribe en español, en tercera persona y en tono formal. No repitas el \
nombre del hueco como título: el título ya está en la plantilla.

Devuelves un objeto JSON con una única clave `secciones`, cuyo valor es una \
lista de objetos `{"id": ..., "texto": ...}` con una entrada por cada hueco \
que recibiste."""


class Redactor(Protocol):
    def __call__(
        self,
        charla: DatosDeLaCharla,
        fichas: Sequence[FichaParaRedactar],
        huecos: Sequence[Hueco],
    ) -> dict[str, str | None]: ...


def _limpio(texto: Any) -> str | None:
    """`None`, vacío o solo espacios cuentan como "no hay material"."""
    if not isinstance(texto, str):
        return None

    limpio = texto.strip()
    return limpio or None


def redactor_de(cliente: ClienteDeOpenAI, modelo: str) -> Redactor:
    def redactar(
        charla: DatosDeLaCharla,
        fichas: Sequence[FichaParaRedactar],
        huecos: Sequence[Hueco],
    ) -> dict[str, str | None]:
        entrada = {
            "charla": {
                "titulo": charla.titulo,
                "ponente": charla.ponente,
                "evento": charla.evento,
                "fecha": charla.fecha,
                "resumen": charla.resumen,
            },
            "fichas": [{"tipo": ficha.tipo, "texto": ficha.texto} for ficha in fichas],
            "huecos": [
                {
                    "id": hueco.id,
                    "nombre": hueco.nombre,
                    "instruccion": hueco.instruccion,
                    "formato": hueco.formato,
                }
                for hueco in huecos
            ],
        }

        try:
            respuesta: Any = cliente.chat.completions.create(
                model=modelo,
                temperature=TEMPERATURA_DETERMINISTA,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": INSTRUCCION},
                    {"role": "user", "content": json.dumps(entrada, ensure_ascii=False)},
                ],
            )
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo(fallo) from fallo

        crudas = lista_bajo(leer_json_del_modelo(contenido_del_mensaje(respuesta)), "secciones")

        """
        Se empareja por el `id` que devuelve el modelo y no por posición, igual
        que en la condensación: si reordena o se salta uno, emparejar por orden
        pondría el resumen de la tesis en el hueco de la fecha. Un hueco que el
        modelo no devolvió cuenta como sin material, no como error: el resto de
        la memoria sigue valiendo.
        """
        por_id: dict[str, str | None] = {}

        for cruda in crudas:
            if isinstance(cruda, dict) and isinstance(cruda.get("id"), str):
                por_id[cruda["id"]] = _limpio(cruda.get("texto"))

        return {hueco.id: por_id.get(hueco.id) for hueco in huecos}

    return redactar
