import { PERSONAS_DE_EJEMPLO } from './personas.fixture'

/*
  Resuelve el nombre de quien compartió una conferencia.

  Vive aquí y no en `query/acceso.ts` porque no es una regla de acceso: el
  acceso trabaja con identificadores, y quién se llama cómo es un dato de
  presentación. Sigue sobre datos de ejemplo porque conferencias/fichas/
  comparticiones todavía no se reconectan a Supabase (eso llega módulo a
  módulo en el resto de la fase 2, ver `PRD.md` sección 6).
*/
export function nombreDePersona(idUsuario: string): string | null {
  return PERSONAS_DE_EJEMPLO.find((persona) => persona.id === idUsuario)?.nombre ?? null
}
