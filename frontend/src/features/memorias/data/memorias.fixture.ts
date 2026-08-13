import type { Memoria } from './tipos'

/**
 * Semilla del listado de memorias: para que la pantalla no arranque vacía.
 * Referencia una conferencia y una plantilla reales del resto de los
 * fixtures (`cnf-alc-01`, `pla-memoria-estandar`) — se borra cuando entre
 * B1 y las memorias vivan en Supabase.
 */
export const MEMORIAS_DE_EJEMPLO: readonly Memoria[] = [
  {
    id: 'mem-alc-01',
    idConferencia: 'cnf-alc-01',
    idPlantilla: 'pla-memoria-estandar',
    nombre: 'Memoria de Modelos de lenguaje aplicados a la revisión sistemática de literatura',
    generadaEl: '2026-04-15T10:00:00.000Z',
  },
]
