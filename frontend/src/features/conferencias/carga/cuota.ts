/*
  Cuántas fichas se pueden pedir para una charla.

  El techo sale de la duración porque es lo único que acota de verdad cuánto
  material citable hay: una charla de dos minutos no tiene ciento veinte cosas
  que valga la pena citar, por bien que hable quien la da. Ofrecer ese número
  sería prometer algo que el análisis solo podría cumplir troceando —que es
  exactamente el defecto que acabamos de corregir— o inventando.

  **0,75 fichas por minuto.** Sale de la propia instrucción del análisis, que
  dice que una charla de una hora rara vez tiene más de treinta o cuarenta
  cosas citables. Se deja un poco por encima de esa cuenta para que el techo
  sea un límite y no una meta: quien quiera más denso puede pedirlo, y el
  recorte por relevancia decide qué sobrevive.

  El suelo de tres existe para que una charla muy corta siga teniendo algo que
  elegir en vez de un control con una sola opción.
*/

const FICHAS_POR_MINUTO = 0.75
const MINIMO = 3
/* Ninguna charla razonable llega aquí; está para que un dato corrupto no pida diez mil. */
const TECHO_ABSOLUTO = 150

export function maximoDeFichasPara(duracionEnSegundos: number): number {
  const minutos = duracionEnSegundos / 60
  const porDuracion = Math.round(minutos * FICHAS_POR_MINUTO)

  return Math.min(TECHO_ABSOLUTO, Math.max(MINIMO, porDuracion))
}

export type Densidad = 'pocas' | 'equilibrado' | 'muchas' | 'libre'

/*
  Las opciones se expresan como fracción del techo y no como números fijos:
  "pocas" tiene que significar algo distinto en una charla de diez minutos y
  en una de dos horas, y un número fijo las volvería la misma cosa.
*/
const FRACCION: Record<Exclude<Densidad, 'libre'>, number> = {
  pocas: 0.35,
  equilibrado: 0.65,
  muchas: 1,
}

/** `null` cuando se deja libre: el análisis devuelve lo que encuentre. */
export function fichasPedidas(densidad: Densidad, duracionEnSegundos: number): number | null {
  if (densidad === 'libre') {
    return null
  }

  const techo = maximoDeFichasPara(duracionEnSegundos)

  return Math.max(MINIMO, Math.round(techo * FRACCION[densidad]))
}
