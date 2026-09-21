"""
Lo que la redacción necesita leer: la conferencia y sus fichas.

Con el cliente de la persona que pide, igual que el resto del backend: RLS
decide qué conferencias puede usar para una memoria, y una que no le
corresponde llega como no encontrada.
"""

from __future__ import annotations

from typing import Any

from bitacora.compartido.datos import ClienteSupabase, traducir_fallo_de_datos
from bitacora.conferencias.repositorio import RepositorioSupabase
from bitacora.memorias.redaccion import DatosDeLaCharla, FichaParaRedactar


def leer_material(
    cliente: ClienteSupabase, id_conferencia: str
) -> tuple[DatosDeLaCharla, tuple[FichaParaRedactar, ...]]:
    conferencia = RepositorioSupabase(cliente).obtener_conferencia(id_conferencia)

    try:
        respuesta = (
            cliente.table("fichas")
            .select("tipo_de_unidad, fragmento, condensado")
            .eq("id_conferencia", id_conferencia)
            .order("segundo_inicio")
            .execute()
        )
    except Exception as fallo:  # noqa: BLE001
        raise traducir_fallo_de_datos(fallo) from fallo

    filas: list[dict[str, Any]] = getattr(respuesta, "data", None) or []

    fichas = tuple(
        FichaParaRedactar(
            tipo=str(fila.get("tipo_de_unidad") or ""),
            texto=str(fila.get("condensado") or fila.get("fragmento") or "").strip(),
            literal=str(fila.get("fragmento") or "").strip(),
        )
        for fila in filas
    )

    charla = DatosDeLaCharla(
        titulo=conferencia.titulo,
        ponente=conferencia.ponente,
        evento=conferencia.evento,
        fecha=conferencia.fecha_del_evento,
        resumen=conferencia.resumen,
    )

    return charla, tuple(ficha for ficha in fichas if ficha.texto)
