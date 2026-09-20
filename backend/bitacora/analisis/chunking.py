"""
Chunking: agrupar segmentos en ventanas que quepan en una llamada al modelo.

La unidad que el producto necesita —la ficha— es atómica y corta, pero para
reconocerla hace falta contexto: una postura se defiende a lo largo de un
minuto, y un dato de impacto solo se entiende junto a la frase que lo
introduce. Por eso no se manda un segmento por llamada (perdería el hilo) ni
la charla entera de una vez (el modelo devuelve un resumen, no un catálogo, y
las coordenadas se le desdibujan cuando tiene una hora de texto delante).

Todo aquí es puro: entra una lista de segmentos, sale una lista de ventanas.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from bitacora.conferencias.tipos import Segmento

"""
Tamano de ventana en caracteres, no en tokens: contar tokens exigiria cargar
el tokenizador del modelo, que cambia con el modelo y volveria el chunking
dependiente de una variable de entorno. ~12000 caracteres son unos 3000 tokens
en espanol, muy por debajo de cualquier limite vigente, asi que la
aproximacion gruesa sobra para lo que hay que decidir aqui.

Medido sobre una charla real de 82 minutos: con 6000 salian 14 ventanas y el
analisis tardaba 422 segundos. Cada ventana reenvia la instruccion del sistema
entera (~800 tokens), asi que 14 llamadas gastaban ~11000 tokens en repetir lo
mismo -- un tercio de todo lo enviado. Al doblar la ventana son 7 llamadas: la
mitad de esa repeticion y la mitad de la latencia, sin tocar la calidad.

El limite existe para cuidar el analisis, no porque el modelo no acepte mas.
Subirlo mucho mas si tendria coste: una ventana enorme diluye la atencion del
modelo sobre cada parte y empeora el recorte, que es justo lo que se acaba de
arreglar.
"""
CARACTERES_POR_VENTANA = 12000

"""
Cuántos segmentos del final de una ventana se repiten al principio de la
siguiente. Sin solape, una unidad que arranca a 30 segundos del corte se
parte en dos y ninguna de las mitades es citable. Con solape aparece dos veces
y `deduplicar` (en `clasificacion.py`) se queda con una: preferimos el trabajo
duplicado y descartable al contenido perdido, que no se puede recuperar.
"""
SEGMENTOS_DE_SOLAPE = 3


@dataclass(frozen=True)
class Ventana:
    segmentos: tuple[Segmento, ...]

    @property
    def inicio(self) -> int:
        return min(segmento.inicio for segmento in self.segmentos)

    @property
    def fin(self) -> int:
        return max(segmento.fin for segmento in self.segmentos)

    @property
    def estimada(self) -> bool:
        """Basta un segmento estimado para que toda la ventana lo esté: el modelo no distingue cuál usó."""
        return any(segmento.estimado for segmento in self.segmentos)


def agrupar_en_ventanas(
    segmentos: Sequence[Segmento],
    caracteres_por_ventana: int = CARACTERES_POR_VENTANA,
    segmentos_de_solape: int = SEGMENTOS_DE_SOLAPE,
) -> tuple[Ventana, ...]:
    """
    Un segmento más largo que la ventana entera no se parte: se manda solo.

    Partirlo por caracteres cortaría a mitad de frase y produciría fichas con
    fragmentos truncados, que es peor que una ventana grande de más — el
    límite de caracteres existe para cuidar la calidad del análisis, no como
    una restricción dura del modelo.
    """
    if not segmentos:
        return ()

    ventanas: list[Ventana] = []
    actual: list[Segmento] = []
    caracteres = 0

    for segmento in segmentos:
        if actual and caracteres + len(segmento.texto) > caracteres_por_ventana:
            ventanas.append(Ventana(segmentos=tuple(actual)))
            actual = list(actual[-segmentos_de_solape:]) if segmentos_de_solape > 0 else []
            caracteres = sum(len(anterior.texto) for anterior in actual)

        actual.append(segmento)
        caracteres += len(segmento.texto)

    if actual:
        """
        La última ventana puede ser puro solape si el corte cayó justo al final:
        no aporta nada que la anterior no tenga y solo cuesta una llamada.
        """
        ya_cubierta = bool(ventanas) and set(actual).issubset(set(ventanas[-1].segmentos))
        if not ya_cubierta:
            ventanas.append(Ventana(segmentos=tuple(actual)))

    return tuple(ventanas)


def renderizar_ventana(ventana: Ventana) -> str:
    """
    El texto que ve el modelo, con la coordenada delante de cada línea.

    El formato `[inicio-fin]` al principio de cada línea es lo que permite
    pedirle al modelo que devuelva segundos y no que los adivine: los tiene
    escritos delante y solo tiene que copiar los de las líneas que usó. La
    alternativa —mandar el texto corrido y luego buscar el fragmento devuelto
    dentro de la transcripción— falla en cuanto el modelo normaliza una
    muletilla o corrige una concordancia al citar, que es casi siempre.
    """
    lineas = []

    for segmento in ventana.segmentos:
        prefijo = f"[{segmento.inicio}-{segmento.fin}]"
        if segmento.hablante:
            lineas.append(f"{prefijo} {segmento.hablante}: {segmento.texto}")
        else:
            lineas.append(f"{prefijo} {segmento.texto}")

    return "\n".join(lineas)


def contexto_de(ventana: Ventana, inicio: int, fin: int, segundos_alrededor: int = 20) -> str:
    """
    El `contexto_minimo` de una ficha: lo que se dijo justo antes y después.

    Existe para que validar una ficha no obligue a reescuchar la charla
    (`frontend/.../tipos.ts`: "segundos antes y después, para revisar sin
    reescuchar la charla completa"), así que se arma de los segmentos reales y
    nunca de un resumen del modelo: un contexto generado sería una segunda
    afirmación que también habría que validar.
    """
    vecinos = [
        segmento
        for segmento in ventana.segmentos
        if segmento.fin >= inicio - segundos_alrededor
        and segmento.inicio <= fin + segundos_alrededor
    ]

    return " ".join(segmento.texto for segmento in vecinos).strip()
