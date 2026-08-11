import type { ReactElement, ReactNode } from 'react'
import { unirClases } from './clases'

/*
  Estado de un dato, traducido a su token semántico.

  Los tonos son los del sistema de diseño y no se solapan con el acento: verde
  significa validado, no significa "botón". Por eso el acento de la aplicación
  es azul tinta y nunca verde.

  El texto siempre acompaña al color. Un color sin palabra deja fuera a quien no
  distingue esos tonos, y aquí lo que se comunica es si una cita se puede citar.
*/

export type TonoDeInsignia = 'validado' | 'pendiente' | 'automatico' | 'neutro' | 'error'

export type PropsInsignia = {
  tono: TonoDeInsignia
  children: ReactNode
}

const CLASES_BASE =
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium'

const CLASES_POR_TONO: Record<TonoDeInsignia, string> = {
  validado: 'border-validado/40 text-validado',
  pendiente: 'border-pendiente/40 text-pendiente',
  automatico: 'border-filete-fuerte text-automatico',
  neutro: 'border-filete-fuerte text-texto-tenue',
  error: 'border-error-borde text-error',
}

export function Insignia({ tono, children }: PropsInsignia): ReactElement {
  return <span className={unirClases(CLASES_BASE, CLASES_POR_TONO[tono])}>{children}</span>
}
