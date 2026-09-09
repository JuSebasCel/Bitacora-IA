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


@dataclass(frozen=True)
class PropuestaDeTema:
    """Tema que el análisis quiso usar y no está en el pool: va a curaduría, no a `temas`."""

    nombre: str
    justificacion: str
