"""
Pruebas del chunking: que ninguna ventana pierda contenido y que el modelo vea
las coordenadas escritas delante de cada línea.
"""

from __future__ import annotations

from bitacora.analisis.chunking import (
    Ventana,
    agrupar_en_ventanas,
    contexto_de,
    renderizar_ventana,
)
from bitacora.conferencias.tipos import Segmento


def segmentos(cantidad: int, largo: int = 100) -> tuple[Segmento, ...]:
    return tuple(
        Segmento(inicio=indice * 10, fin=indice * 10 + 10, texto="x" * largo)
        for indice in range(cantidad)
    )


def test_sin_segmentos_no_hay_ventanas() -> None:
    assert agrupar_en_ventanas(()) == ()


def test_todo_cabe_en_una_ventana_cuando_la_charla_es_corta() -> None:
    ventanas = agrupar_en_ventanas(segmentos(5), caracteres_por_ventana=6000)

    assert len(ventanas) == 1
    assert ventanas[0].inicio == 0 and ventanas[0].fin == 50


def test_ningun_segmento_se_pierde_al_partir_en_varias_ventanas() -> None:
    """La propiedad que sostiene todo lo demás: partir no puede tirar contenido."""
    entrada = segmentos(30)

    ventanas = agrupar_en_ventanas(entrada, caracteres_por_ventana=500, segmentos_de_solape=2)

    cubiertos = {segmento for ventana in ventanas for segmento in ventana.segmentos}

    assert cubiertos == set(entrada)
    assert len(ventanas) > 1


def test_las_ventanas_se_solapan_para_no_cortar_una_unidad_a_la_mitad() -> None:
    ventanas = agrupar_en_ventanas(segmentos(12), caracteres_por_ventana=500, segmentos_de_solape=2)

    for anterior, siguiente in zip(ventanas, ventanas[1:]):
        compartidos = set(anterior.segmentos) & set(siguiente.segmentos)
        assert len(compartidos) == 2


def test_sin_solape_configurado_las_ventanas_quedan_disjuntas() -> None:
    ventanas = agrupar_en_ventanas(segmentos(12), caracteres_por_ventana=500, segmentos_de_solape=0)

    for anterior, siguiente in zip(ventanas, ventanas[1:]):
        assert not set(anterior.segmentos) & set(siguiente.segmentos)


def test_un_segmento_mas_largo_que_la_ventana_no_se_parte() -> None:
    """Partirlo por caracteres cortaría a mitad de frase; una ventana grande de más no daña."""
    ventanas = agrupar_en_ventanas(segmentos(1, largo=9000), caracteres_por_ventana=500)

    assert len(ventanas) == 1
    assert len(ventanas[0].segmentos[0].texto) == 9000


def test_la_ultima_ventana_no_es_puro_solape_de_la_anterior() -> None:
    """Una ventana que no agrega nada solo cuesta una llamada al modelo."""
    ventanas = agrupar_en_ventanas(segmentos(6), caracteres_por_ventana=300, segmentos_de_solape=3)

    assert all(not set(v.segmentos).issubset(set(ventanas[-2].segmentos)) for v in ventanas[-1:])


def test_una_ventana_esta_estimada_si_alguno_de_sus_segmentos_lo_esta() -> None:
    ventana = Ventana(
        segmentos=(
            Segmento(inicio=0, fin=5, texto="medido"),
            Segmento(inicio=5, fin=10, texto="repartido", estimado=True),
        )
    )

    assert ventana.estimada


def test_el_texto_que_ve_el_modelo_lleva_la_coordenada_delante() -> None:
    ventana = Ventana(
        segmentos=(
            Segmento(inicio=10, fin=20, texto="El sesgo aparece antes", hablante="Ana Ruiz"),
            Segmento(inicio=20, fin=31, texto="No siempre"),
        )
    )

    assert renderizar_ventana(ventana) == (
        "[10-20] Ana Ruiz: El sesgo aparece antes\n[20-31] No siempre"
    )


def test_el_contexto_minimo_sale_de_los_segmentos_reales_alrededor() -> None:
    ventana = Ventana(
        segmentos=(
            Segmento(inicio=0, fin=10, texto="antes"),
            Segmento(inicio=10, fin=20, texto="la ficha"),
            Segmento(inicio=20, fin=30, texto="después"),
            Segmento(inicio=200, fin=210, texto="mucho después"),
        )
    )

    contexto = contexto_de(ventana, inicio=10, fin=20, segundos_alrededor=15)

    assert contexto == "antes la ficha después"
    assert "mucho después" not in contexto
