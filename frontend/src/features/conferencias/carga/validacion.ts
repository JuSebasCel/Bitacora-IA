import type { CodigoError } from '@/shared/errors'
import type { FuenteDeConferencia } from '../data'

/*
  Validación pura del formulario de carga (F3).

  No hay backend detrás todavía: estas reglas son el equivalente frontend de
  lo que B3 validará de verdad al recibir el archivo. Los límites de tamaño y
  las extensiones admitidas son provisionales, hasta que B3 defina lo que
  Supabase Storage puede sostener de verdad.
*/

export type DatosDeCarga = {
  readonly titulo: string
  readonly ponente: string
  readonly evento: string
  readonly fechaDelEvento: string
  readonly fuente: FuenteDeConferencia
}

export type ResultadoDeCarga = { readonly ok: true } | { readonly ok: false; readonly codigo: CodigoError }

export const EXTENSIONES_POR_FUENTE: Record<FuenteDeConferencia, readonly string[]> = {
  audio: ['.mp3', '.wav', '.m4a', '.aac'],
  transcripcion: ['.txt', '.docx', '.pdf', '.md'],
}

export const TAMANO_MAXIMO_POR_FUENTE: Record<FuenteDeConferencia, number> = {
  audio: 300 * 1024 * 1024,
  transcripcion: 20 * 1024 * 1024,
}

/*
  Un único código para "falta algo", no uno por campo: igual que
  AUTH_CAMPO_REQUERIDO en el acceso, no importa cuál de los cuatro esté vacío,
  la acción que sigue es la misma (completarlo).
*/
export function validarDatos(datos: DatosDeCarga): ResultadoDeCarga {
  const campos = [datos.titulo, datos.ponente, datos.evento, datos.fechaDelEvento]

  if (campos.some((campo) => campo.trim() === '')) {
    return { ok: false, codigo: 'CARGA_CAMPO_REQUERIDO' }
  }

  return { ok: true }
}

export function validarArchivo(archivo: File | null, fuente: FuenteDeConferencia): ResultadoDeCarga {
  if (archivo === null) {
    return { ok: false, codigo: 'CARGA_ARCHIVO_REQUERIDO' }
  }

  const nombre = archivo.name.toLowerCase()
  const extensionValida = EXTENSIONES_POR_FUENTE[fuente].some((extension) =>
    nombre.endsWith(extension),
  )

  if (!extensionValida) {
    return { ok: false, codigo: 'CARGA_ARCHIVO_NO_SOPORTADO' }
  }

  if (archivo.size > TAMANO_MAXIMO_POR_FUENTE[fuente]) {
    return { ok: false, codigo: 'CARGA_ARCHIVO_MUY_GRANDE' }
  }

  return { ok: true }
}
