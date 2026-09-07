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
/*
  Cadena encadenable que imita el constructor de consultas de PostgREST: cada
  filtro devuelve la misma cadena, y la cadena es "thenable", así que un
  `await` sobre ella resuelve la respuesta final -- exactamente como se
  comporta `PostgrestFilterBuilder`.
*/
function cadenaVacia(respuesta: { data: unknown; error: unknown } = { data: null, error: null }) {
  const cadena: Record<string, unknown> = {
    then: (resolver: (valor: unknown) => unknown) => Promise.resolve(respuesta).then(resolver),
  }

  for (const metodo of [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'is', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'contains',
    'or', 'not', 'filter', 'match', 'order', 'limit', 'range',
  ]) {
    cadena[metodo] = vi.fn(() => cadena)
  }

  cadena['single'] = vi.fn(() => cadena)
  cadena['maybeSingle'] = vi.fn(() => cadena)

  return cadena
}

export { cadenaVacia }

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
  /*
    Serie B: los repositorios de cada dominio llaman `supabase.from(tabla)` y
    encadenan filtros sobre lo que devuelve. Por defecto cada cadena resuelve
    "sin filas y sin error" -- una pantalla que no está probando persistencia
    monta vacía en vez de estallar. `mockearTabla`/`mockearFalloDeTabla`
    (`test/supabaseDePrueba.ts`) reconfiguran una tabla concreta cuando sí
    importa.
  */
  from: vi.fn(() => cadenaVacia()),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}
