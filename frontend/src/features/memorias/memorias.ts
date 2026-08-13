import { LARGO_MAXIMO_DE_MEMORIA } from '@/shared/errors'
import type { CodigoError } from '@/shared/errors'
import type { Memoria } from './data'

/*
  Operaciones puras sobre una memoria. Mismo contrato que
  `plantillas/plantillas.ts`: nunca lanzan, el fallo viaja como código de
  error. A diferencia de una plantilla, una memoria no se edita después de
  creada — no hay `renombrar`/`actualizar`, solo `crearMemoria`.
*/

export type ResultadoMemoria =
  | { readonly ok: true; readonly memoria: Memoria }
  | { readonly ok: false; readonly codigo: CodigoError }

function idAleatorio(prefijo: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return `${prefijo}-${uuid}`
  }

  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function crearMemoria(idConferencia: string, idPlantilla: string, nombre: string): ResultadoMemoria {
  if (idConferencia.trim().length === 0) {
    return { ok: false, codigo: 'MEM_CONFERENCIA_REQUERIDA' }
  }

  if (idPlantilla.trim().length === 0) {
    return { ok: false, codigo: 'MEM_PLANTILLA_REQUERIDA' }
  }

  const nombreLimpio = nombre.trim()

  if (nombreLimpio.length === 0) {
    return { ok: false, codigo: 'MEM_NOMBRE_REQUERIDO' }
  }

  if (nombreLimpio.length > LARGO_MAXIMO_DE_MEMORIA) {
    return { ok: false, codigo: 'MEM_NOMBRE_MUY_LARGO' }
  }

  return {
    ok: true,
    memoria: {
      id: idAleatorio('mem'),
      idConferencia,
      idPlantilla,
      nombre: nombreLimpio,
      generadaEl: new Date().toISOString(),
    },
  }
}
