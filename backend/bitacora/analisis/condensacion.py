"""
Condensar fichas: la misma idea sin las repeticiones del habla.

El análisis tiene prohibido tocar el `fragmento` —la promesa del producto es
que la cita es literal— así que ante una frase como "la resolución es la
resolución que viene por derecho de norma, esa es la resolución que se menciona
aquí" solo podía recortarla o descartarla. Está bien transcrita y no dice nada:
es habla real, con sus vueltas.

Esto corre DESPUÉS del recorte por relevancia, no antes: condensar ciento
treinta y cinco fichas para quedarse con cuarenta es pagar noventa y cinco
condensaciones a la basura.

Y va en lotes, una llamada por tanda de fichas y no una por ficha: cuarenta
viajes al modelo para cuarenta frases cortas cuesta muchísimo más en tiempo y
en tokens de sistema que una sola llamada con las cuarenta dentro.
"""

from __future__ import annotations

import logging
from typing import Any, Protocol, Sequence

from bitacora.compartido.ia import (
    ClienteDeOpenAI,
    TEMPERATURA_DETERMINISTA,
    contenido_del_mensaje,
    leer_json_del_modelo,
    lista_bajo,
    traducir_fallo,
)
from bitacora.conferencias.tipos import Ficha

INSTRUCCION = """\
Recibes unidades de discurso transcritas de una charla. Cada una trae un `id` y \
un `texto` tal como se dijo.

Devuelves, para cada una, la MISMA idea escrita de forma que se entienda leída. \
No resumes ni interpretas: quitas las repeticiones, las muletillas y las vueltas \
del habla, y dejas lo que la persona quiso decir.

Reglas:

1. No añadas nada que no esté. Si dice "la resolución es la resolución que viene \
por derecho de norma", la idea es que la resolución viene por norma: eso \
escribes, no lo que crees que quiso decir además.
2. Conserva las cifras, los nombres y los matices exactos. "Casi el 40%" no es \
"alrededor del 40%", y "creemos que" no es "es".
3. Si el texto ya se entiende bien leído, devuélvelo igual. No hay premio por \
cambiar algo que no lo necesitaba.
4. Una o dos frases. Si hacen falta más, es que estás explicando en vez de \
condensar.
5. Escribe en tercera persona o impersonal solo si el original lo estaba; si \
quien habla dice "nosotros medimos", conserva ese "nosotros".

Devuelves un objeto JSON con una única clave `fichas`, cuyo valor es una lista \
de objetos `{"id": ..., "condensado": ...}` con una entrada por cada unidad que \
recibiste."""

"""
Cuántas fichas van en cada llamada.

Ni una por llamada —serían cuarenta viajes— ni todas juntas, porque un lote
enorme diluye la atención del modelo sobre cada frase y empieza a devolver
condensados genéricos. Veinte es suficiente para amortizar la instrucción y
pequeño para que cada texto siga recibiendo atención.
"""
FICHAS_POR_LOTE = 20

registro = logging.getLogger("bitacora.condensacion")


class Condensador(Protocol):
    def __call__(self, textos: Sequence[str]) -> tuple[str, ...]: ...


def condensador_de(cliente: ClienteDeOpenAI, modelo: str) -> Condensador:
    def condensar(textos: Sequence[str]) -> tuple[str, ...]:
        if not textos:
            return ()

        entrada = [{"id": indice, "texto": texto} for indice, texto in enumerate(textos)]

        try:
            respuesta: Any = cliente.chat.completions.create(
                model=modelo,
                temperature=TEMPERATURA_DETERMINISTA,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": INSTRUCCION},
                    {"role": "user", "content": str(entrada)},
                ],
            )
        except Exception as fallo:  # noqa: BLE001
            raise traducir_fallo(fallo) from fallo

        crudas = lista_bajo(leer_json_del_modelo(contenido_del_mensaje(respuesta)), "fichas")

        """
        Se indexa por el `id` devuelto en vez de confiar en el orden: si el
        modelo reordena o se salta una, emparejar por posición le pondria a una
        ficha el condensado de otra, que es un error silencioso y grave -- la
        cita seguiria siendo correcta y el texto leible diria otra cosa.
        """
        por_id: dict[int, str] = {}

        for cruda in crudas:
            if not isinstance(cruda, dict):
                continue

            try:
                indice = int(cruda.get("id"))  # type: ignore[arg-type]
            except (TypeError, ValueError):
                continue

            texto = str(cruda.get("condensado") or "").strip()

            if texto:
                por_id[indice] = texto

        return tuple(por_id.get(indice, "") for indice in range(len(textos)))

    return condensar


def condensar_fichas(fichas: Sequence[Ficha], condensar: Condensador) -> tuple[Ficha, ...]:
    """
    Devuelve las mismas fichas con su `condensado` puesto.

    Un fallo aquí no puede tumbar el análisis: las fichas ya están bien y la
    condensación es una comodidad de lectura. Si el modelo falla, se quedan sin
    condensar y la interfaz enseña la literal, que es lo que hacía antes.
    """
    from dataclasses import replace

    resultado: list[Ficha] = []

    for inicio in range(0, len(fichas), FICHAS_POR_LOTE):
        lote = fichas[inicio : inicio + FICHAS_POR_LOTE]

        try:
            condensados = condensar([ficha.fragmento for ficha in lote])
        except Exception as fallo:  # noqa: BLE001
            """
            Se registra el tipo, no el detalle: un `str(excepcion)` de OpenAI
            puede llevar el prefijo de la clave de la persona, y el log del
            servidor no es un lugar privado.

            Callarlo del todo era peor que el propio fallo. Una ficha sin
            condensar y una que no lo necesitaba se ven exactamente igual en
            la interfaz, asi que sin esta linea no habia forma de distinguir
            "el modelo fallo" de "no hizo falta" ni de "este backend todavia
            no condensa".
            """
            registro.warning(
                "condensacion fallida lote=%d-%d tipo=%s",
                inicio,
                inicio + len(lote),
                type(fallo).__name__,
            )
            resultado.extend(lote)
            continue

        for ficha, condensado in zip(lote, condensados):
            """
            Solo se guarda si de verdad cambia algo. Un condensado identico al
            original ocupa sitio y obliga a la interfaz a decidir entre dos
            textos iguales.
            """
            distinto = condensado != "" and condensado.strip() != ficha.fragmento.strip()
            resultado.append(replace(ficha, condensado=condensado) if distinto else ficha)

    return tuple(resultado)
