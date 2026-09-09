"""
Lectura y validación de la configuración por entorno.

Mismo criterio que `frontend/src/shared/supabase/configuracion.ts`: se falla
rápido, al arrancar, con un mensaje que dice exactamente qué variable falta y
dónde completarla — en vez de dejar que el primer request muera con un
`NoneType is not subscriptable` a tres capas de profundidad. Y por eso
`leer_configuracion` recibe el entorno como parámetro en vez de leer
`os.environ` por dentro: así se prueba sin ensuciar el entorno del proceso.

Los identificadores de modelo NO se incrustan en el código: OpenAI los renombra
y deprecia a su ritmo, y una charla que deja de procesarse porque el modelo
del código murió no debería exigir un despliegue. Van con un valor por defecto
vigente y una variable de entorno que lo sobreescribe.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

"""
`whisper-1` y no un modelo de transcripción más nuevo: la trazabilidad al
segundo es un requisito no funcional duro del producto (README, "coordenada
exacta"), y whisper es el único endpoint de transcripción de OpenAI que
devuelve `verbose_json` con los segmentos y sus tiempos. Los modelos
`gpt-4o-*-transcribe` transcriben mejor pero devuelven solo texto: usarlos
obligaría a inventar las coordenadas, que es exactamente lo que el producto no
puede permitirse. Si algún día publican tiempos, basta cambiar la variable.
"""
MODELO_DE_TRANSCRIPCION_POR_DEFECTO = "whisper-1"

"""
El análisis de discurso decide clasificaciones que después alguien valida a
mano: se paga un modelo grande. El agente conversacional solo traduce una
pregunta a filtros y redacta sobre fichas ya recuperadas —trabajo acotado y
verificado después contra las fichas reales—, así que ahí un modelo pequeño
cuesta menos y responde antes.
"""
MODELO_DE_ANALISIS_POR_DEFECTO = "gpt-4.1"
MODELO_DE_AGENTE_POR_DEFECTO = "gpt-4.1-mini"

ORIGENES_PERMITIDOS_POR_DEFECTO = "http://localhost:5173"


@dataclass(frozen=True)
class Configuracion:
    """
    `supabase_anon_key` y no una service-role key, a propósito y sin excepción.

    Todo este backend consulta Supabase con el token del usuario que hizo la
    petición, montado sobre la anon key, de modo que RLS sigue aplicando fila
    por fila igual que cuando el frontend consulta directo. Una service-role
    key convertiría cada endpoint en un agujero que ve el catálogo entero de
    todo el grupo, y el aislamiento del proyecto vive en RLS y en ningún otro
    lado (`supabase/migrations/…_esquema_propio.sql`).
    """

    supabase_url: str
    supabase_anon_key: str
    modelo_de_transcripcion: str
    modelo_de_analisis: str
    modelo_de_agente: str
    origenes_permitidos: tuple[str, ...]


def _requerida(entorno: Mapping[str, str], nombre: str) -> str:
    valor = entorno.get(nombre)

    if valor is None or valor.strip() == "":
        raise RuntimeError(
            f"Falta la variable de entorno {nombre}. Revisa backend/.env "
            f"(ver backend/.env.example) o las variables de entorno del despliegue."
        )

    return valor.strip()


def _opcional(entorno: Mapping[str, str], nombre: str, por_defecto: str) -> str:
    valor = entorno.get(nombre)

    return por_defecto if valor is None or valor.strip() == "" else valor.strip()


def leer_configuracion(entorno: Mapping[str, str]) -> Configuracion:
    origenes = _opcional(entorno, "BITACORA_ORIGENES_PERMITIDOS", ORIGENES_PERMITIDOS_POR_DEFECTO)

    return Configuracion(
        supabase_url=_requerida(entorno, "SUPABASE_URL"),
        supabase_anon_key=_requerida(entorno, "SUPABASE_ANON_KEY"),
        modelo_de_transcripcion=_opcional(
            entorno, "OPENAI_MODELO_TRANSCRIPCION", MODELO_DE_TRANSCRIPCION_POR_DEFECTO
        ),
        modelo_de_analisis=_opcional(
            entorno, "OPENAI_MODELO_ANALISIS", MODELO_DE_ANALISIS_POR_DEFECTO
        ),
        modelo_de_agente=_opcional(
            entorno, "OPENAI_MODELO_AGENTE", MODELO_DE_AGENTE_POR_DEFECTO
        ),
        origenes_permitidos=tuple(
            origen.strip() for origen in origenes.split(",") if origen.strip() != ""
        ),
    )
