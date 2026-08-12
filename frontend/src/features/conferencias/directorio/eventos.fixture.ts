import type { Evento } from '../data'

/*
  Semilla del directorio compartido de eventos: los tres que ya aparecen en
  `data/conferencias.fixture.ts`, para que el selector de F3 no arranque
  vacío. Se borra cuando entre B1 y los eventos vivan en Supabase; el catálogo
  real se crea desde ahí, no se migra este archivo.
*/
export const EVENTOS_DE_EJEMPLO: readonly Evento[] = [
  { id: 'evt-saia', nombre: 'Simposio Andino de Investigación Aplicada' },
  { id: 'evt-ccdn', nombre: 'Coloquio de Ciencia de Datos del Norte' },
  { id: 'evt-jis', nombre: 'Jornadas de Ingeniería y Sociedad' },
]
