"""
Pruebas de la frontera entre lo que dice el modelo y lo que entra al catálogo.

Casi todas describen una forma concreta en que un modelo puede equivocarse
—inventar un tipo, inventar un tema, devolver una coordenada de otra parte de
la charla, inflar su confianza— y afirman qué hace el backend con eso. Son las
pruebas que permiten confiar en el resto del pipeline.
"""

from __future__ import annotations

import pytest

from bitacora.analisis.chunking import Ventana
from bitacora.analisis.clasificacion import (
    ContextoDeClasificacion,
    UMBRAL_DE_CONFIANZA_POR_TIPO,
    deduplicar,
    deduplicar_propuestas,
    estado_inicial,
    normalizar,
    resolver_tema,
    resumen_de,
    validar_propuestas,
)
from bitacora.conferencias.tipos import (
    ESTADOS_DE_VALIDACION,
    TIPOS_DE_UNIDAD,
    Ficha,
    PropuestaDeTema,
    Segmento,
    Tema,
)


@pytest.fixture
def ventana() -> Ventana:
    return Ventana(
        segmentos=(
            Segmento(inicio=100, fin=130, texto="El sesgo aparece mucho antes de entrenar el modelo", hablante="Ana Ruiz"),
            Segmento(inicio=130, fin=160, texto="No siempre es asi, depende de como se recogieron los datos", hablante="Luis Paz"),
        )
    )


@pytest.fixture
def contexto(temas) -> ContextoDeClasificacion:
    return ContextoDeClasificacion(
        id_conferencia="conf-1",
        ponente="Ana Ruiz",
        temas=tuple(temas),
        id_tema_de_respaldo="tem-datos",
    )


def propuesta(**cambios) -> dict:
    base = {
        "fragmento": "El sesgo aparece mucho antes de entrenar el modelo",
        "tipo_de_unidad": "postura",
        "tema": "Sesgos algorítmicos",
        "segundo_inicio": 100,
        "segundo_fin": 130,
        "confianza": 0.9,
    }
    base.update(cambios)

    return base


# ---------------------------------------------------------------------------
# Normalización y resolución de temas
# ---------------------------------------------------------------------------


def test_los_temas_se_comparan_sin_acentos_ni_mayusculas(temas) -> None:
    """«Sesgos Algoritmicos» del modelo y «Sesgos algorítmicos» del pool son el mismo tema."""
    resuelto = resolver_tema(temas, "  SESGOS ALGORITMICOS ")

    assert resuelto is not None and resuelto.id == "tem-sesgos"


def test_un_tema_que_no_esta_en_el_pool_no_se_resuelve(temas) -> None:
    assert resolver_tema(temas, "Discriminación algorítmica") is None
    assert resolver_tema(temas, "") is None


def test_normalizar_colapsa_espacios() -> None:
    assert normalizar("  Gobernanza   de  datos ") == "gobernanza de datos"


# ---------------------------------------------------------------------------
# Estado de validación inicial: el corazón del human-in-the-loop
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("tipo", TIPOS_DE_UNIDAD)
def test_ningun_tipo_puede_nacer_validado(tipo: str) -> None:
    """`validada` solo la pone una persona: si el backend pudiera, el paso HITL sobraría."""
    for confianza in (0.0, 0.5, 0.99, 1.0):
        assert estado_inicial(tipo, confianza, coordenada_estimada=False) != "validada"


@pytest.mark.parametrize("tipo", ["cita-textual", "dato-de-impacto"])
def test_las_citas_y_los_datos_de_impacto_siempre_pasan_por_revision(tipo: str) -> None:
    assert estado_inicial(tipo, 1.0, coordenada_estimada=False) == "pendiente"


def test_una_clasificacion_descriptiva_con_alta_confianza_queda_automatica() -> None:
    assert estado_inicial("metodo", 0.95, coordenada_estimada=False) == "automatica"
    assert estado_inicial("metodo", 0.4, coordenada_estimada=False) == "pendiente"


def test_una_postura_exige_mas_confianza_que_un_metodo() -> None:
    """Atribuir una posición a una persona identificable pesa más que describir una técnica."""
    assert UMBRAL_DE_CONFIANZA_POR_TIPO["postura"] > UMBRAL_DE_CONFIANZA_POR_TIPO["metodo"]
    assert estado_inicial("postura", 0.8, coordenada_estimada=False) == "pendiente"
    assert estado_inicial("metodo", 0.8, coordenada_estimada=False) == "automatica"


