import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthError, User } from '@supabase/supabase-js'
import { supabase } from '@/shared/supabase/cliente'
import type { CodigoError } from '@/shared/errors'
import { ContextoSesion } from './contexto'
import { esCorreoValido } from './credenciales'
import type { ResultadoAcceso, UsuarioSesion, ValorSesion } from './tipos'

/*
  Sesión real contra Supabase Auth (B1). Reemplaza la sesión simulada de F1 --
  `cuentas.fixture.ts` ya avisaba, desde que se escribió, que este archivo se
  borraría en este momento y no se adaptaría.

  `onAuthStateChange` emite el evento `INITIAL_SESSION` apenas se suscribe,
  con la sesión ya resuelta desde el almacenamiento persistente del cliente de
  Supabase -- no hace falta una llamada aparte a `getSession()` para el estado
  inicial. `acceder`/`registrar` además actualizan `usuario` de forma directa
  con la respuesta de su propia llamada: no dependen de que la suscripción
  reaccione a tiempo, y así el valor que devuelven coincide siempre con lo que
  ve la interfaz de inmediato.
*/

function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase()
}

function estaVacio(valor: string): boolean {
  return valor.trim().length === 0
}

function aUsuarioSesion(usuario: User): UsuarioSesion {
  const nombre = usuario.user_metadata['nombre']

  return {
    id: usuario.id,
    nombre: typeof nombre === 'string' ? nombre : '',
    correo: usuario.email ?? '',
  }
}

/** Traduce los códigos de error de Supabase Auth a los que ya conoce la interfaz. */
function codigoDeErrorDeAcceso(error: AuthError): CodigoError {
  return error.code === 'invalid_credentials' ? 'AUTH_CREDENCIALES_INVALIDAS' : 'AUTH_FALLO_INESPERADO'
}

function codigoDeErrorDeRegistro(error: AuthError): CodigoError {
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return 'AUTH_CORREO_YA_REGISTRADO'
  }

  if (error.code === 'weak_password') {
    return 'AUTH_CONTRASENA_DEBIL'
  }

  return 'AUTH_FALLO_INESPERADO'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      setUsuario(sesion === null ? null : aUsuarioSesion(sesion.user))
      setCargando(false)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const acceder = useCallback(async (correo: string, contrasena: string): Promise<ResultadoAcceso> => {
    if (estaVacio(correo) || estaVacio(contrasena)) {
      return { ok: false, codigo: 'AUTH_CAMPO_REQUERIDO' }
    }

    if (!esCorreoValido(correo)) {
      return { ok: false, codigo: 'AUTH_CORREO_INVALIDO' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizarCorreo(correo),
      password: contrasena,
    })

    if (error !== null || data.user === null) {
      return { ok: false, codigo: error === null ? 'AUTH_FALLO_INESPERADO' : codigoDeErrorDeAcceso(error) }
    }

    const usuarioDeSesion = aUsuarioSesion(data.user)
    setUsuario(usuarioDeSesion)
    return { ok: true, usuario: usuarioDeSesion }
  }, [])

  const registrar = useCallback(
    async (nombre: string, correo: string, contrasena: string): Promise<ResultadoAcceso> => {
      if (estaVacio(nombre) || estaVacio(correo) || estaVacio(contrasena)) {
        return { ok: false, codigo: 'AUTH_CAMPO_REQUERIDO' }
      }

      if (!esCorreoValido(correo)) {
        return { ok: false, codigo: 'AUTH_CORREO_INVALIDO' }
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizarCorreo(correo),
        password: contrasena,
        options: { data: { nombre: nombre.trim() } },
      })

      if (error !== null || data.user === null) {
        return {
          ok: false,
          codigo: error === null ? 'AUTH_FALLO_INESPERADO' : codigoDeErrorDeRegistro(error),
        }
      }

      const usuarioDeSesion = aUsuarioSesion(data.user)
      setUsuario(usuarioDeSesion)
      return { ok: true, usuario: usuarioDeSesion }
    },
    [],
  )

  const cerrarSesion = useCallback(() => {
    setUsuario(null)
    void supabase.auth.signOut()
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      autenticado: usuario !== null,
      cargando,
      acceder,
      registrar,
      cerrarSesion,
    }),
    [usuario, cargando, acceder, registrar, cerrarSesion],
  )

  return <ContextoSesion value={valor}>{children}</ContextoSesion>
}
