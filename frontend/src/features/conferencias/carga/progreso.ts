/*
  Cuánto ha avanzado el "procesamiento" simulado de una conferencia recién
  cargada, a partir de cuánto tiempo real pasó desde que se subió.

  A diferencia del resto del proyecto, aquí sí se usa tiempo real (no un
  fixture): es una animación en vivo del listado, no un dato que deba ser
  reproducible entre corridas de prueba.
*/
export const DURACION_PROCESAMIENTO_MS = 6000

export function progresoDe(cargadaEl: string, ahoraMs: number): number {
  const transcurrido = ahoraMs - new Date(cargadaEl).getTime()

  if (transcurrido <= 0) {
    return 0
  }

  if (transcurrido >= DURACION_PROCESAMIENTO_MS) {
    return 100
  }

  return Math.round((transcurrido / DURACION_PROCESAMIENTO_MS) * 100)
}