def test_una_coordenada_estimada_manda_a_revision_por_segura_que_sea_la_clasificacion() -> None:
    assert estado_inicial("metodo", 1.0, coordenada_estimada=True) == "pendiente"


def test_un_tipo_desconocido_nunca_llega_a_automatica() -> None:
    assert estado_inicial("tipo-inventado", 1.0, coordenada_estimada=False) == "pendiente"


# ---------------------------------------------------------------------------
# Validación de las propuestas del modelo
# ---------------------------------------------------------------------------


def test_una_propuesta_correcta_se_convierte_en_ficha(ventana, contexto) -> None:
    resultado = validar_propuestas([propuesta()], ventana, contexto)

    assert len(resultado.fichas) == 1
    ficha = resultado.fichas[0]
    assert ficha.id_conferencia == "conf-1"
    assert ficha.id_tema == "tem-sesgos"
    assert (ficha.segundo_inicio, ficha.segundo_fin) == (100, 130)
    assert ficha.estado_de_validacion == "automatica"
    assert ficha.estado_de_validacion in ESTADOS_DE_VALIDACION
    assert ficha.contexto_minimo != ""


def test_un_tipo_de_unidad_inventado_descarta_la_propuesta(ventana, contexto) -> None:
    resultado = validar_propuestas(
        [propuesta(tipo_de_unidad="anecdota-graciosa")], ventana, contexto
    )

    assert resultado.fichas == ()


def test_un_fragmento_vacio_descarta_la_propuesta(ventana, contexto) -> None:
    assert validar_propuestas([propuesta(fragmento="   ")], ventana, contexto).fichas == ()


def test_lo_que_no_sea_un_objeto_se_ignora_sin_reventar(ventana, contexto) -> None:
    resultado = validar_propuestas(["texto suelto", None, 42, propuesta()], ventana, contexto)

    assert len(resultado.fichas) == 1


def test_una_coordenada_fuera_de_la_ventana_se_recorta_a_sus_limites(ventana, contexto) -> None:
    """
    Aceptarla tal cual haría que el reproductor llevara a quien valida a un
    punto de la charla donde eso no se dijo.
    """
    resultado = validar_propuestas(
        [propuesta(segundo_inicio=5, segundo_fin=9000)], ventana, contexto
    )

    ficha = resultado.fichas[0]

    assert (ficha.segundo_inicio, ficha.segundo_fin) == (100, 160)


def test_una_coordenada_ilegible_cae_al_inicio_de_la_ventana(ventana, contexto) -> None:
    resultado = validar_propuestas(
        [propuesta(segundo_inicio="hacia el minuto tres", segundo_fin=None)], ventana, contexto
    )

    assert resultado.fichas[0].segundo_inicio == 100


def test_un_tema_que_no_esta_en_el_pool_viaja_con_su_nombre_para_crearse(
    ventana, contexto
) -> None:
    """
    La ficha ya no cae al tema de respaldo: sale con el nombre del tema que el
    analisis quiso usar y sin id, y el pipeline lo crea y la resuelve antes de
    guardar. Archivarla bajo otro tema era dejarla donde nadie la busca solo
    porque el vocabulario aun no la cubria.
    """
    resultado = validar_propuestas(
        [propuesta(tema="Inteligencia artificial", confianza=1.0)], ventana, contexto
    )

    assert resultado.fichas[0].nombre_de_tema_nuevo == "Inteligencia artificial"
    assert [p.nombre for p in resultado.temas_propuestos] == ["Inteligencia artificial"]
    assert resultado.temas_propuestos[0].justificacion != ""


def test_un_tema_del_pool_no_deja_nombre_pendiente(ventana, contexto) -> None:
    """Lo contrario del anterior: si el tema ya existe, se usa su id y no queda nada por crear."""
    resultado = validar_propuestas([propuesta()], ventana, contexto)

    assert resultado.fichas[0].id_tema == "tem-sesgos"
    assert resultado.fichas[0].nombre_de_tema_nuevo == ""


def test_la_confianza_se_recorta_al_rango_valido(ventana, contexto) -> None:
    """La columna tiene `check (confianza_automatica between 0 and 1)`."""
    alta = validar_propuestas([propuesta(confianza=7.5)], ventana, contexto).fichas[0]
    baja = validar_propuestas([propuesta(confianza=-3)], ventana, contexto).fichas[0]
    ilegible = validar_propuestas([propuesta(confianza="mucha")], ventana, contexto).fichas[0]

    assert alta.confianza_automatica == 1.0
    assert baja.confianza_automatica == 0.0
    assert ilegible.confianza_automatica == 0.0


