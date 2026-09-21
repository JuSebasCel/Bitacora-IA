"""
Memorias: redactar los huecos de una plantilla y convertir el resultado a PDF.

El llenado del `.docx` no vive aquí: lo hace el frontend con `docx-templates`,
que ya sabía reconocer los `[[marcadores]]` aunque Word los parta en varios
fragmentos. Reescribirlo en Python habría sido duplicar lo más delicado del
proceso. Este módulo hace las dos cosas que el navegador no puede: llamar al
modelo con la clave de la persona, y convertir a PDF con LibreOffice.
"""
