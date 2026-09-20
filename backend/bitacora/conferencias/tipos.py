"""
Tipos del dominio de conferencias y fichas, del lado del backend.

Los literales de abajo aparecen tres veces en el proyecto: en el `check` de
`supabase/migrations/20260814032437_esquema_propio.sql`, en las uniones de
`frontend/src/features/conferencias/data/tipos.ts` y aquí. No hay forma de
generarlos desde una sola fuente sin meter un generador de código en un
proyecto de este tamaño, así que en su lugar hay una prueba
(`tests/test_contrato_de_dominio.py`) que lee la migración y el archivo de
TypeScript y falla si los tres se desalinean. La duplicación es aceptable
cuando está custodiada; sin custodia, no lo sería.

Los nombres de campo van en snake_case y con la ortografía EXACTA de las
columnas de Postgres (`segundo_inicio`, `id_tema`, `tipo_de_unidad`) y no en
camelCase como el frontend: quien traduce entre las dos convenciones es el
cliente de Supabase del navegador, no este backend, que escribe directo sobre
la tabla. Un `dict(asdict(ficha))` tiene que ser insertable tal cual.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, get_args

EstadoDeProcesamiento = Literal["en-cola", "procesando", "procesada", "fallida"]

TipoDeUnidad = Literal[
    "cita-textual",
    "metodo",
    "estrategia",
    "postura",
    "dato-de-impacto",
    "fase-del-trabajo",
]

EstadoDeValidacion = Literal["validada", "pendiente", "automatica"]

FuenteDeConferencia = Literal["audio", "transcripcion"]

ESTADOS_DE_PROCESAMIENTO: tuple[str, ...] = get_args(EstadoDeProcesamiento)
TIPOS_DE_UNIDAD: tuple[str, ...] = get_args(TipoDeUnidad)
ESTADOS_DE_VALIDACION: tuple[str, ...] = get_args(EstadoDeValidacion)
FUENTES_DE_CONFERENCIA: tuple[str, ...] = get_args(FuenteDeConferencia)


@dataclass(frozen=True)
class Tema:
    """Tema del pool curado (`temas`). El backend nunca inserta aquí: solo propone."""

    id: str
    nombre: str


@dataclass(frozen=True)
class Conferencia:
    id: str
    titulo: str
    ponente: str
    evento: str
    codigo_de_evento: str
    fecha_del_evento: str
    duracion_en_segundos: int
    """
    Cuantas fichas pidio quien cargo la charla. `None` es sin limite.

    Es una PETICION, no una garantia: el pipeline la recorta contra la duracion
    real, que no se conoce hasta despues de transcribir.
    """
    maximo_de_fichas: int | None
    id_dueno: str
    estado: str
    fuente: str
    resumen: str
    id_tema_principal: str | None


@dataclass(frozen=True)
class Segmento:
    """
    Un tramo de habla con su coordenada real en la fuente.

    `estimado` marca los segmentos cuyo tiempo NO viene del audio sino de un
    reparto proporcional sobre una transcripción sin marcas (ver
    `transcripcion/segmentos.py`). Viaja hasta la ficha porque cambia la regla
    de validación: una coordenada estimada nunca puede quedar en `automatica`,
    por más segura que esté la clasificación. Sin este campo, la única forma de
    saberlo después sería adivinar, y la trazabilidad al segundo dejaría de
    significar lo mismo en todas las fichas del catálogo.
    """

    inicio: int
    fin: int
    texto: str
    hablante: str | None = None
    estimado: bool = False


@dataclass(frozen=True)
class Ficha:
    """
    Ficha lista para insertar en `fichas`. Los nombres son los de las columnas.

    No lleva `id`: lo genera Postgres (`gen_random_uuid()`). Que el backend
    invente el uuid ahorraría un viaje de vuelta, pero también permitiría
    reinsertar la misma ficha dos veces con el mismo id tras un reintento a
    medias, y la tabla no tiene ninguna restricción que lo frene.
    """

    id_conferencia: str
    fragmento: str
    hablante: str
    segundo_inicio: int
    segundo_fin: int
    id_tema: str
    tipo_de_unidad: str
    estado_de_validacion: str
    confianza_automatica: float
    contexto_minimo: str
    """
    Nombre del tema que el análisis quiso usar cuando todavía no existía.

    No es una columna: la ficha nace antes de que el tema exista, porque el
    id solo aparece al crearlo. El pipeline crea los temas que falten, resuelve
    estas fichas contra ellos y deja el campo vacío antes de guardar. Que llegue
    con contenido a la escritura significa que quedó un tema sin crear.
    """
    nombre_de_tema_nuevo: str = ""
    """
    Cuanto sostiene esta unidad el argumento de la charla, de 0 a 1.

    La prueba que la define: si alguien leyera solo las unidades de relevancia
    alta, sin escuchar la charla, deberia entender que defiende quien habla y
    por que. Alto es la tesis, el razonamiento que la sostiene, los hallazgos
    que la respaldan y los limites que el ponente reconoce; bajo es lo que se
    puede quitar sin que el argumento cambie.

    NO es "que tan citable suena". Una frase lucida que no afirma nada -- "el
    dato es el nuevo petroleo" -- es muy citable y no aporta, asi que va baja.
    Medir citabilidad llenaria el catalogo de titulares y lo dejaria sin tesis.

    Tampoco se reusa `confianza_automatica`, aunque parezca lo mismo: esa mide
    la certeza sobre el TIPO Y EL TEMA asignados. Una cifra suelta es trivial
    de clasificar y puede ser irrelevante; una postura matizada baja la
    confianza justamente por ser rica. Recortar por confianza dejaria lo mas
    facil de etiquetar, no lo que mas dice.

    Sirve para decidir cuales sobreviven cuando se pidio un maximo, y no se
    guarda: es un criterio de seleccion, no un dato de la ficha.
    """
    relevancia: float = 0.0


"""
Campos de `Ficha` que viajan con ella pero no son columnas de `fichas`.

`asdict(ficha)` se inserta tal cual, asi que cualquier campo de transporte
tiene que salir antes de escribir. Vive aqui, junto al tipo, para que quien
agregue otro campo asi lo anote en el mismo sitio en que lo declara.
"""
CAMPOS_QUE_NO_SON_COLUMNAS = frozenset({"nombre_de_tema_nuevo", "relevancia"})


def fila_de_ficha(ficha: Ficha) -> dict[str, object]:
    """La ficha como fila de `fichas`, sin sus campos de transporte."""
    from dataclasses import asdict

    return {
        clave: valor
        for clave, valor in asdict(ficha).items()
        if clave not in CAMPOS_QUE_NO_SON_COLUMNAS
    }


@dataclass(frozen=True)
class PropuestaDeTema:
    """
    Tema que el análisis creó porque ninguno de los existentes encajaba.

    Sigue registrándose para que la curaduría pueda revisar lo que el análisis
    decidió por su cuenta —fusionar dos que significan lo mismo, renombrar uno
    demasiado específico—. Lo que ya no hace es bloquear: el tema se crea y la
    ficha lo usa en el momento.
    """

    nombre: str
    justificacion: str
