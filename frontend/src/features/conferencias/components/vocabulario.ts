import type { TonoDeInsignia } from '@/shared/ui'
import type { EstadoDeValidacion, TipoDeUnidad } from '../data'

/*
  Cómo se leen en pantalla los valores del dominio.

  Vive aparte porque lo comparten la fila del listado, el resumen y el listado
  de fichas, y porque los conteos necesitan el plural mientras cada ficha
  necesita el singular. Tenerlos juntos evita que se separen.
*/

export const TIPO_EN_SINGULAR: Record<TipoDeUnidad, string> = {
  'cita-textual': 'Cita textual',
  metodo: 'Método',
  estrategia: 'Estrategia',
  postura: 'Postura',
  'dato-de-impacto': 'Dato de impacto',
  'fase-del-trabajo': 'Fase del trabajo',
}

export const TIPO_EN_PLURAL: Record<TipoDeUnidad, string> = {
  'cita-textual': 'Citas textuales',
  metodo: 'Métodos',
  estrategia: 'Estrategias',
  postura: 'Posturas',
  'dato-de-impacto': 'Datos de impacto',
  'fase-del-trabajo': 'Fases del trabajo',
}

export const VALIDACION_EN_SINGULAR: Record<EstadoDeValidacion, string> = {
  validada: 'Validada',
  pendiente: 'Pendiente de revisión',
  automatica: 'Alta confianza automática',
}

export const VALIDACION_EN_PLURAL: Record<EstadoDeValidacion, string> = {
  validada: 'Validadas',
  pendiente: 'Pendientes',
  automatica: 'Automáticas',
}

export const TONO_POR_VALIDACION: Record<EstadoDeValidacion, TonoDeInsignia> = {
  validada: 'validado',
  pendiente: 'pendiente',
  automatica: 'automatico',
}

/** Orden fijo en que se recorren, para que el resumen no cambie de forma entre charlas. */
export const TIPOS_EN_ORDEN: readonly TipoDeUnidad[] = [
  'cita-textual',
  'metodo',
  'estrategia',
  'postura',
  'dato-de-impacto',
  'fase-del-trabajo',
]

export const VALIDACIONES_EN_ORDEN: readonly EstadoDeValidacion[] = [
  'validada',
  'pendiente',
  'automatica',
]
