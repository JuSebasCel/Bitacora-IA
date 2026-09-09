import JSZip from 'jszip'
import { TAMANO_MAXIMO_DE_DOCX_MB } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { MarcadorDeDocx } from '../data'
import { detectarMarcadoresEnDocx } from './detectarMarcadoresEnDocx'

export type ResultadoImportarDocx =
  | { readonly ok: true; readonly marcadores: readonly MarcadorDeDocx[] }
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

/*
  El `.docx` subido se conserva intacto: esta función solo lo valida y lee sus
  placeholders `[[...]]` directamente del XML crudo
  (`detectarMarcadoresEnDocx`) — nunca lo convierte a otro formato ni lo
  reconstruye. El diseño hecho en Word queda exactamente igual; lo único que
  la app hace después es sustituir esas marcas al generar una vista previa
  (`generarVistaPrevia.ts`).

  Desde B6 ya no devuelve los bytes: leía el archivo como data URL porque ese
  era el formato con el que se guardaba en `sessionStorage`, y hoy el archivo
  se sube tal cual al bucket `plantillas-docx` (`repositorio.ts`). Quien
  llama ya tiene el `File` en la mano, así que codificarlo a base64 aquí solo
  serviría para duplicarlo en memoria.
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

    return { ok: true, marcadores: detectarMarcadoresEnDocx(documentXml) }
  } catch {
    return { ok: false, codigo: 'PLANT_DOCX_FALLO_IMPORTACION' }
  }
}
