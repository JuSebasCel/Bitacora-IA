"""
La prueba que custodia los literales duplicados en tres lenguajes.

`TipoDeUnidad`, `EstadoDeValidacion` y `EstadoDeProcesamiento` están escritos
en el `check` de una migración de Postgres, en una unión de TypeScript y en un
`Literal` de Python. No hay una sola fuente de la que generarlos sin montar un
generador de código, así que la alternativa es esta: leer los otros dos
archivos y comparar. Si alguien agrega un séptimo tipo de unidad en la
migración y se olvida del backend, falla aquí y no en producción con un
`violates check constraint` sin explicación.

Se salta —no falla— si el frontend o las migraciones no están en el árbol:
el backend tiene que poder clonarse y probarse solo.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from bitacora.conferencias.tipos import (
    ESTADOS_DE_PROCESAMIENTO,
    ESTADOS_DE_VALIDACION,
    FUENTES_DE_CONFERENCIA,
    TIPOS_DE_UNIDAD,
)

RAIZ = Path(__file__).resolve().parent.parent.parent
MIGRACIONES = RAIZ / "supabase" / "migrations"
TIPOS_DEL_FRONTEND = RAIZ / "frontend" / "src" / "features" / "conferencias" / "data" / "tipos.ts"


def _sql_del_esquema() -> str:
    archivos = sorted(MIGRACIONES.glob("*_esquema_propio.sql")) if MIGRACIONES.exists() else []

    if not archivos:
        pytest.skip("las migraciones no están en este árbol")

    return archivos[0].read_text(encoding="utf-8")


def _literales_del_check(sql: str, columna: str) -> set[str]:
    """Extrae los literales de un `check (columna in ('a', 'b'))` de la migración."""
    patron = re.compile(rf"{columna}\s+in\s*\((?P<valores>[^)]*)\)", re.IGNORECASE | re.DOTALL)
    coincidencia = patron.search(sql)

    assert coincidencia is not None, f"no se encontró el check de {columna} en la migración"

    return set(re.findall(r"'([^']+)'", coincidencia.group("valores")))


def _union_de_typescript(fuente: str, nombre: str) -> set[str]:
    patron = re.compile(rf"type\s+{nombre}\s*=(?P<cuerpo>.*?)\n\n", re.DOTALL)
    coincidencia = patron.search(fuente)

    assert coincidencia is not None, f"no se encontró el tipo {nombre} en el frontend"

    return set(re.findall(r"'([^']+)'", coincidencia.group("cuerpo")))


@pytest.mark.parametrize(
    ("columna", "esperados"),
    [
        ("tipo_de_unidad", TIPOS_DE_UNIDAD),
        ("estado_de_validacion", ESTADOS_DE_VALIDACION),
        ("estado", ESTADOS_DE_PROCESAMIENTO),
        ("fuente", FUENTES_DE_CONFERENCIA),
    ],
)
def test_los_literales_coinciden_con_los_checks_de_la_migracion(
    columna: str, esperados: tuple[str, ...]
) -> None:
    assert _literales_del_check(_sql_del_esquema(), columna) == set(esperados)


@pytest.mark.parametrize(
    ("nombre", "esperados"),
    [
        ("TipoDeUnidad", TIPOS_DE_UNIDAD),
        ("EstadoDeValidacion", ESTADOS_DE_VALIDACION),
        ("EstadoDeProcesamiento", ESTADOS_DE_PROCESAMIENTO),
        ("FuenteDeConferencia", FUENTES_DE_CONFERENCIA),
    ],
)
def test_los_literales_coinciden_con_las_uniones_del_frontend(
    nombre: str, esperados: tuple[str, ...]
) -> None:
    if not TIPOS_DEL_FRONTEND.exists():
        pytest.skip("el frontend no está en este árbol")

    assert _union_de_typescript(
        TIPOS_DEL_FRONTEND.read_text(encoding="utf-8"), nombre
    ) == set(esperados)


def test_las_columnas_de_ficha_existen_en_la_tabla() -> None:
    """
    Lo que se inserta es `fila_de_ficha`, no `asdict`: un nombre de campo que
    no sea una columna real hace fallar el insert de la conferencia entera, y
    seria un fallo tardio, en segundo plano, despues de haber pagado la
    transcripcion.

    Los campos de transporte quedan fuera de la comprobacion, pero se exige
    que esten declarados en `CAMPOS_QUE_NO_SON_COLUMNAS`: asi agregar uno
    obliga a decirlo, en vez de descubrirlo cuando Postgres rechace la fila.
    """
    from dataclasses import fields

    from bitacora.conferencias.tipos import CAMPOS_QUE_NO_SON_COLUMNAS, Ficha, fila_de_ficha

    sql = _sql_del_esquema()
    definicion = sql[sql.index("create table fichas") : sql.index("create index fichas_")]

    """
    Tambien lo que agregaron las migraciones posteriores: una columna nacida
    en un `alter table` es tan columna como las del `create`, y mirar solo el
    esquema original haria fallar la prueba cada vez que el dominio crezca.
    """
    alteraciones = chr(10).join(
        archivo.read_text(encoding="utf-8")
        for archivo in sorted(MIGRACIONES.glob("*.sql"))
        if "alter table fichas" in archivo.read_text(encoding="utf-8")
    )

    for campo in fields(Ficha):
        if campo.name in CAMPOS_QUE_NO_SON_COLUMNAS:
            continue

        en_el_create = re.search(rf"^\s+{campo.name}\s", definicion, re.MULTILINE)
        en_un_alter = re.search(rf"add column {campo.name}\s", alteraciones)

        assert en_el_create or en_un_alter, f"`fichas` no tiene la columna {campo.name}"

    ficha = Ficha(
        id_conferencia="c",
        fragmento="f",
        hablante="h",
        segundo_inicio=0,
        segundo_fin=1,
        id_tema="t",
        tipo_de_unidad="cita-textual",
        estado_de_validacion="pendiente",
        confianza_automatica=0.5,
        contexto_minimo="ctx",
        nombre_de_tema_nuevo="Inteligencia artificial",
    )

    assert CAMPOS_QUE_NO_SON_COLUMNAS.isdisjoint(fila_de_ficha(ficha))

