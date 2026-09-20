"""
Punto de entrada de `uvicorn main:app --reload`, tal como lo documenta el
README de la raíz.

Es tan corto a propósito: leer el `.env`, validar la configuración y armar la
aplicación. La configuración se pide AQUÍ, en el import, para que una variable
faltante reviente al arrancar con el mensaje que dice cuál falta — en vez de
en la primera petición, media hora después, con un 500 sin explicación.
"""

from __future__ import annotations

import logging

from dotenv import load_dotenv

from bitacora.api.aplicacion import crear_aplicacion
from bitacora.api.dependencias import configuracion

"""
`load_dotenv` no pisa lo que ya esté en el entorno: en el despliegue las
variables las pone la plataforma, y un `.env` olvidado en la imagen no debería
poder sobreescribirlas.
"""
load_dotenv(override=False)

"""
Los registros de `bitacora.*` salen por donde salen los de uvicorn.

Sin esto se perdian en silencio, que es lo peor que puede pasarle a un log.
Uvicorn configura handlers para sus propios loggers y deja el raiz vacio, y
Python solo tiene red de seguridad (`logging.lastResort`) de WARNING para
arriba: un `registro.info` con el resumen del analisis --cuantas fichas se
pidieron, se generaron, se guardaron y se condensaron-- no llegaba a ninguna
parte. Justo la linea que existe para no tener que adivinar por que una
charla devolvio ciento cuarenta y nueve fichas cuando se pidieron veintiseis.

Se toca solo el arbol `bitacora` y no el raiz: subir el nivel global llenaria
la consola con el detalle de httpx y openai en cada peticion.
"""
logging.getLogger("bitacora").setLevel(logging.INFO)

if not logging.getLogger("bitacora").handlers:
    salida = logging.StreamHandler()
    salida.setFormatter(logging.Formatter("%(levelname)s:     %(name)s %(message)s"))
    logging.getLogger("bitacora").addHandler(salida)

app = crear_aplicacion(configuracion())
