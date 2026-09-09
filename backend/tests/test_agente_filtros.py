"""
Pruebas del mapeo de una pregunta a filtros estructurados.

Todas giran sobre la misma idea: lo que el modelo devuelve es una propuesta, y
un filtro que no existe en el mundo real (un tema fuera del pool, un evento que
esta persona no ve, un tipo de unidad inventado) recorta el catálogo por un
criterio que nadie pidió. Ante la duda, no se filtra.
"""

from __future__ import annotations

from bitacora.agente.filtros import (
    LIMITE_MAXIMO,
    LIMITE_POR_DEFECTO,
    FiltrosDeConsulta,
    alcance_desde_jsonb,
    aplicar_alcance,
    filtros_desde_propuesta,
    palabras_clave,
)

EVENTOS = ("Congreso IA 2026", "Jornadas de Datos")


def test_las_muletillas_se_quitan_para_que_quede_lo_que_se_busca() -> None:
    assert palabras_clave("Háblame de sesgos algorítmicos") == ("sesgos", "algoritmicos")


def test_una_pregunta_de_pura_cortesia_conserva_sus_palabras() -> None:
    """Quitar todo dejaría una búsqueda vacía, que traería el catálogo entero."""
    assert palabras_clave("dime algo") == ("dime", "algo")


def test_una_propuesta_valida_se_traduce_entera(temas) -> None:
    filtros = filtros_desde_propuesta(
        {
            "palabras_clave": ["sesgo"],
            "tema": "Sesgos algorítmicos",
            "tipo_de_unidad": "cita-textual",
            "evento": "Congreso IA 2026",
            "estado_de_validacion": "validada",
            "cantidad": 5,
        },
        "¿qué se dijo sobre sesgos?",
        temas,
        EVENTOS,
    )

    assert filtros == FiltrosDeConsulta(
        palabras=("sesgo",),
        id_tema="tem-sesgos",
        tipo_de_unidad="cita-textual",
        evento="Congreso IA 2026",
        estado="validada",
        limite=5,
    )


def test_un_tema_fuera_del_pool_no_se_convierte_en_filtro(temas) -> None:
    """Buscar por un id inventado devolvería cero y parecería «no hay nada sobre eso»."""
    filtros = filtros_desde_propuesta(
        {"tema": "Discriminación algorítmica"}, "pregunta", temas, EVENTOS
    )

    assert filtros.id_tema is None


def test_un_tipo_de_unidad_inventado_se_descarta(temas) -> None:
    filtros = filtros_desde_propuesta(
        {"tipo_de_unidad": "anecdota"}, "pregunta", temas, EVENTOS
    )

    assert filtros.tipo_de_unidad is None


def test_un_evento_que_esta_persona_no_ve_se_descarta(temas) -> None:
    filtros = filtros_desde_propuesta(
        {"evento": "Congreso Secreto 2019"}, "pregunta", temas, EVENTOS
    )

    assert filtros.evento is None


def test_el_evento_se_reconoce_sin_importar_acentos_ni_mayusculas(temas) -> None:
    filtros = filtros_desde_propuesta(
        {"evento": "jornadas de datos"}, "pregunta", temas, EVENTOS
    )

    assert filtros.evento == "Jornadas de Datos"


def test_un_estado_de_validacion_invalido_cae_a_todos(temas) -> None:
    filtros = filtros_desde_propuesta(
        {"estado_de_validacion": "revisada"}, "pregunta", temas, EVENTOS
    )

    assert filtros.estado == "todos"


def test_el_limite_se_recorta_a_lo_que_el_modelo_puede_leer_entero(temas) -> None:
    assert filtros_desde_propuesta({"cantidad": 900}, "p", temas, EVENTOS).limite == LIMITE_MAXIMO
    assert filtros_desde_propuesta({"cantidad": 0}, "p", temas, EVENTOS).limite == 1
    assert (
        filtros_desde_propuesta({"cantidad": "varias"}, "p", temas, EVENTOS).limite
        == LIMITE_POR_DEFECTO
    )


def test_una_propuesta_ilegible_cae_a_buscar_por_la_pregunta(temas) -> None:
    filtros = filtros_desde_propuesta("no es un objeto", "sesgos en datos", temas, EVENTOS)

    assert filtros.palabras == ("sesgos", "datos")
    assert filtros.id_tema is None


def test_sin_palabras_clave_propuestas_se_usan_las_de_la_pregunta(temas) -> None:
    filtros = filtros_desde_propuesta({"palabras_clave": []}, "háblame de métodos", temas, EVENTOS)

    assert filtros.palabras == ("metodos",)


# ---------------------------------------------------------------------------
# Alcance de la conversación
# ---------------------------------------------------------------------------


def test_el_alcance_se_lee_con_la_ortografia_que_escribe_el_frontend() -> None:
    resuelto = alcance_desde_jsonb({"tipo": "seleccion", "idsConferencias": ["conf-1", "conf-2"]})

    assert resuelto == {"tipo": "seleccion", "idsConferencias": ("conf-1", "conf-2")}


def test_un_alcance_con_forma_desconocida_se_trata_como_todas() -> None:
    for crudo in (None, {}, {"tipo": "otra-cosa"}, "todas", []):
        assert alcance_desde_jsonb(crudo)["tipo"] == "todas"


def test_el_alcance_de_seleccion_acota_las_conferencias() -> None:
    filtros = aplicar_alcance(
        FiltrosDeConsulta(palabras=("sesgo",)),
        {"tipo": "seleccion", "idsConferencias": ["conf-1"]},
    )

    assert filtros.ids_conferencias == ("conf-1",)


def test_el_alcance_elegido_a_mano_gana_sobre_lo_que_propuso_el_modelo() -> None:
    """Si alguien acotó a un tema, el agente no puede ampliar porque le pareció."""
    filtros = aplicar_alcance(
        FiltrosDeConsulta(palabras=("sesgo",), id_tema=None),
        {"tipo": "filtro", "idTema": "tem-evaluacion", "palabraClave": "métricas"},
    )

    assert filtros.id_tema == "tem-evaluacion"
    assert "metricas" in filtros.palabras
    assert "sesgo" in filtros.palabras


def test_el_alcance_todas_no_toca_los_filtros() -> None:
    originales = FiltrosDeConsulta(palabras=("sesgo",), id_tema="tem-sesgos")

    assert aplicar_alcance(originales, {"tipo": "todas"}) == originales
