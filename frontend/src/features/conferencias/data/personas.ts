import { CUENTAS_DE_EJEMPLO } from '@/features/auth/session'

/*
  Resuelve el nombre de quien compartió una conferencia.

  Vive aquí y no en `query/acceso.ts` porque no es una regla de acceso: el
  acceso trabaja con identificadores, y quién se llama cómo es un dato de
  presentación. Cuando entre B1, esto pasa a ser una consulta al perfil.
*/
export function nombreDePersona(idUsuario: string): string | null {
  return CUENTAS_DE_EJEMPLO.find((cuenta) => cuenta.id === idUsuario)?.nombre ?? null
}
