"""
Proponer, de una vez, qué debe escribir la IA en cada campo de una plantilla.

Configurar una plantilla de quince campos era escribir quince instrucciones a
mano, y ahí es donde se abandonaba: los campos sin instrucción caen en manos
del nombre del marcador, que casi nunca basta ("Contexto", "Detalle"). El
documento ya dice casi todo lo que hace falta —cómo se llama el campo, qué
hay escrito a su alrededor, si después va una lista o un párrafo—, así que la
propuesta se saca de ahí en una sola llamada.

Lo que se propone es EDITABLE y nunca pisa lo ya escrito: quien configuró un
campo a mano tenía una razón, y esto es un punto de partida, no una
corrección.

Vive aparte del endpoint porque es la misma capacidad que va a necesitar el
chat cuando exista ("configúrame esta plantilla"): entonces será una
herramienta más del agente, no una segunda implementación.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol, Sequence

from bitacora.compartido.ia import (
    ClienteDeOpenAI,
    TEMPERATURA_DETERMINISTA,
    contenido_del_mensaje,
    leer_json_del_modelo,
    lista_bajo,
    traducir_fallo,
)

FORMATOS = ("parrafo", "lista_vinetas", "lista_numerada")
MODOS = ("redactar", "cita")
EXTENSIONES = ("breve", "media", "extensa")


@dataclass(frozen=True)
class CampoPorConfigurar:
    id: str
    """El nombre tal como se escribió en Word, sin los corchetes: "Resumen de la tesis"."""
    nombre: str
    """El texto del documento alrededor del campo: el rótulo que lo precede y lo que sigue."""
    contexto: str = ""


@dataclass(frozen=True)
class ConfiguracionPropuesta:
    id: str
    instruccion: str
    formato: str
    modo: str
    extension: str


INSTRUCCION = """\
Configuras una plantilla de Word con la que se generan memorias de \
conferencias. Cada campo del documento es un hueco que otra IA rellenará \
después leyendo las fichas de una charla: las ideas citables que dejó.

Recibes los campos con su `nombre` y el `contexto` (lo que está escrito a su \
alrededor en el documento). Para cada uno devuelves cómo debe rellenarse.

Reglas:

1. `instruccion` es una orden en español para quien redacta, de una o dos \
frases, concreta y sobre el contenido de la charla: "Resume la tesis \
principal que defendió el ponente y el argumento con que la sostuvo". No \
escribas el contenido, escribe qué contenido va ahí.
2. Guíate por el nombre y por el contexto. Un campo "Cifras" después de un \
rótulo "Datos de impacto:" pide cifras dichas en la charla; uno llamado \
"Cita" pide una cita.
3. `modo` es `cita` SOLO si el campo pide las palabras exactas de alguien \
(nombres como "Cita", "Frase destacada", "Textual"). En cualquier otro caso, \
`redactar`.
4. `formato` es `lista_vinetas` o `lista_numerada` si el contexto sugiere una \
enumeración (el campo va después de dos puntos y una lista, o el nombre está \
en plural y pide varios elementos). Si no, `parrafo`.
5. `extension`: `breve` para un dato o una frase (fecha, lugar, título, \
cita), `media` para un párrafo, `extensa` solo cuando el campo es el cuerpo \
principal del documento (un resumen general, unas conclusiones amplias).
6. Devuelve una entrada por cada campo que recibiste, con su `id` exacto.

Devuelves un objeto JSON con una única clave `campos`, cuyo valor es una \
lista de objetos \
{"id": "...", "instruccion": "...", "formato": "...", "modo": "...", \
"extension": "..."}."""


class Proponente(Protocol):
    def __call__(
        self, nombre_de_plantilla: str, campos: Sequence[CampoPorConfigurar]
    ) -> tuple[ConfiguracionPropuesta, ...]: ...


def _uno_de(valor: Any, admitidos: tuple[str, ...], por_defecto: str) -> str:
    """Lo que el modelo invente fuera del catálogo cae al valor por defecto, no rompe."""
    return valor if isinstance(valor, str) and valor in admitidos else por_defecto


def proponente_de(cliente: ClienteDeOpenAI, modelo: str) -> Proponente:
    def proponer(
        nombre_de_plantilla: str, campos: Sequence[CampoPorConfigurar]
    ) -> tuple[ConfiguracionPropuesta, ...]:
        entrada = {
            "plantilla": nombre_de_plantilla,
            "campos": [
                {"id": campo.id, "nombre": campo.nombre, "contexto": campo.contexto}
                for campo in campos
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

        crudas = lista_bajo(leer_json_del_modelo(contenido_del_mensaje(respuesta)), "campos")

        """
        Emparejado por `id`, igual que la condensación y la redacción: si el
        modelo reordena o se salta uno, hacerlo por posición le pondría a un
        campo la instrucción de otro, y eso no se nota hasta generar la
        memoria. Un campo que no vuelva se queda sin propuesta.
        """
        por_id: dict[str, dict[str, Any]] = {}

        for cruda in crudas:
            if isinstance(cruda, dict) and isinstance(cruda.get("id"), str):
                por_id[cruda["id"]] = cruda

        propuestas: list[ConfiguracionPropuesta] = []

        for campo in campos:
            cruda = por_id.get(campo.id)
            if cruda is None:
                continue

            instruccion = cruda.get("instruccion")
            if not isinstance(instruccion, str) or instruccion.strip() == "":
                continue

            propuestas.append(
                ConfiguracionPropuesta(
                    id=campo.id,
                    instruccion=instruccion.strip(),
                    formato=_uno_de(cruda.get("formato"), FORMATOS, "parrafo"),
                    modo=_uno_de(cruda.get("modo"), MODOS, "redactar"),
                    extension=_uno_de(cruda.get("extension"), EXTENSIONES, "media"),
                )
            )

        return tuple(propuestas)

    return proponer
