import { vi } from 'vitest'

/*
  Mock manual de Vitest: cualquier prueba que llame `vi.mock('@/shared/supabase/cliente')`
  (sin fábrica) recibe este archivo en vez del cliente real. Ninguna prueba de
  la suite normal (`npx vitest run`) toca la red real de Supabase -- eso es
  exclusivo de `supabase/tests/` (B1, ver plan del módulo).

  Por defecto `onAuthStateChange` resuelve "sin sesión" de forma síncrona: la
  mayoría de las pruebas de otros módulos solo necesitan "hay alguien con
  sesión abierta" para probar otra cosa, sin importarles la transición de
  carga real de Supabase -- una respuesta síncrona hace que se resuelva
  dentro del mismo `render()`/`act()` inicial, sin que cada archivo tenga que
  aprender a esperarla. Las pruebas que sí verifican la transición real
  (`SessionProvider.test.tsx`) reconfiguran esta implementación con su propio
  `mockImplementation` y usan `queueMicrotask` a propósito.
*/
export const supabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockImplementation((callback: (evento: string, sesion: null) => void) => {
      callback('INITIAL_SESSION', null)
      return { data: { subscription: { id: 'mock', callback: () => {}, unsubscribe: vi.fn() } } }
    }),
  },
  /*
    Por defecto resuelve "sin API key" (B2): la mayoría de las pruebas que
    montan el shell no les importa el estado de la API key para lo que están
    probando. `mockearApiKeyGuardada`/`mockearSinApiKey` (`test/sesionDePrueba.ts`)
    reconfiguran esta implementación cuando sí importa.
  */
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}
