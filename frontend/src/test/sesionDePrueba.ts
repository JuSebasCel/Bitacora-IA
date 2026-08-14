import { vi } from 'vitest'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/shared/supabase/cliente'

/*
  Helper compartido para simular sesión de Supabase Auth en pruebas, sin
  tocar la red (B1). Cada archivo que lo use debe llamar
  `vi.mock('@/shared/supabase/cliente')` en su propio nivel superior --
  Vitest exige que `vi.mock` se declare estático en cada archivo, así que eso
  no se puede centralizar aquí. Lo que sí se centraliza es cómo se configura
  el mock una vez declarado, para no repetir la forma de un `User`/`Session`
  falsos en cada archivo.
*/

export type UsuarioDePrueba = { readonly id: string; readonly nombre: string; readonly correo: string }

function usuarioFalso(datos: UsuarioDePrueba): User {
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

/** Forma completa de `Subscription` (`@supabase/supabase-js`): `id`/`callback` no se usan en las pruebas, solo `unsubscribe`. */
function suscripcionFalsa() {
  return { data: { subscription: { id: 'mock', callback: () => {}, unsubscribe: vi.fn() } } }
}

/*
  Resuelven de forma síncrona a propósito (no `queueMicrotask`): así el
  estado queda listo dentro del mismo `render()`/`act()` con el que se monta
  el árbol, y quien llama no necesita `await`/`waitFor` para ver el resultado.
  La transición de carga real solo importa en `SessionProvider.test.tsx`, que
  configura su propia implementación asíncrona a propósito.
*/

/** Simula que Supabase ya tenía esta sesión guardada al montar el provider -- "hay alguien con sesión abierta". */
export function mockearSesionAutenticada(datos: UsuarioDePrueba): void {
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    callback('INITIAL_SESSION', sesionFalsa(usuarioFalso(datos)))
    return suscripcionFalsa()
  })
}

/** Simula que Supabase resuelve sin sesión guardada -- el comportamiento por defecto del mock, explícito para dejar clara la intención en la prueba. */
export function mockearSinSesion(): void {
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    callback('INITIAL_SESSION', null)
    return suscripcionFalsa()
  })
}

export function mockearAccederExitoso(datos: UsuarioDePrueba): void {
  const usuario = usuarioFalso(datos)
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: usuario, session: sesionFalsa(usuario) },
    error: null,
  } as never)
}

export function mockearAccederFallido(codigo: string): void {
  vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
    data: { user: null, session: null },
    error: errorDeAuth(codigo),
  } as never)
}

export function mockearRegistrarExitoso(datos: UsuarioDePrueba): void {
  const usuario = usuarioFalso(datos)
  vi.mocked(supabase.auth.signUp).mockResolvedValue({
    data: { user: usuario, session: sesionFalsa(usuario) },
    error: null,
  } as never)
}

export function mockearRegistrarFallido(codigo: string): void {
  vi.mocked(supabase.auth.signUp).mockResolvedValue({
    data: { user: null, session: null },
    error: errorDeAuth(codigo),
  } as never)
}

/** Para `afterEach`: limpia lo que haya configurado cada prueba y vuelve al comportamiento por defecto (sin sesión). */
export function reiniciarMocksDeSesion(): void {
  vi.mocked(supabase.auth.signInWithPassword).mockReset()
  vi.mocked(supabase.auth.signUp).mockReset()
  vi.mocked(supabase.auth.signOut).mockReset().mockResolvedValue({ error: null })
  mockearSinSesion()
}
