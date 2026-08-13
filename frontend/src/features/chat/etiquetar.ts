import type { FichaDelCatalogo } from '@/features/conferencias/query'

/*
  Agrupar y etiquetar: no es un concepto nuevo del chat, reutiliza el sistema
  de etiquetas personales que ya existe desde F2 (`conferencias/tags`). Lo
  único que aporta este archivo es traducir "estas fichas citadas" a "estas
  conferencias" — una etiqueta marca la conferencia de origen, no la ficha
  puntual, porque el modelo de `Etiqueta` no baja a ese nivel.
*/

/** Ids de conferencia distintos entre las fichas citadas, una sola vez cada uno. */
export function idsDeConferenciasCitadas(
  idsFichasCitadas: readonly string[],
  entradas: readonly FichaDelCatalogo[],
): readonly string[] {
  const idsFichas = new Set(idsFichasCitadas)
  const idsConferencias = new Set(
    entradas.filter((entrada) => idsFichas.has(entrada.ficha.id)).map((entrada) => entrada.conferencia.id),
  )

  return [...idsConferencias]
}

/*
  Reconocimiento de patrón en texto libre, best-effort y no comprensión real
  del lenguaje (mismo criterio honesto que `cantidad.ts`): "etiqueta esto
  como 'X'", "agrupa las fichas en 'X'". El botón explícito en la interfaz es
  el camino confiable; esto es un atajo, no el único modo de llegar.
*/
const PATRON_DE_COMANDO =
  /(?:etiqueta(?:r)?|agrupa(?:r)?)\s+(?:esto|estas fichas|las fichas)?\s*(?:como|en|bajo)\s*["“]([^"”]+)["”]/i

export function comandoDeEtiquetaEn(texto: string): string | null {
  const coincidencia = texto.match(PATRON_DE_COMANDO)
  const nombre = coincidencia?.[1]?.trim()

  return nombre !== undefined && nombre.length > 0 ? nombre : null
}
