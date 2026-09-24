"""
Buscar en la transcripción completa el material de cada hueco de la memoria.

Hasta ahora la memoria se escribía solo con las fichas, y las fichas son lo
CITABLE de la charla: ideas con sujeto y verbo que se sostienen fuera de
contexto. Un correo dictado al final, un teléfono, la modalidad ("esto es un
taller, no una conferencia") o el nombre de una institución no son fichas
—nadie citaría "escríbanme a tal correo"— y sin embargo son justo lo que una
plantilla pide. Por eso faltaban datos que sí estaban dichos.

**Por ventanas y no de una vez.** Una charla de hora y media son decenas de
miles de caracteres y ningún plan gratuito acepta eso en una sola petición
(ver `CARACTERES_POR_VENTANA_EN_GROQ`). Se recorre la transcripción en los
mismos tramos que usa el análisis y se pregunta, en cada uno, si aparece algo
para cada hueco.

**Se para en cuanto todo está cubierto.** Si los datos salen en los primeros
minutos —lo normal en una presentación— no se recorre el resto, y una charla
larga no cuesta más que una corta.

Lo que devuelve son EXTRACTOS, no redacción: trozos de lo que se dijo, con los
que después redacta `redaccion.py`. Separar las dos cosas es lo que permite
que el rastreo sea barato (una pasada por la transcripción, sin fichas ni
plantilla de por medio) y que la redacción siga siendo una sola llamada.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Mapping, Protocol, Sequence

from bitacora.compartido.ia import (
    ClienteDeOpenAI,
    TEMPERATURA_DETERMINISTA,
    contenido_del_mensaje,
    detalle_seguro,
    leer_json_del_modelo,
    lista_bajo,
)
from bitacora.memorias.redaccion import Hueco

registro = logging.getLogger("bitacora.memorias.rastreo")

"""
Tope de tramos que se recorren. Una charla de dos horas da unas veinticinco
ventanas con Groq; pasado ese punto, lo que no apareció casi nunca aparece, y
seguir solo alarga la espera de quien pidió la memoria.
"""
MAXIMO_DE_VENTANAS = 30

"""Cuánto se guarda por hueco. Lo suficiente para redactar con ello, no para copiar la charla entera."""
CARACTERES_POR_EXTRACTO = 600
EXTRACTOS_POR_HUECO = 3

INSTRUCCION = """\
Recibes un tramo de la transcripción de una charla y una lista de huecos de \
un documento que hay que rellenar con lo que se dijo en ella.

Tu trabajo es BUSCAR, no redactar: por cada hueco, devuelve el trozo del \
tramo que sirve para rellenarlo, copiado tal cual.

Reglas:

1. Si en este tramo no hay nada para un hueco, devuelve `null`. Es la \
respuesta normal: un tramo cualquiera solo sirve para uno o dos huecos.
2. No completes, no deduzcas y no inventes. Un correo, un teléfono o una \
cifra van tal como se dijeron. Si se dijo "arroba" o "guion", escríbelo como \
el símbolo que corresponde, pero no inventes el dominio ni los dígitos que \
falten.
3. Copia lo justo: la frase o las dos frases donde está el dato o la idea, \
no el tramo entero.
4. Devuelve una entrada por cada hueco que recibiste, con su `id` exacto.

Devuelves un objeto JSON con una única clave `hallazgos`, cuyo valor es una \
lista de objetos {"id": "...", "texto": "..." | null}."""


class Rastreador(Protocol):
    def __call__(
        self, huecos: Sequence[Hueco], tramos: Sequence[str]
    ) -> Mapping[str, tuple[str, ...]]: ...


def rastreador_de(cliente: ClienteDeOpenAI, modelo: str) -> Rastreador:
    def rastrear(huecos: Sequence[Hueco], tramos: Sequence[str]) -> Mapping[str, tuple[str, ...]]:
        hallazgos: dict[str, list[str]] = {hueco.id: [] for hueco in huecos}

        if not huecos:
            return {}

        for numero, tramo in enumerate(tramos[:MAXIMO_DE_VENTANAS], start=1):
            """
            Solo se siguen buscando los huecos que aún no tienen suficiente:
            la lista se acorta sola, y con ella el tamaño de cada petición.
            """
            pendientes = [hueco for hueco in huecos if len(hallazgos[hueco.id]) < EXTRACTOS_POR_HUECO]

            if not pendientes:
                break

            entrada = {
                "huecos": [
                    {"id": hueco.id, "nombre": hueco.nombre, "instruccion": hueco.instruccion}
                    for hueco in pendientes
                ],
                "tramo": tramo,
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
                """
                Un tramo que falla no tumba la memoria: se sigue con el
                siguiente y se redacta con lo que haya. Lo peor que pasa es
                que la memoria salga como salía antes, solo con las fichas.
                """
                registro.warning("tramo %s sin rastrear: %s", numero, detalle_seguro(fallo))
                continue

            crudos = lista_bajo(leer_json_del_modelo(contenido_del_mensaje(respuesta)), "hallazgos")

            for crudo in crudos:
                if not isinstance(crudo, dict):
                    continue

                id_del_hueco = crudo.get("id")
                texto = crudo.get("texto")

                if not isinstance(id_del_hueco, str) or id_del_hueco not in hallazgos:
                    continue

                if not isinstance(texto, str) or texto.strip() == "":
                    continue

                limpio = texto.strip()[:CARACTERES_POR_EXTRACTO]

                if limpio not in hallazgos[id_del_hueco]:
                    hallazgos[id_del_hueco].append(limpio)

        return {clave: tuple(valores) for clave, valores in hallazgos.items() if valores}

    return rastrear
