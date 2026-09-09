import { createReport } from 'docx-templates'
import JSZip from 'jszip'
import type { MarcadorDeDocx, RegistroDeDatosDeCampo } from '../data'
import { prepararComandos } from './prepararComandos'

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/*
  Genera el `.docx` final: el original se lee intacto, solo se reescribe el
  texto de `word/document.xml` donde vivían las marcas `[[...]]`
  (`prepararComandos`), y `docx-templates` sustituye esos comandos por los
  datos de ejemplo preservando el resto del paquete (estilos, encabezados,
  imágenes, tablas) byte a byte. Nunca se mutan los bytes originales: cada
  llamada parte de ellos de nuevo.

  Recibe los bytes y no la ruta ni una data URL: de dónde salen (antes
  `sessionStorage`, desde B6 una descarga del bucket `plantillas-docx`) es
  decisión de quien llama, y esta función no tiene por qué saber que existe
  Supabase para seguir siendo probable contra el `.docx` versionado en
  `tests/fixtures/`.
*/
export async function generarVistaPrevia(
  bytesDelOriginal: ArrayBuffer,
  marcadores: readonly MarcadorDeDocx[],
  datosReales?: RegistroDeDatosDeCampo,
): Promise<Blob> {
  const zip = await JSZip.loadAsync(bytesDelOriginal)

  const documentXmlOriginal = await zip.file('word/document.xml')?.async('string')
  if (documentXmlOriginal === undefined) {
    throw new Error('El .docx no tiene un word/document.xml válido')
  }

  const { documentXml, datos } = prepararComandos(documentXmlOriginal, marcadores, datosReales)
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
