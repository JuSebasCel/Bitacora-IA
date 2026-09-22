"""
Mantener despierto el servidor mientras hay un análisis en curso.

En el plan gratuito de Render, un servicio que pasa 15 minutos sin tráfico
entrante se duerme, y dormido no termina lo que tenía entre manos. Aquí eso
pasa justo en el caso más largo: `POST /procesar` responde 202 al instante y
el análisis sigue en segundo plano, a veces más de diez minutos, sin que
nadie le vuelva a hablar al backend (la interfaz consulta el avance
directo a Supabase).

Mientras haya al menos un análisis corriendo, el propio backend se hace una
petición a su dirección pública cada pocos minutos. Pasa por la puerta de
entrada de Render, así que cuenta como tráfico entrante, y el servicio no se
duerme aunque se haya cerrado la pestaña. Sin trabajo pendiente, no hace
nada: el servicio se duerme como siempre y no gasta horas del mes.

La dirección sale de `RENDER_EXTERNAL_URL`, que Render pone solo, o de
`BITACORA_URL_PUBLICA` en otro proveedor. Sin ninguna de las dos (en local,
o en un servidor que nunca se duerme) esto no hace nada.
"""

from __future__ import annotations

import logging
import os
import threading
import urllib.request
from contextlib import contextmanager
from typing import Iterator

registro = logging.getLogger("bitacora.despierto")

"""Muy por debajo de los 15 minutos de Render, para que un aviso perdido no alcance a dormirlo."""
INTERVALO_S = 5 * 60

_candado = threading.Lock()
_en_curso = 0
_hilo: threading.Thread | None = None


def _url_publica() -> str:
    return (os.environ.get("BITACORA_URL_PUBLICA") or os.environ.get("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")


def _mientras_haya_trabajo(url: str) -> None:
    global _hilo

    evento = threading.Event()
    while True:
        evento.wait(INTERVALO_S)

        with _candado:
            if _en_curso == 0:
                _hilo = None
                return

        try:
            urllib.request.urlopen(f"{url}/salud", timeout=20).close()
        except Exception as fallo:  # noqa: BLE001
            registro.warning("no se pudo mantener despierto el servidor tipo=%s", type(fallo).__name__)


@contextmanager
def mientras_trabaja() -> Iterator[None]:
    """Envuelve un trabajo en segundo plano: mientras dure, el servidor no se duerme."""
    global _en_curso, _hilo

    url = _url_publica()

    with _candado:
        _en_curso += 1
        if url and _hilo is None:
            _hilo = threading.Thread(target=_mientras_haya_trabajo, args=(url,), daemon=True)
            _hilo.start()

    try:
        yield
    finally:
        with _candado:
            _en_curso -= 1
