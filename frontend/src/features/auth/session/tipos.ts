import type { CodigoError } from '@/shared/errors'

/*
  Forma pública de la persona con sesión abierta. Nunca incluye la contraseña ni
  ningún otro dato sensible: es lo único que se comparte con la interfaz y lo
  único que se persiste en sessionStorage.
*/
export type UsuarioSesion = { id: string; nombre: string; correo: string }

export type ResultadoAcceso =
  { ok: true; usuario: UsuarioSesion } | { ok: false; codigo: CodigoError }

/*
  Cuenta creada durante el uso de la aplicación. Se conserva entre recargados,
  y por eso nunca lleva la contraseña: solo su resumen SHA-256.
*/
export type CuentaRegistrada = {
  id: string
  nombre: string
  correo: string
  resumen: string
}

export type ValorSesion = {
  usuario: UsuarioSesion | null
  autenticado: boolean
  acceder: (correo: string, contrasena: string) => Promise<ResultadoAcceso>
  registrar: (nombre: string, correo: string, contrasena: string) => Promise<ResultadoAcceso>
  cerrarSesion: () => void
}
