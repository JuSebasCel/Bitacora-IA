"""
Pruebas de la normalización de segmentos: donde nace la coordenada al segundo.

Es el punto del que depende el requisito no funcional duro del producto, así
que las pruebas cubren tanto los caminos felices como los tres desenlaces que
podrían inventar una coordenada sin que se note: un `end` anterior al `start`,
una transcripción sin marcas, y un tramo tan largo que decir "esto ocurrió
aquí" deja de ser cierto.
"""

from __future__ import annotations

import pytest

from bitacora.compartido.errores import ErrorDeBitacora
from bitacora.transcripcion.segmentos import (
    SEGUNDOS_MAXIMOS_POR_SEGMENTO,
    duracion_de,
    normalizar_segmentos,
    segmentos_desde_transcripcion,
)


def test_normaliza_los_segmentos_de_whisper_a_segundos_enteros() -> None:
    segmentos = normalizar_segmentos(
        [
            {"start": 12.4, "end": 18.9, "text": "  El sesgo aparece antes  "},
            {"start": 0.2, "end": 12.4, "text": "Buenos días a todos"},
        ]
    )

    assert [(s.inicio, s.fin) for s in segmentos] == [(0, 12), (12, 19)]
    assert segmentos[1].texto == "El sesgo aparece antes"
    assert all(not s.estimado for s in segmentos), "un tiempo medido nunca es estimado"


def test_descarta_los_segmentos_sin_texto_pero_conserva_los_de_tiempo_invertido() -> None:
    """
    Un `end < start` es un defecto de la herramienta, no contenido inválido:
    tirar el fragmento perdería algo que sí se dijo en la charla.
    """
    segmentos = normalizar_segmentos(
        [
            {"start": 5, "end": 9, "text": "   "},
            {"start": 30, "end": 12, "text": "Frase con tiempos al revés"},
        ]
    )

    assert len(segmentos) == 1
    assert (segmentos[0].inicio, segmentos[0].fin) == (30, 30)


def test_acepta_objetos_ademas_de_diccionarios() -> None:
    class SegmentoDelSdk:
        start, end, text = 3.0, 7.0, "Contenido"

    assert normalizar_segmentos([SegmentoDelSdk()])[0].texto == "Contenido"


def test_una_transcripcion_marcada_usa_sus_propios_tiempos() -> None:
    texto = "\n".join(
        [
            "[00:10] Ana Ruiz: El sesgo aparece en la recolección.",
            "[00:40] Luis Paz: No siempre, depende del muestreo.",
            "[01:20] Ana Ruiz: Cierro con una cifra.",
        ]
    )

    segmentos = segmentos_desde_transcripcion(texto, duracion_en_segundos=100)

    assert [(s.inicio, s.fin) for s in segmentos] == [(10, 40), (40, 80), (80, 100)]
    assert [s.hablante for s in segmentos] == ["Ana Ruiz", "Luis Paz", "Ana Ruiz"]
    assert all(not s.estimado for s in segmentos)


def test_una_linea_sin_marca_continua_la_anterior() -> None:
    texto = "[00:05] Primera idea.\ny esta línea sigue la misma idea.\n[00:30] Segunda idea."

    segmentos = segmentos_desde_transcripcion(texto, duracion_en_segundos=60)

    assert segmentos[0].texto == "Primera idea. y esta línea sigue la misma idea."
    assert segmentos[0].inicio == 5


def test_las_marcas_con_horas_se_leen_como_horas() -> None:
    segmentos = segmentos_desde_transcripcion("[01:02:03] Muy avanzada la charla", 4000)

    assert segmentos[0].inicio == 3723


def test_una_cifra_dicha_en_medio_de_la_frase_no_es_una_marca() -> None:
    """`12:30` dentro del texto no arranca línea, así que no crea un segmento nuevo."""
    texto = "[00:05] Bajamos de 12:30 a 08:15 minutos por lote."

    segmentos = segmentos_desde_transcripcion(texto, duracion_en_segundos=60)

    assert len(segmentos) == 1
    assert "12:30" in segmentos[0].texto


def test_sin_marcas_pero_con_duracion_se_estima_y_queda_marcado_como_estimado() -> None:
    texto = "Primera frase de la charla. " * 40

    segmentos = segmentos_desde_transcripcion(texto, duracion_en_segundos=600)

    assert all(s.estimado for s in segmentos), "una coordenada repartida no puede pasar por medida"
    assert segmentos[0].inicio == 0
    assert segmentos[-1].fin == 600
    assert len(segmentos) > 1, "600 segundos en un solo segmento no serían una coordenada útil"


def test_sin_marcas_y_sin_duracion_se_estima_por_ritmo_de_habla() -> None:
    texto = " ".join(["palabra"] * 300)
    segmentos = segmentos_desde_transcripcion(texto, 0)

    assert all(s.estimado for s in segmentos)
    assert segmentos[-1].fin == 120, "300 palabras a 150 por minuto son dos minutos"


def test_una_transcripcion_vacia_se_reporta_como_tal() -> None:
    with pytest.raises(ErrorDeBitacora) as fallo:
        segmentos_desde_transcripcion("   \n  \n", 600)

    assert fallo.value.codigo == "PROC_TRANSCRIPCION_VACIA"


def test_un_tramo_muy_largo_se_reparte_por_oracion() -> None:
    texto = "[00:00] " + " ".join(f"Oración número {numero}." for numero in range(1, 9))

    segmentos = segmentos_desde_transcripcion(texto, duracion_en_segundos=400)

    assert len(segmentos) == 8
    assert all(s.fin - s.inicio <= SEGUNDOS_MAXIMOS_POR_SEGMENTO for s in segmentos)
    assert segmentos[0].inicio == 0 and segmentos[-1].fin == 400
    """El reparto no puede partir una oración: una cita truncada no es citable."""
    assert all(s.texto.endswith(".") for s in segmentos)


def test_la_duracion_observada_es_el_final_del_ultimo_segmento() -> None:
    segmentos = normalizar_segmentos(
        [{"start": 0, "end": 10, "text": "a"}, {"start": 10, "end": 95, "text": "b"}]
    )

    assert duracion_de(segmentos) == 95
    assert duracion_de(()) == 0
