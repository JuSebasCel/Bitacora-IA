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
coordenada en segundos al inicio de cada línea y devuelves las \nunidades de discurso citables que contiene.

Reglas que no puedes romper:

1. El campo `fragmento` debe ser texto que aparece literalmente en el tramo \
que recibiste. No lo parafrasees, no lo completes, no lo corrijas. Si una \
unidad no se puede recortar sin reescribirla, no la incluyas.
2. LA PRUEBA QUE MANDA SOBRE TODAS: si lees el `fragmento` suelto, fuera de \
esta charla, tiene que entenderse solo. "con radioactividad", "las sembraron" \
o "para evitar digamos" no son unidades: son trozos de una frase. Una unidad \
es una afirmación completa, con sujeto y verbo, que alguien podría citar en un \
artículo sin añadirle nada. Si al leerla suelta hay que preguntar "¿de qué \
está hablando?", no la incluyas.
3. Un fragmento CASI SIEMPRE ABARCA VARIAS LÍNEAS SEGUIDAS del tramo. Las \
líneas vienen cortadas por pausas al hablar, no por ideas: una idea suele \
ocupar entre tres y diez líneas. Únelas en un solo `fragmento`, con \
`segundo_inicio` de la primera línea y `segundo_fin` de la última. Nunca \
estimes esos números: cópialos de las marcas [inicio-fin].
4. Una unidad es una idea completa, no la porción más pequeña que puedas \
recortar. Si dudas entre devolver una unidad larga o tres cortas que dicen lo \
mismo por partes, devuelve la larga. Cortar de más es el error más caro: deja \
el catálogo lleno de frases que nadie puede citar.
5. Sé exigente con qué merece ser una unidad. Una charla de una hora rara vez \
tiene más de treinta o cuarenta cosas que valga la pena citar. Si de un tramo \
te salen más de cinco o seis, es que estás recortando de más: quédate con las \
que un investigador citaría de verdad y descarta el relleno.
6. `tema` debe ser uno de los temas de la lista que se te da, copiado exacto. \
Solo si ninguno describe la unidad, propones uno nuevo y explicas en \
`justificacion_del_tema` por qué ninguno de los de la lista servía. La lista \
puede llegar vacía: entonces los propones todos tú.
7. Un tema es una CATEGORÍA AMPLIA bajo la que caben muchas charlas distintas, \
no el asunto concreto de esta. "Inteligencia artificial", "Salud pública" o \
"Educación" son temas; "Sesgos en modelos de predicción de deserción \
estudiantil" no lo es — eso es el título de una charla. Antes de proponer uno \
nuevo, mira si alguno de la lista lo engloba, y úsalo si es así: es mejor un \
tema amplio compartido por veinte charlas que veinte temas de una charla cada \
uno. Escríbelo en singular y con mayúscula inicial.
8. `confianza` es tu certeza real sobre la clasificación (tipo y tema), de 0 a \
1. No la infles: una confianza honesta y baja manda la ficha a revisión \
humana, que es donde debe ir.
9. Saludos, agradecimientos, logística del evento, muletillas y preguntas del \
público sin contenido propio no son unidades. Prefiere devolver pocas y buenas.

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
