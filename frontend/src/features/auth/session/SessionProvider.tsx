import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  borrarSesionGuardada,
  guardarCuentasRegistradas,
  guardarSesion,
  leerCuentasRegistradas,
  leerSesionGuardada,
} from './almacenamiento'
import { ContextoSesion } from './contexto'
import { esCorreoValido, resumirContrasena } from './credenciales'
import { CUENTAS_DE_EJEMPLO, type CuentaDeEjemplo } from './cuentas.fixture'
import type { CuentaRegistrada, ResultadoAcceso, UsuarioSesion, ValorSesion } from './tipos'

/*
  Sesión simulada del módulo F1. No hay red ni Supabase.

  Conviven dos orígenes de cuentas:
  - Las del fixture, que están en el código y comparan la contraseña tal cual.
  - Las creadas durante el uso, que se conservan en sessionStorage guardando
    solo el resumen SHA-256 de su contraseña, nunca la contraseña.

  Antes las cuentas creadas vivían solo en memoria mientras la sesión sí
  sobrevivía al recargado, así que registrarse, recargar y cerrar sesión dejaba
  la cuenta inaccesible para siempre.

  acceder y registrar son async porque la interfaz muestra un estado de envío, y
  porque en B1 pasan a ser llamadas de red.
*/

function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase()
}

function estaVacio(valor: string): boolean {
  return valor.trim().length === 0
}

function nuevoIdDeUsuario(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid !== undefined) {
    return `usr-${uuid}`
  }

  return `usr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function aUsuarioSesion(cuenta: CuentaDeEjemplo | CuentaRegistrada): UsuarioSesion {
  /* Se copia campo por campo para que ningún secreto salga de la cuenta. */
  return { id: cuenta.id, nombre: cuenta.nombre, correo: cuenta.correo }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => leerSesionGuardada())
  const registradas = useRef<CuentaRegistrada[] | null>(null)

  /* Lectura diferida: el almacenamiento se toca una sola vez por montaje. */
  function cuentasRegistradas(): CuentaRegistrada[] {
    registradas.current ??= leerCuentasRegistradas()
    return registradas.current
  }

  const abrirSesion = useCallback((cuenta: CuentaDeEjemplo | CuentaRegistrada): ResultadoAcceso => {
    const usuarioDeSesion = aUsuarioSesion(cuenta)
    setUsuario(usuarioDeSesion)
    guardarSesion(usuarioDeSesion)
    return { ok: true, usuario: usuarioDeSesion }
  }, [])

  const acceder = useCallback(
    async (correo: string, contrasena: string): Promise<ResultadoAcceso> => {
      if (estaVacio(correo) || estaVacio(contrasena)) {
        return { ok: false, codigo: 'AUTH_CAMPO_REQUERIDO' }
      }

      if (!esCorreoValido(correo)) {
        return { ok: false, codigo: 'AUTH_CORREO_INVALIDO' }
      }

      const correoNormalizado = normalizarCorreo(correo)

      const delFixture = CUENTAS_DE_EJEMPLO.find(
        (candidata) =>
          candidata.correo === correoNormalizado && candidata.contrasena === contrasena,
      )
      if (delFixture !== undefined) {
        return abrirSesion(delFixture)
      }

      const registrada = cuentasRegistradas().find(
        (candidata) => candidata.correo === correoNormalizado,
      )
      if (registrada !== undefined) {
        const resumen = await resumirContrasena(contrasena)
        if (resumen !== null && resumen === registrada.resumen) {
          return abrirSesion(registrada)
        }
      }

      return { ok: false, codigo: 'AUTH_CREDENCIALES_INVALIDAS' }
    },
    [abrirSesion],
  )

  const registrar = useCallback(
    async (nombre: string, correo: string, contrasena: string): Promise<ResultadoAcceso> => {
      if (estaVacio(nombre) || estaVacio(correo) || estaVacio(contrasena)) {
        return { ok: false, codigo: 'AUTH_CAMPO_REQUERIDO' }
      }

      if (!esCorreoValido(correo)) {
        return { ok: false, codigo: 'AUTH_CORREO_INVALIDO' }
      }

      const correoNormalizado = normalizarCorreo(correo)
      const yaExiste =
        CUENTAS_DE_EJEMPLO.some((candidata) => candidata.correo === correoNormalizado) ||
        cuentasRegistradas().some((candidata) => candidata.correo === correoNormalizado)

      if (yaExiste) {
        return { ok: false, codigo: 'AUTH_CORREO_YA_REGISTRADO' }
      }

      /*
        Sin WebCrypto no hay forma de guardar la cuenta sin dejar la contraseña
        en claro, así que se falla en vez de degradar la regla de seguridad.
      */
      const resumen = await resumirContrasena(contrasena)
      if (resumen === null) {
        return { ok: false, codigo: 'AUTH_FALLO_INESPERADO' }
      }

      const cuentaNueva: CuentaRegistrada = {
        id: nuevoIdDeUsuario(),
        nombre: nombre.trim(),
        correo: correoNormalizado,
        resumen,
      }

      registradas.current = [...cuentasRegistradas(), cuentaNueva]
      guardarCuentasRegistradas(registradas.current)

      return abrirSesion(cuentaNueva)
    },
    [abrirSesion],
  )

  const cerrarSesion = useCallback(() => {
    setUsuario(null)
    borrarSesionGuardada()
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      autenticado: usuario !== null,
      acceder,
      registrar,
      cerrarSesion,
    }),
    [usuario, acceder, registrar, cerrarSesion],
  )

  return <ContextoSesion value={valor}>{children}</ContextoSesion>
}
