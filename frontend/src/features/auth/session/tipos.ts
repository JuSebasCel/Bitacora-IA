import type { CodigoError } from '@/shared/errors'

/*
  Forma pública de la persona con sesión abierta. Nunca incluye la contraseña ni
  ningún otro dato sensible: es lo único que se comparte con la interfaz.
*/
export type UsuarioSesion = { id: string; nombre: string; correo: string }

export type ResultadoAcceso =
  { ok: true; usuario: UsuarioSesion } | { ok: false; codigo: CodigoError }

export type ValorSesion = {
  usuario: UsuarioSesion | null
  autenticado: boolean
  /**
   * `true` mientras se resuelve la sesión inicial contra Supabase Auth (B1).
   * `RutaProtegida` la usa para no redirigir a /acceso antes de tiempo: sin
   * esto, alguien con una sesión real y válida vería un parpadeo hacia el
   * acceso mientras la promesa de `getSession`/`onAuthStateChange` resuelve.
   */
  cargando: boolean
  acceder: (correo: string, contrasena: string) => Promise<ResultadoAcceso>
  registrar: (nombre: string, correo: string, contrasena: string) => Promise<ResultadoAcceso>
  cerrarSesion: () => void
}
