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

const CLASES_BASE = 'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium'

/*
  Relleno tonal y no borde: el mismo vocabulario que los chips de filtros
  (superficie plana, color por fondo tenue), para que un estado de ficha se
  lea con la misma familia visual en toda la aplicación.
*/
const CLASES_POR_TONO: Record<TonoDeInsignia, string> = {
  validado: 'bg-validado/12 text-validado',
  pendiente: 'bg-pendiente/12 text-pendiente',
  automatico: 'bg-fondo text-automatico',
  neutro: 'bg-fondo text-texto-tenue',
  error: 'bg-error/12 text-error',
}

export function Insignia({ tono, children }: PropsInsignia): ReactElement {
  return <span className={unirClases(CLASES_BASE, CLASES_POR_TONO[tono])}>{children}</span>
}
