"""
De los bytes de un archivo de transcripción a texto plano. Puro y probado.

`validacion.ts` del frontend admite `.txt`, `.docx`, `.pdf` y `.md` como
transcripción. Aquí se resuelven tres de los cuatro sin ninguna dependencia
nueva: el `.docx` es un zip con XML dentro y la biblioteca estándar lo abre.
El `.pdf` no: extraer texto de un PDF exige un intérprete real del formato, y
meter esa dependencia solo para este camino no se justifica mientras nadie
haya pedido cargar transcripciones en PDF. Se rechaza con un código propio en
vez de devolver bytes ilegibles convertidos a "texto".
"""

from __future__ import annotations

import re
import zipfile
from io import BytesIO

from bitacora.compartido.errores import ErrorDeBitacora

EXTENSIONES_DE_TEXTO = (".txt", ".md", ".vtt", ".srt")
EXTENSION_DOCX = ".docx"

"""
Orden de intento de codificación. UTF-8 primero porque es lo que produce
cualquier herramienta actual; `cp1252` después porque es lo que produce el
Bloc de notas de un Windows en español, que es de donde salen la mitad de las
transcripciones de este grupo. `latin-1` nunca falla, así que va al final como
red de seguridad: sin él, un solo byte raro tiraría una transcripción entera.
"""
CODIFICACIONES = ("utf-8-sig", "utf-8", "cp1252", "latin-1")

_PARRAFO_DOCX = re.compile(rb"<w:p[ >].*?</w:p>", re.DOTALL)
_TEXTO_DOCX = re.compile(rb"<w:t[^>]*>(.*?)</w:t>", re.DOTALL)
_ETIQUETA_XML = re.compile(rb"<[^>]+>")


def _decodificar(contenido: bytes) -> str:
    for codificacion in CODIFICACIONES:
        try:
            return contenido.decode(codificacion)
        except UnicodeDecodeError:
            continue

    raise ErrorDeBitacora("PROC_ARCHIVO_ILEGIBLE", "codificación desconocida")


def _texto_de_docx(contenido: bytes) -> str:
    """
    Un párrafo de Word por línea, que es lo que el parser de marcas necesita.

    Se lee el XML con expresiones regulares y no con un parser: el objetivo no
    es entender el documento sino recuperar su texto en orden, y un `<w:p>`
    puede anidar tablas, comentarios y revisiones que un parser obligaría a
    recorrer sin que ninguna de esas ramas aporte nada. Si el archivo no es un
    zip válido, es que no era un .docx.
    """
    try:
        with zipfile.ZipFile(BytesIO(contenido)) as documento:
            xml = documento.read("word/document.xml")
    except (KeyError, zipfile.BadZipFile, OSError) as fallo:
        raise ErrorDeBitacora("PROC_ARCHIVO_ILEGIBLE", type(fallo).__name__) from fallo

    lineas: list[str] = []

    for parrafo in _PARRAFO_DOCX.findall(xml):
        trozos = [
            _ETIQUETA_XML.sub(b"", trozo).decode("utf-8", errors="replace")
            for trozo in _TEXTO_DOCX.findall(parrafo)
        ]
        linea = "".join(trozos).strip()
        if linea:
            lineas.append(_desescapar(linea))

    return "\n".join(lineas)


def _desescapar(texto: str) -> str:
    return (
        texto.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
    )


def texto_de_archivo(nombre: str, contenido: bytes) -> str:
    minusculas = nombre.lower()

    if minusculas.endswith(EXTENSION_DOCX):
        texto = _texto_de_docx(contenido)
    elif minusculas.endswith(EXTENSIONES_DE_TEXTO) or "." not in minusculas:
        texto = _decodificar(contenido)
    else:
        raise ErrorDeBitacora("PROC_ARCHIVO_ILEGIBLE", f"extensión no soportada: {minusculas[-8:]}")

    if texto.strip() == "":
        raise ErrorDeBitacora("PROC_TRANSCRIPCION_VACIA")

    return texto