def test_el_hablante_sale_del_segmento_y_no_del_ponente_principal(ventana, contexto) -> None:
    """En un panel, atribuir todo al ponente principal es el error que la validación caza."""
    resultado = validar_propuestas(
        [propuesta(fragmento="No siempre es asi, depende de como se recogieron los datos", segundo_inicio=140, segundo_fin=155, hablante="")],
        ventana,
        contexto,
    )

    assert resultado.fichas[0].hablante == "Luis Paz"


def test_sin_hablante_marcado_se_cae_al_ponente_de_la_conferencia(contexto) -> None:
    ventana = Ventana(segmentos=(Segmento(inicio=0, fin=30, texto="Sin hablante marcado"),))

    resultado = validar_propuestas(
        [propuesta(segundo_inicio=0, segundo_fin=30, hablante=None)], ventana, contexto
    )

    assert resultado.fichas[0].hablante == "Ana Ruiz"


def test_una_ventana_estimada_deja_todas_sus_fichas_pendientes(contexto) -> None:
    ventana = Ventana(
        segmentos=(Segmento(inicio=0, fin=30, texto="Repartido", estimado=True),)
    )

    resultado = validar_propuestas(
        [propuesta(tipo_de_unidad="metodo", segundo_inicio=0, segundo_fin=30, confianza=1.0)],
        ventana,
        contexto,
    )

    assert resultado.fichas[0].estado_de_validacion == "pendiente"


# ---------------------------------------------------------------------------
# Deduplicación entre ventanas solapadas
# ---------------------------------------------------------------------------


def ficha(fragmento: str, inicio: int, confianza: float = 0.5) -> Ficha:
    return Ficha(
        id_conferencia="conf-1",
        fragmento=fragmento,
        hablante="Ana Ruiz",
        segundo_inicio=inicio,
        segundo_fin=inicio + 20,
        id_tema="tem-sesgos",
        tipo_de_unidad="postura",
        estado_de_validacion="pendiente",
        confianza_automatica=confianza,
        contexto_minimo="",
    )


def test_la_misma_unidad_vista_en_dos_ventanas_queda_una_sola_vez() -> None:
    resultado = deduplicar(
        [
            ficha("El sesgo aparece mucho antes de entrenar el modelo", 100),
            ficha("el sesgo APARECE mucho antes de ENTRENAR el modelo", 102),
        ]
    )

    assert len(resultado) == 1


def test_al_deduplicar_gana_la_lectura_con_mas_confianza() -> None:
    resultado = deduplicar(
        [ficha("El sesgo aparece mucho antes de entrenar el modelo", 100, 0.4), ficha("El sesgo aparece mucho antes de entrenar el modelo", 101, 0.9)]
    )

    assert resultado[0].confianza_automatica == 0.9


def test_la_misma_frase_dicha_en_dos_momentos_son_dos_fichas() -> None:
    """
    Comparar solo el texto fusionaría dos apariciones reales y borraría una del
    catálogo, cada una con su coordenada.
    """
    resultado = deduplicar([ficha("Y esto es lo importante", 100), ficha("Y esto es lo importante", 900)])

    assert len(resultado) == 2


def test_las_fichas_quedan_ordenadas_por_coordenada() -> None:
    resultado = deduplicar([ficha("c", 300), ficha("a", 10), ficha("b", 100)])

    assert [f.segundo_inicio for f in resultado] == [10, 100, 300]


def test_las_propuestas_de_tema_se_deduplican_por_nombre_normalizado() -> None:
    resultado = deduplicar_propuestas(
        [
            PropuestaDeTema(nombre="Discriminación algorítmica", justificacion="a"),
            PropuestaDeTema(nombre="discriminacion algoritmica", justificacion="b"),
        ]
    )

    assert len(resultado) == 1


# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------


def test_el_resumen_solo_afirma_lo_que_el_pipeline_conto(temas) -> None:
    """Nada aquí sale del modelo: un resumen generado sería otra afirmación sin validar."""
    resumen = resumen_de([ficha("a", 10), ficha("b", 40)], temas)

    assert "2 fichas" in resumen
    assert "Sesgos algorítmicos" in resumen
    assert "2 en espera de validación" in resumen


def test_sin_fichas_el_resumen_queda_vacio(temas) -> None:
    assert resumen_de([], temas) == ""
