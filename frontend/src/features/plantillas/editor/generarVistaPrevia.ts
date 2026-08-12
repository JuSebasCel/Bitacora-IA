import { createReport } from 'docx-templates'
import JSZip from 'jszip'
import type { MarcadorDeDocx } from '../data'
import { prepararComandos } from './prepararComandos'

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

async function dataUrlAArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
  const respuesta = await fetch(dataUrl)
  return respuesta.arrayBuffer()
}

/*
  Genera el `.docx` final: el original se lee intacto, solo se reescribe el
  texto de `word/document.xml` donde vivían las marcas `[[...]]`
  (`prepararComandos`), y `docx-templates` sustituye esos comandos por los
  datos de ejemplo preservando el resto del paquete (estilos, encabezados,
  imágenes, tablas) byte a byte. Nunca se muta `archivoOriginal`: cada
  llamada parte de él de nuevo.
*/
export async function generarVistaPrevia(
  archivoOriginal: string,
  marcadores: readonly MarcadorDeDocx[],
): Promise<Blob> {
  const bufferOriginal = await dataUrlAArrayBuffer(archivoOriginal)
  const zip = await JSZip.loadAsync(bufferOriginal)

  const documentXmlOriginal = await zip.file('word/document.xml')?.async('string')
  if (documentXmlOriginal === undefined) {
    throw new Error('El .docx no tiene un word/document.xml válido')
  }

  const { documentXml, datos } = prepararComandos(documentXmlOriginal, marcadores)
  zip.file('word/document.xml', documentXml)

  const bufferDeComandos = await zip.generateAsync({ type: 'arraybuffer' })

  const resultado = await createReport({
    template: new Uint8Array(bufferDeComandos),
    data: datos,
    cmdDelimiter: ['[[', ']]'],
    /*
      Bajo el empaquetado de Vite, la detección de entorno de `docx-templates`
      cae al sandbox de Node (`vm.Script`, que Vite deja como un stub roto
      para el navegador) en vez del sandbox de iframe que usa por defecto en
      una pestaña normal. Se desactiva explícitamente: los únicos "comandos"
      que evalúa son los que genera `prepararComandos.ts` (nombres de
      variable propios, nunca texto que haya escrito la persona usuaria), así
      que no hay superficie de inyección que el sandbox estuviera protegiendo
      aquí.
    */
    noSandbox: true,
  })

  return new Blob([resultado as BlobPart], { type: TIPO_MIME_DOCX })
}
