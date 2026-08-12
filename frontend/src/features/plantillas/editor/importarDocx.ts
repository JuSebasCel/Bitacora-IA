import JSZip from 'jszip'
import { TAMANO_MAXIMO_DE_DOCX_MB } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { MarcadorDeDocx } from '../data'
import { detectarMarcadoresEnDocx } from './detectarMarcadoresEnDocx'

export type ResultadoImportarDocx =
  | { readonly ok: true; readonly archivoOriginal: string; readonly marcadores: readonly MarcadorDeDocx[] }
  | { readonly ok: false; readonly codigo: CodigoError }

const TIPO_MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function validarDocx(archivo: File): { ok: true } | { ok: false; codigo: CodigoError } {
  const esDocx = archivo.name.toLowerCase().endsWith('.docx') || archivo.type === TIPO_MIME_DOCX

  if (!esDocx) {
    return { ok: false, codigo: 'PLANT_DOCX_NO_SOPORTADO' }
  }

  if (archivo.size > TAMANO_MAXIMO_DE_DOCX_MB * 1024 * 1024) {
    return { ok: false, codigo: 'PLANT_DOCX_MUY_GRANDE' }
  }

  return { ok: true }
}

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No se pudo leer el archivo'))
    lector.onload = () => {
      if (typeof lector.result === 'string') {
        resolve(lector.result)
      } else {
        reject(new Error('No se pudo leer el archivo'))
      }
    }
    lector.readAsDataURL(archivo)
  })
}

/*
  El `.docx` subido se conserva intacto: esta función solo lo valida, lo
  guarda como data URL, y lee sus placeholders `[[...]]` directamente del
  XML crudo (`detectarMarcadoresEnDocx`) — nunca lo convierte a otro
  formato ni lo reconstruye. El diseño hecho en Word queda exactamente
  igual; lo único que la app hace después es sustituir esas marcas al
  generar una vista previa (`generarVistaPrevia.ts`).
*/
export async function importarDocx(archivo: File): Promise<ResultadoImportarDocx> {
  const validacion = validarDocx(archivo)
  if (!validacion.ok) {
    return validacion
  }

  try {
    const arrayBuffer = await archivo.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const documentXml = await zip.file('word/document.xml')?.async('string')

    if (documentXml === undefined) {
      return { ok: false, codigo: 'PLANT_DOCX_FALLO_IMPORTACION' }
    }

    const marcadores = detectarMarcadoresEnDocx(documentXml)
    const archivoOriginal = await leerComoDataUrl(archivo)

    return { ok: true, archivoOriginal, marcadores }
  } catch {
    return { ok: false, codigo: 'PLANT_DOCX_FALLO_IMPORTACION' }
  }
}
