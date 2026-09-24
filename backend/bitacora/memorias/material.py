"""
El material de apoyo de una charla: diapositivas y documentos que la acompañan.

Parte de lo que se dice en una conferencia no se dice: se muestra. Cifras,
nombres de institución, correos de contacto o el esquema de un método viven en
la diapositiva y no en el audio, así que ni la transcripción ni las fichas los
tienen, y la memoria salía sin ellos.

**Se lee el texto, no la imagen.** Un `.pptx` y un `.pdf` llevan su texto
dentro; extraerlo cuesta milisegundos y entra en el mismo recorrido que la
transcripción (`rastreo.py`). Mandar las diapositivas como imágenes a un
modelo con visión sería otra cuenta, otro modelo y mucho más caro para
recuperar, casi siempre, texto que ya estaba ahí escrito. Lo que quede solo
como imagen (una foto, un gráfico sin rótulos) no se recupera, y eso se dice
en la interfaz en vez de fingir que sí.

Un vídeo no se admite: ningún proveedor del plan gratuito lo acepta, y
subirlo solo para sacarle el audio es el camino largo a lo que ya hace
`transcripcion/`.
"""

from __future__ import annotations

import logging
import re
import zipfile
from io import BytesIO

registro = logging.getLogger("bitacora.memorias.material")

EXTENSIONES_ADMITIDAS = (".pdf", ".pptx", ".docx", ".txt", ".md")

"""
Tope de texto por archivo. Un PDF de doscientas páginas colado como "material
de apoyo" multiplicaría el recorrido del rastreo sin aportar: las
diapositivas de una charla rara vez pasan de unos miles de caracteres.
"""
CARACTERES_POR_ARCHIVO = 20_000

_TEXTO_PPTX = re.compile(rb"<a:t>(.*?)</a:t>", re.DOTALL)
_ETIQUETA = re.compile(rb"<[^>]+>")


def _sin_etiquetas(crudo: bytes) -> str:
    return _ETIQUETA.sub(b"", crudo).decode("utf-8", errors="replace")


def _texto_de_pptx(contenido: bytes) -> str:
    """
    Una diapositiva por bloque, en el orden de la presentación.

    Se leen los `<a:t>` de cada `ppt/slides/slideN.xml` con expresiones
    regulares y no con un parser: el objetivo no es entender la presentación
    sino recuperar su texto en orden, y un XML de PowerPoint anida
    transiciones, animaciones y notas que no aportan nada.
    """
    with zipfile.ZipFile(BytesIO(contenido)) as presentacion:
        laminas = sorted(
            (nombre for nombre in presentacion.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", nombre)),
            key=lambda nombre: int(re.findall(r"\d+", nombre)[-1]),
        )

        bloques: list[str] = []

        for numero, lamina in enumerate(laminas, start=1):
            trozos = [_sin_etiquetas(trozo).strip() for trozo in _TEXTO_PPTX.findall(presentacion.read(lamina))]
            texto = " ".join(trozo for trozo in trozos if trozo)

            if texto:
                bloques.append(f"[Diapositiva {numero}] {texto}")

        return "\n".join(bloques)


def _texto_de_pdf(contenido: bytes) -> str:
    """
    Con `pypdf` si está instalado, y si no, nada.

    Es la única dependencia que existe solo para esto, así que su ausencia no
    puede tumbar una memoria: sin ella el PDF se salta y el resto del material
    se usa igual.
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        registro.warning("no se pudo leer un PDF de apoyo: falta pypdf")
        return ""

    lector = PdfReader(BytesIO(contenido))
    paginas = [(pagina.extract_text() or "").strip() for pagina in lector.pages]

    return "\n".join(f"[Página {numero}] {texto}" for numero, texto in enumerate(paginas, start=1) if texto)


def texto_de_material(nombre: str, contenido: bytes) -> str:
    """El texto de un archivo de apoyo. Vacío si no se puede leer: nunca lanza."""
    minusculas = nombre.lower()

    try:
        if minusculas.endswith(".pptx"):
            texto = _texto_de_pptx(contenido)
        elif minusculas.endswith(".pdf"):
            texto = _texto_de_pdf(contenido)
        elif minusculas.endswith(".docx"):
            from bitacora.transcripcion.lectura import texto_de_archivo

            texto = texto_de_archivo(nombre, contenido)
        elif minusculas.endswith((".txt", ".md")):
            texto = contenido.decode("utf-8", errors="replace")
        else:
            return ""
    except Exception as fallo:  # noqa: BLE001
        registro.warning("material de apoyo ilegible nombre=%s tipo=%s", minusculas[-8:], type(fallo).__name__)
        return ""

    return texto.strip()[:CARACTERES_POR_ARCHIVO]
