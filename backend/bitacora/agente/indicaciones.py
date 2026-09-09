"""
Las dos indicaciones del agente, separadas a propósito.

Una sola llamada que buscara y respondiera a la vez ahorraría medio segundo y
haría imposible lo que sostiene al producto: entre las dos llamadas ocurre la
recuperación REAL contra Supabase, con RLS aplicando. Si el modelo hiciera las
dos cosas de corrido, lo que citara saldría de su memoria y no del catálogo, y
no habría forma de distinguir una cosa de la otra mirando la respuesta.

Primera llamada: pregunta -> filtros estructurados. Segunda: fichas reales ->
respuesta. La segunda nunca ve la pregunta sin las fichas delante.
"""

from __future__ import annotations

from typing import Sequence

from bitacora.analisis.indicaciones import DEFINICIONES_DE_TIPO
from bitacora.conferencias.tipos import ESTADOS_DE_VALIDACION, Tema

INSTRUCCION_DE_FILTROS = """\
Traduces preguntas en español sobre un catálogo de fichas de conferencias a \
filtros estructurados. No respondes la pregunta: solo dices cómo buscarla.

Devuelves un objeto JSON con estas claves, todas opcionales salvo \
`palabras_clave`:

- `palabras_clave`: lista de las palabras de contenido de la pregunta, sin \
muletillas ni conectores. Es lo que se buscará dentro de los fragmentos.
- `tema`: uno de los temas de la lista que se te da, copiado exacto, solo si \
la pregunta claramente pide ese tema. Si dudas, omítelo.
- `tipo_de_unidad`: uno de los identificadores de tipo de la lista, solo si la \
pregunta pide ese tipo de contenido.
- `evento`: uno de los eventos de la lista, solo si la pregunta lo nombra.
- `estado_de_validacion`: solo si la pregunta lo pide explícitamente.
- `cantidad`: cuántas fichas pidió la persona, si dio un número.

Omitir un filtro busca más ampliamente; inventarlo devuelve resultados que la \
persona no pidió. Ante la duda, omite."""

INSTRUCCION_DE_SINTESIS = """\
Respondes preguntas sobre un catálogo de conferencias técnicas, en español, \
usando ÚNICAMENTE las fichas que se te dan.

Reglas que no puedes romper:

1. No aportas ningún dato, nombre, cifra o afirmación que no esté en las \
fichas de abajo. No completas con lo que sabes del tema: si las fichas no lo \
dicen, no se dice.
2. Cada afirmación de tu respuesta sale de al menos una ficha, y el id de esa \
ficha va en `ids_citados`. Un id que no esté en la lista de fichas no es un id \
válido.
3. Si las fichas no responden la pregunta, lo dices. Es una respuesta \
aceptable y frecuente; inventar para quedar bien no lo es.
4. No repites los fragmentos completos: la interfaz muestra cada ficha citada \
debajo de tu respuesta. Sintetiza qué dicen en conjunto, en pocas frases.
5. Atribuyes cada idea a quien la dijo, tal como aparece en la ficha, nunca \
al ponente principal por defecto.

Devuelves un objeto JSON con `respuesta` (texto) e `ids_citados` (lista de \
ids de las fichas que sostienen tu respuesta)."""


def indicacion_de_filtros(
    pregunta: str,
    temas: Sequence[Tema],
    eventos: Sequence[str],
) -> str:
    temas_texto = "\n".join(f"- {tema.nombre}" for tema in temas) or "- (ninguno todavía)"
    eventos_texto = "\n".join(f"- {evento}" for evento in eventos) or "- (ninguno todavía)"
    tipos_texto = "\n".join(
        f"- {tipo}: {definicion}" for tipo, definicion in DEFINICIONES_DE_TIPO.items()
    )

    return f"""\
Temas disponibles:
{temas_texto}

Eventos disponibles:
{eventos_texto}

Tipos de unidad:
{tipos_texto}

Estados de validación: {", ".join(ESTADOS_DE_VALIDACION)}

Pregunta: {pregunta}"""


def indicacion_de_sintesis(pregunta: str, fichas: str) -> str:
    return f"""\
Pregunta: {pregunta}

Fichas recuperadas del catálogo (son todas las que hay para esta pregunta):

{fichas}"""
