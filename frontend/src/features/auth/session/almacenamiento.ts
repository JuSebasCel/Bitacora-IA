import type { CuentaRegistrada, UsuarioSesion } from './tipos'

/*
  Persistencia de la sesión simulada. Vive en sessionStorage (no localStorage)
  para que muera al cerrar la pestaña, y guarda únicamente la forma pública del
  usuario: id, nombre y correo. La contraseña nunca se persiste, ni en la
  sesión ni en las cuentas creadas, donde solo viaja su resumen.
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

function almacenamientoDisponible(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    /* Acceso bloqueado por la configuración del navegador. */
    return null
  }
}

/*
  Lee y descarta en silencio cualquier valor corrupto. Toda la interacción con
  el almacenamiento va dentro del try, incluida la lectura: en un iframe con
  zona de pruebas o en ciertos webviews, getItem también puede lanzar, y esta
  función corre dentro del inicializador de useState del provider. Si la
  excepción escapara, la aplicación entera se quedaría en blanco.
*/
function leerJson(clave: string): unknown {
  const almacenamiento = almacenamientoDisponible()
  if (almacenamiento === null) {
    return null
  }

  try {
    const crudo = almacenamiento.getItem(clave)
    if (crudo === null) {
      return null
    }

    return JSON.parse(crudo)
  } catch {
    borrarClave(clave)
    return null
  }
}

function escribirJson(clave: string, valor: unknown): void {
  const almacenamiento = almacenamientoDisponible()
  if (almacenamiento === null) {
    return
  }

  try {
    almacenamiento.setItem(clave, JSON.stringify(valor))
  } catch {
    /* Cuota llena o modo privado: el estado sigue vivo en memoria. */
  }
}

function borrarClave(clave: string): void {
  const almacenamiento = almacenamientoDisponible()
  if (almacenamiento === null) {
    return
  }

  try {
    almacenamiento.removeItem(clave)
  } catch {
    /* Nada que hacer: el estado en memoria ya se limpió. */
  }
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
