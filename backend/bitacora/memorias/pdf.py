"""
Convertir un `.docx` a PDF con LibreOffice.

Es la única forma fiel de hacerlo. Pintar el documento en el navegador y
"imprimirlo" pierde la paginación de Word —los saltos se recalculan con otras
reglas— y convertidores en JavaScript puro no dibujan tablas, encabezados ni
fuentes incrustadas como Word. LibreOffice sí, y es gratis.

El precio es que tiene que estar instalado donde corre el backend. Si no está,
se dice con su propio código (`MEM_PDF_SIN_CONVERSOR`) y la memoria en Word
sigue disponible: que falte el PDF no puede costar la memoria entera.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

from bitacora.compartido.errores import ErrorDeBitacora

"""
Más que cualquier plantilla razonable y menos que lo que tumba al servidor.
Un `.docx` pesa sobre todo por sus imágenes; 25 MB ya es un logo sin comprimir
en cada página.
"""
TAMANO_MAXIMO_EN_BYTES = 25 * 1024 * 1024

"""
La primera conversión arranca LibreOffice desde cero y tarda varios segundos;
un documento normal, uno o dos más. Un minuto es margen de sobra sin dejar una
petición colgada para siempre si LibreOffice se atasca.
"""
SEGUNDOS_MAXIMOS = 60

"""
Un perfil de LibreOffice fijo, reutilizado entre conversiones, y un candado
para que vayan de una en una.

Dos conversiones a la vez sobre el mismo perfil chocan: la segunda lo
encuentra bloqueado y LibreOffice sale sin error y sin PDF, que es el fallo más
difícil de diagnosticar posible. La primera versión lo evitaba creando un
perfil nuevo en cada conversión, y medido costaba caro: 9 segundos por memoria,
casi todos de crear el perfil. Con uno fijo, solo la primera conversión paga
ese arranque. El candado es lo que hace seguro reutilizarlo, y para un grupo
de investigación convertir de una en una no es un cuello de botella.
"""
_PERFIL = Path(tempfile.gettempdir()) / "menti-vault-libreoffice"
_UNA_A_LA_VEZ = threading.Lock()

_RUTAS_CONOCIDAS = (
    r"C:\Program Files\LibreOffice\program\soffice.exe",
    r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
)


def ruta_de_libreoffice() -> str | None:
    """
    `BITACORA_SOFFICE` manda si está puesta: en el despliegue la ruta la
    decide quien instala, no este archivo. Si no, se busca en el `PATH` y en
    las rutas habituales de cada sistema.
    """
    explicita = os.environ.get("BITACORA_SOFFICE", "").strip()
    if explicita:
        return explicita if Path(explicita).is_file() else None

    en_el_path = shutil.which("soffice") or shutil.which("libreoffice")
    if en_el_path:
        return en_el_path

    return next((ruta for ruta in _RUTAS_CONOCIDAS if Path(ruta).is_file()), None)


def convertir_a_pdf(docx: bytes) -> bytes:
    if not docx:
        raise ErrorDeBitacora("MEM_DOCX_VACIO")

    if len(docx) > TAMANO_MAXIMO_EN_BYTES:
        raise ErrorDeBitacora("MEM_DOCX_DEMASIADO_GRANDE", f"{len(docx)} bytes")

    soffice = ruta_de_libreoffice()
    if soffice is None:
        raise ErrorDeBitacora("MEM_PDF_SIN_CONVERSOR")

    with tempfile.TemporaryDirectory(prefix="menti-pdf-") as carpeta:
        directorio = Path(carpeta)
        entrada = directorio / "memoria.docx"
        entrada.write_bytes(docx)

        try:
            with _UNA_A_LA_VEZ:
                subprocess.run(
                    [
                        soffice,
                        f"-env:UserInstallation={_PERFIL.as_uri()}",
                        "--headless",
                        "--norestore",
                        "--convert-to",
                        "pdf",
                        "--outdir",
                        str(directorio),
                        str(entrada),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=SEGUNDOS_MAXIMOS,
                )
        except subprocess.TimeoutExpired as fallo:
            raise ErrorDeBitacora("MEM_PDF_FALLO", "LibreOffice no terminó a tiempo") from fallo
        except (subprocess.CalledProcessError, OSError) as fallo:
            raise ErrorDeBitacora("MEM_PDF_FALLO", type(fallo).__name__) from fallo

        salida = directorio / "memoria.pdf"

        """
        LibreOffice puede salir con código 0 sin haber escrito nada (un
        documento que no sabe abrir, un perfil que no pudo crear). Por eso se
        comprueba el archivo, no solo el código de salida.
        """
        if not salida.is_file() or salida.stat().st_size == 0:
            raise ErrorDeBitacora("MEM_PDF_FALLO", "LibreOffice no produjo ningún PDF")

        return salida.read_bytes()
