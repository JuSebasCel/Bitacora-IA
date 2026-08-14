import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/shared/supabase/cliente'
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'

vi.mock('@/shared/supabase/cliente')

/*
  Ninguna de estas pruebas toca la red real: `@/shared/supabase/cliente` está
  mockeado (ver `shared/supabase/__mocks__/cliente.ts`). Lo que se verifica es
  que `SessionProvider` llama al SDK con los argumentos correctos y traduce
  sus respuestas/errores a lo que la interfaz ya espera -- el aislamiento real
  por RLS y el flujo real de red se prueban aparte, en `supabase/tests/`.
*/

function usuarioFalso(datos: { id: string; correo: string; nombre: string }): User {
  return {
    id: datos.id,
    email: datos.correo,
    user_metadata: { nombre: datos.nombre },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '',
  } as User
}

function sesionFalsa(usuario: User): Session {
  return {
    user: usuario,
    access_token: 'token-de-prueba',
    refresh_token: 'refresco-de-prueba',
    expires_in: 3600,
    token_type: 'bearer',
  } as Session
}

function errorDeAuth(code: string): AuthError {
  return { name: 'AuthApiError', message: code, status: 400, code } as AuthError
}

/** Forma completa de `Subscription` (`@supabase/supabase-js`): `id`/`callback` no se usan en la prueba, solo `unsubscribe`. */
function suscripcionFalsa() {
  return { data: { subscription: { id: 'mock', callback: () => {}, unsubscribe: vi.fn() } } }
}

