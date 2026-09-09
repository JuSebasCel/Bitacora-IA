"""
Las indicaciones que recibe el modelo en el análisis de discurso.

Viven aparte de la llamada porque son la parte que se ajusta a mano y se lee
seguido, y porque así se pueden comprobar en la suite —que la definición de
cada tipo de unidad esté presente, que la lista de temas sea la del pool y no
una inventada— sin llamar a OpenAI.

La instrucción central es negativa: el modelo no redacta ni resume, RECORTA.
Todo lo que aparezca en `fragmento` tiene que estar en el texto que se le dio.
Un modelo que parafrasea produce fichas que suenan bien y no son citables, y
el catálogo entero se apoya en que lo que dice una ficha se dijo así.
"""

from __future__ import annotations

from typing import Sequence

from bitacora.conferencias.tipos import Tema

DEFINICIONES_DE_TIPO: dict[str, str] = {
    "cita-textual": (
        "una frase memorable dicha tal cual, que valga la pena citar entre comillas"
    ),
    "metodo": "un procedimiento, técnica o herramienta que se explica cómo se usa",
    "estrategia": "una decisión de enfoque o de priorización, y por qué se tomó",
    "postura": "una opinión o posición que el hablante defiende, no un hecho",
    "dato-de-impacto": (
        "una cifra, medición o resultado concreto sobre efecto en industria, "
        "investigación o personas"
    ),
    "fase-del-trabajo": (
        "una etapa del proceso descrito (recolección, entrenamiento, despliegue, "
        "evaluación, etc.)"
    ),
}

INSTRUCCION_DEL_SISTEMA = """\
Eres un analista de discurso que cataloga conferencias técnicas para un grupo \
de investigación. Trabajas en español.

Tu trabajo es RECORTAR, no redactar. Recibes un tramo de transcripción con la \
coordenada en segundos al inicio de cada línea y devuelves las unidades \
atómicas de discurso que contiene.

Reglas que no puedes romper:

1. El campo `fragmento` debe ser texto que aparece literalmente en el tramo \
que recibiste. No lo parafrasees, no lo completes, no lo corrijas. Si una \
unidad no se puede recortar sin reescribirla, no la incluyas.
2. `segundo_inicio` y `segundo_fin` se copian de las marcas [inicio-fin] de \
las líneas de las que sale el fragmento. Nunca los estimes.
3. Una unidad es atómica: una idea, una cita, un dato. Si necesitas la palabra \
"y" para unir dos cosas distintas, son dos unidades.
4. `tema` debe ser uno de los temas de la lista que se te da, copiado exacto. \
Solo si ninguno describe la unidad, propones uno nuevo y explicas en \
`justificacion_del_tema` por qué ninguno de los de la lista servía.
5. `confianza` es tu certeza real sobre la clasificación (tipo y tema), de 0 a \
1. No la infles: una confianza honesta y baja manda la ficha a revisión \
humana, que es donde debe ir.
6. Saludos, agradecimientos, logística del evento y preguntas del público sin \
contenido propio no son unidades. Prefiere devolver pocas y buenas.

Devuelves un objeto JSON con una única clave `fichas`, cuyo valor es la lista \
de unidades encontradas. Si el tramo no tiene ninguna, devuelves una lista \
vacía."""


def _lista_de_tipos() -> str:
    return "\n".join(
        f"- {tipo}: {definicion}" for tipo, definicion in DEFINICIONES_DE_TIPO.items()
    )


def _lista_de_temas(temas: Sequence[Tema]) -> str:
    return "\n".join(f"- {tema.nombre}" for tema in temas)


def indicacion_de_analisis(
    titulo: str,
    ponente: str,
    evento: str,
    temas: Sequence[Tema],
    tramo: str,
) -> str:
    """
    El título, ponente y evento van en la indicación aunque no se clasifiquen.

    Sin ellos, el modelo no tiene forma de distinguir a quién atribuir una
    frase en una charla donde el transcriptor no marcó hablantes, ni de saber
    qué cuenta como "dato de impacto" en el dominio de la charla. Son el
    contexto mínimo que un analista humano tendría delante antes de empezar.
    """
    return f"""\
Conferencia: «{titulo}»
Ponente principal: {ponente}
Evento: {evento}

Tipos de unidad admitidos (usa el identificador exacto):
{_lista_de_tipos()}

Temas disponibles en la taxonomía (copia el nombre exacto):
{_lista_de_temas(temas)}

Cada objeto de `fichas` tiene esta forma:
{{"fragmento": "...", "tipo_de_unidad": "...", "tema": "...", \
"justificacion_del_tema": "", "hablante": "...", "segundo_inicio": 0, \
"segundo_fin": 0, "confianza": 0.0}}

Tramo de la transcripción:
{tramo}"""
