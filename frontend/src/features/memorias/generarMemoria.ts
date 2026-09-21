import type { Conferencia, Ficha } from '@/features/conferencias/data'
import { generarVistaPrevia } from '@/features/plantillas/editor/generarVistaPrevia'
import type { Plantilla } from '@/features/plantillas/data'
import type { Tema } from '@/features/taxonomia'
import { mapearConferenciaACampos } from './mapeo'

/*
  Orquesta la generación de una memoria: mapea la conferencia elegida a datos
  reales de los cinco campos fijos (`mapeo.ts`) y corre el motor de
  sustitución que corresponda según el origen de la plantilla. Nunca es el
  documento congelado — la tabla `memorias` guarda solo la referencia
  (`idConferencia`/`idPlantilla`) y esta función vuelve a correr cada vez que
  se abre una memoria (ver el plan del módulo).

  Los bytes del `.docx` entran por parámetro y no se buscan aquí: desde B6
  viven en el bucket `plantillas-docx` y quien los descarga es la pantalla,
  que es la única que puede decidir qué mostrar mientras llegan y qué decir si
  no llegan. Esta función sigue sin saber que existe Supabase.
*/
export type ResultadoDeMemoria = { readonly origen: 'docx'; readonly blob: Blob }

export async function generarMemoria(
  plantilla: Plantilla,
  conferencia: Conferencia,
  fichas: readonly Ficha[],
  temas: readonly Tema[],
  bytesDelDocx: ArrayBuffer | null,
  /* Lo que la IA escribió al generarla. Ausente en memorias anteriores a la redacción con IA. */
  secciones?: Readonly<Record<string, string | null>>,
): Promise<ResultadoDeMemoria> {
  const datosReales = mapearConferenciaACampos(conferencia, fichas, temas)

  /*
    Llegar aquí sin bytes es un error de programación de quien llama (pidió
    generar sobre una plantilla importada sin haber descargado su archivo),
    no un desenlace que la persona pueda arreglar. Se rechaza igual que un
    `.docx` corrupto: la pantalla ya traduce cualquier rechazo de esta
    promesa a `MEM_FALLO_GENERACION`.
  */
  if (bytesDelDocx === null) {
    throw new Error('Falta el archivo original de la plantilla importada')
  }

  const blob = await generarVistaPrevia(bytesDelDocx, plantilla.marcadores, datosReales, secciones)
  return { origen: 'docx', blob }
}
