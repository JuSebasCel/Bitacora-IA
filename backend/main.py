"""
Punto de entrada de `uvicorn main:app --reload`, tal como lo documenta el
README de la raíz.

Es tan corto a propósito: leer el `.env`, validar la configuración y armar la
aplicación. La configuración se pide AQUÍ, en el import, para que una variable
faltante reviente al arrancar con el mensaje que dice cuál falta — en vez de
en la primera petición, media hora después, con un 500 sin explicación.
"""

from __future__ import annotations

from dotenv import load_dotenv

from bitacora.api.aplicacion import crear_aplicacion
from bitacora.api.dependencias import configuracion

"""
`load_dotenv` no pisa lo que ya esté en el entorno: en el despliegue las
variables las pone la plataforma, y un `.env` olvidado en la imagen no debería
poder sobreescribirlas.
"""
load_dotenv(override=False)

app = crear_aplicacion(configuracion())
