/*
  Cuánto ha avanzado la "generación" simulada de una memoria recién creada, a
  partir de cuánto tiempo real pasó desde `generadaEl` — mismo criterio que
  `conferencias/carga/progreso.ts` para el procesamiento simulado de una
  conferencia recién cargada: tiempo real, no un fixture, porque es una
  animación en vivo de la tarjeta, no un dato que deba ser reproducible entre
  corridas de prueba.

  Sin generación real detrás todavía: cuando exista (B9, ver PRD.md), esta
  duración fija se sustituye por el avance real de esa generación.
*/
export const DURACION_GENERACION_SIMULADA_MS = 2500

export function progresoDeGeneracion(generadaEl: string, ahoraMs: number): number {
  const transcurrido = ahoraMs - new Date(generadaEl).getTime()

  if (transcurrido <= 0) {
    return 0
  }

  if (transcurrido >= DURACION_GENERACION_SIMULADA_MS) {
    return 100
  }

  return Math.round((transcurrido / DURACION_GENERACION_SIMULADA_MS) * 100)
}
