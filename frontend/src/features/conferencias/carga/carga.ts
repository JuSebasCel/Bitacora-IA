import { validarArchivo, validarDatos } from './validacion'
import type { DatosDeCarga, ResultadoDeCarga } from './validacion'

/*
  A diferencia de F1/F2, donde los estados de carga son instantáneos porque no
  hay nada real que demostrar, aquí el retraso es el punto del módulo: PRD.md
  sección 6 pide un estado visual de "procesando", y sin una espera de verdad
  no hay nada que ver. Cuando entre B3, este `setTimeout` se sustituye por la
  subida real sin cambiar la forma en que la pantalla llama a esta función.
*/
export const RETRASO_SIMULADO_MS = 900

export async function cargarConferencia(
  datos: DatosDeCarga,
  archivo: File | null,
): Promise<ResultadoDeCarga> {
  const datosValidos = validarDatos(datos)
  if (!datosValidos.ok) {
    return datosValidos
  }

  const archivoValido = validarArchivo(archivo, datos.fuente)
  if (!archivoValido.ok) {
    return archivoValido
  }

  await new Promise<void>((resolver) => setTimeout(resolver, RETRASO_SIMULADO_MS))

  return { ok: true }
}
