import { borrarClave, escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import type { CuentaRegistrada, UsuarioSesion } from './tipos'

/*
  Persistencia de la sesión simulada. Vive en sessionStorage (no localStorage)
  para que muera al cerrar la pestaña, y guarda únicamente la forma pública del
  usuario: id, nombre y correo. La contraseña nunca se persiste, ni en la
  sesión ni en las cuentas creadas, donde solo viaja su resumen.

  El acceso tolerante a fallos del almacenamiento vive en `shared/storage`:
  salió de aquí cuando las etiquetas personales de F2 necesitaron exactamente
  el mismo try/catch. Lo que queda en este archivo son los guards propios de la
  sesión.
*/

export const CLAVE_SESION = 'bitacora-ai.sesion'
export const CLAVE_CUENTAS = 'bitacora-ai.cuentas'

function esUsuarioSesion(valor: unknown): valor is UsuarioSesion {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>
  return (
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['correo'] === 'string' &&
    candidato['id'].trim().length > 0 &&
    candidato['correo'].trim().length > 0
  )
}

function esCuentaRegistrada(valor: unknown): valor is CuentaRegistrada {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>
  return (
    typeof candidato['id'] === 'string' &&
    typeof candidato['nombre'] === 'string' &&
    typeof candidato['correo'] === 'string' &&
    typeof candidato['resumen'] === 'string' &&
    candidato['correo'].trim().length > 0 &&
    candidato['resumen'].trim().length > 0
  )
}

export function leerSesionGuardada(): UsuarioSesion | null {
  const valor = leerJson(CLAVE_SESION)
  if (valor === null) {
    return null
  }

  if (!esUsuarioSesion(valor)) {
    borrarClave(CLAVE_SESION)
    return null
  }

  return { id: valor.id, nombre: valor.nombre, correo: valor.correo }
}

export function guardarSesion(usuario: UsuarioSesion): void {
  escribirJson(CLAVE_SESION, {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
  })
}

export function borrarSesionGuardada(): void {
  borrarClave(CLAVE_SESION)
}

/*
  Cuentas creadas durante el uso. Sin ellas, registrarse y recargar dejaba la
  cuenta inaccesible: la sesión sobrevivía pero la cuenta que la respaldaba no.
*/
export function leerCuentasRegistradas(): CuentaRegistrada[] {
  const valor = leerJson(CLAVE_CUENTAS)
  if (!Array.isArray(valor)) {
    return []
  }

  const validas = valor.filter(esCuentaRegistrada)
  if (validas.length !== valor.length) {
    escribirJson(CLAVE_CUENTAS, validas)
  }

  return validas
}

export function guardarCuentasRegistradas(cuentas: readonly CuentaRegistrada[]): void {
  escribirJson(CLAVE_CUENTAS, cuentas)
}
