import type { Conferencia, Ficha } from '@/features/conferencias/data'
import { generarVistaPrevia } from '@/features/plantillas/editor/generarVistaPrevia'
import { sustituirContenidoDePlantilla } from '@/features/plantillas/editor/sustituirContenidoDePlantilla'
import type { JSONContent, Plantilla } from '@/features/plantillas/data'
import { mapearConferenciaACampos } from './mapeo'

/*
  Orquesta la generación de una memoria: mapea la conferencia elegida a datos
  reales de los cinco campos fijos (`mapeo.ts`) y corre el motor de
  sustitución que corresponda según el origen de la plantilla. Nunca es el
  documento congelado — `useMemorias.ts` guarda solo la referencia
  (`idConferencia`/`idPlantilla`) y vuelve a llamar esta función cada vez que
  se abre una memoria (ver el plan del módulo).
*/
export type ResultadoDeMemoria =
  | { readonly origen: 'docx'; readonly blob: Blob }
  | { readonly origen: 'blanco'; readonly contenido: JSONContent }

export async function generarMemoria(
  plantilla: Plantilla,
  conferencia: Conferencia,
  fichas: readonly Ficha[],
): Promise<ResultadoDeMemoria> {
  const datosReales = mapearConferenciaACampos(conferencia, fichas)

  if (plantilla.origen === 'docx') {
    const blob = await generarVistaPrevia(plantilla.archivoOriginal, plantilla.marcadores, datosReales)
    return { origen: 'docx', blob }
  }

  return { origen: 'blanco', contenido: sustituirContenidoDePlantilla(plantilla.contenido, datosReales) }
}