function envoltura({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

/** Monta el provider y espera a que termine de resolver la sesión inicial. */
async function montarSesion() {
  const resultado = renderHook(() => useSession(), { wrapper: envoltura })
  await waitFor(() => expect(resultado.result.current.cargando).toBe(false))
  return resultado
}

/*
  Este archivo sí necesita la transición real de `cargando` (a diferencia del
  resto de la suite, que usa la resolución síncrona del mock por defecto), así
  que reconfigura `onAuthStateChange` con `queueMicrotask` en `beforeEach` --
  no solo en `afterEach` -- para que la primerísima prueba del archivo, antes
  de que corra ningún `afterEach`, también la tenga.
*/
function reiniciarMocks(): void {
  vi.mocked(supabase.auth.signInWithPassword).mockReset()
  vi.mocked(supabase.auth.signUp).mockReset()
  vi.mocked(supabase.auth.signOut).mockReset().mockResolvedValue({ error: null })
  vi.mocked(supabase.auth.onAuthStateChange).mockReset().mockImplementation((callback) => {
    queueMicrotask(() => callback('INITIAL_SESSION', null))
    return suscripcionFalsa()
  })
}

beforeEach(reiniciarMocks)
afterEach(reiniciarMocks)

describe('SessionProvider y useSession', () => {
  it('arranca cargando y termina sin sesión cuando Supabase no tiene ninguna', async () => {
    const { result } = renderHook(() => useSession(), { wrapper: envoltura })

    expect(result.current.cargando).toBe(true)
    expect(result.current.usuario).toBeNull()

    await waitFor(() => expect(result.current.cargando).toBe(false))
    expect(result.current.autenticado).toBe(false)
  })

  it('rehidrata una sesión que Supabase ya tenía guardada al montar', async () => {
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      const usuario = usuarioFalso({
        id: 'usr-rehidratado',
        correo: 'esteban.quiroga@labanfora.org',
        nombre: 'Esteban Quiroga Lamas',
      })
      queueMicrotask(() => callback('INITIAL_SESSION', sesionFalsa(usuario)))
      return suscripcionFalsa()
    })

    const { result } = await montarSesion()

    expect(result.current.autenticado).toBe(true)
    expect(result.current.usuario).toEqual({
      id: 'usr-rehidratado',
      nombre: 'Esteban Quiroga Lamas',
      correo: 'esteban.quiroga@labanfora.org',
    })
  })

  it('abre la sesión con credenciales válidas', async () => {
    const usuario = usuarioFalso({ id: 'usr-1', correo: 'valentina@labanfora.org', nombre: 'Valentina' })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: usuario, session: sesionFalsa(usuario) },
      error: null,
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder('valentina@labanfora.org', 'Anfora-2026')
      expect(resultado).toEqual({
        ok: true,
        usuario: { id: 'usr-1', nombre: 'Valentina', correo: 'valentina@labanfora.org' },
      })
    })

    expect(result.current.autenticado).toBe(true)
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'valentina@labanfora.org',
      password: 'Anfora-2026',
    })
  })

  it('normaliza mayúsculas y espacios del correo antes de llamar a Supabase', async () => {
    const usuario = usuarioFalso({ id: 'usr-1', correo: 'valentina@labanfora.org', nombre: 'Valentina' })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: usuario, session: sesionFalsa(usuario) },
      error: null,
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      await result.current.acceder('  VALENTINA@LABANFORA.ORG  ', 'Anfora-2026')
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'valentina@labanfora.org',
      password: 'Anfora-2026',
    })
  })

  it('traduce credenciales inválidas al código ya conocido por la interfaz', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: errorDeAuth('invalid_credentials'),
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder('nadie@labanfora.org', 'clave-equivocada')
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CREDENCIALES_INVALIDAS' })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('traduce un error de Supabase sin código reconocido a AUTH_FALLO_INESPERADO', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: errorDeAuth('over_request_rate_limit'),
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      const resultado = await result.current.acceder('valentina@labanfora.org', 'Anfora-2026')
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_FALLO_INESPERADO' })
    })
  })

  it('exige los campos obligatorios al acceder, sin llamar a Supabase', async () => {
    const { result } = await montarSesion()

    await act(async () => {
      expect(await result.current.acceder('   ', 'Anfora-2026')).toEqual({
        ok: false,
        codigo: 'AUTH_CAMPO_REQUERIDO',
      })
      expect(await result.current.acceder('valentina@labanfora.org', '   ')).toEqual({
        ok: false,
        codigo: 'AUTH_CAMPO_REQUERIDO',
      })
    })

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('nombra un correo mal formado sin llegar a llamar a Supabase', async () => {
    const { result } = await montarSesion()

    await act(async () => {
      expect(await result.current.acceder('valentina.alcantara@', 'Anfora-2026')).toEqual({
        ok: false,
        codigo: 'AUTH_CORREO_INVALIDO',
      })
    })

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('exige los campos obligatorios al registrar, sin llamar a Supabase', async () => {
    const { result } = await montarSesion()

    await act(async () => {
      expect(await result.current.registrar('', 'lucia@labanfora.org', 'Clave123*')).toEqual({
        ok: false,
        codigo: 'AUTH_CAMPO_REQUERIDO',
      })
    })

    expect(supabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('registra un correo nuevo, pasa el nombre en options.data y abre la sesión', async () => {
    const usuario = usuarioFalso({ id: 'usr-nuevo', correo: 'lucia.moreno@labanfora.org', nombre: 'Lucía Moreno Tejada' })
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: usuario, session: sesionFalsa(usuario) },
      error: null,
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      const resultado = await result.current.registrar(
        '  Lucía Moreno Tejada  ',
        '  Lucia.Moreno@labanfora.org ',
        'ClaveNueva123*',
      )
      expect(resultado).toEqual({
        ok: true,
        usuario: { id: 'usr-nuevo', nombre: 'Lucía Moreno Tejada', correo: 'lucia.moreno@labanfora.org' },
      })
    })

    expect(result.current.autenticado).toBe(true)
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'lucia.moreno@labanfora.org',
      password: 'ClaveNueva123*',
      options: { data: { nombre: 'Lucía Moreno Tejada' } },
    })
  })

  it('traduce una contraseña débil al código ya conocido por la interfaz', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: errorDeAuth('weak_password'),
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      const resultado = await result.current.registrar('Alguien', 'alguien@labanfora.org', 'simple123')
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CONTRASENA_DEBIL' })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('rechaza el registro cuando el correo ya existe', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: errorDeAuth('user_already_exists'),
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      const resultado = await result.current.registrar(
        'Otra Persona',
        'valentina@labanfora.org',
        'ClaveNueva123*',
      )
      expect(resultado).toEqual({ ok: false, codigo: 'AUTH_CORREO_YA_REGISTRADO' })
    })

    expect(result.current.autenticado).toBe(false)
  })

  it('cierra la sesión y llama a Supabase', async () => {
    const usuario = usuarioFalso({ id: 'usr-1', correo: 'valentina@labanfora.org', nombre: 'Valentina' })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: usuario, session: sesionFalsa(usuario) },
      error: null,
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      await result.current.acceder('valentina@labanfora.org', 'Anfora-2026')
    })
    expect(result.current.autenticado).toBe(true)

    act(() => {
      result.current.cerrarSesion()
    })

    expect(result.current.usuario).toBeNull()
    expect(result.current.autenticado).toBe(false)
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('no devuelve más campos que id, nombre y correo dentro del usuario', async () => {
    const usuario = usuarioFalso({ id: 'usr-1', correo: 'valentina@labanfora.org', nombre: 'Valentina' })
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: usuario, session: sesionFalsa(usuario) },
      error: null,
    } as never)

    const { result } = await montarSesion()

    await act(async () => {
      await result.current.acceder('valentina@labanfora.org', 'Anfora-2026')
    })

    expect(Object.keys(result.current.usuario ?? {}).sort()).toEqual(['correo', 'id', 'nombre'])
  })

  it('lanza un error claro si useSession se usa fuera del provider', () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => renderHook(() => useSession())).toThrowError(/SessionProvider/)

    espia.mockRestore()
  })
})
