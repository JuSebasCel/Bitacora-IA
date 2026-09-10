import { vi } from 'vitest'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/shared/supabase/cliente'

/*
  Utilería para probar un repositorio de la serie B contra el mock del cliente
  de Supabase, sin red.

  El objetivo es que una prueba diga qué tabla devuelve qué, y nada más --
  nunca cuántos filtros se encadenaron ni en qué orden. Esa es exactamente la
  parte que cambia cuando se reescribe una consulta sin cambiar su
  comportamiento, y una prueba que la fije se rompe sin que nada esté mal.

  Igual que `sesionDePrueba.ts`, cada archivo que use esto debe declarar
  `vi.mock('@/shared/supabase/cliente')` en su propio nivel superior: Vitest
  exige que `vi.mock` sea estático por archivo y eso no se puede centralizar.
*/

type RespuestaCruda = { readonly data: unknown; readonly error: PostgrestError | null }

const METODOS_DE_CADENA = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'in', 'is', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'contains',
  'or', 'not', 'filter', 'match', 'order', 'limit', 'range',
]

/*
  Cadena encadenable "thenable": cualquier filtro devuelve la misma cadena y el
  `await` final resuelve la respuesta.

  `single()`/`maybeSingle()` colapsan un arreglo sembrado a su primer elemento,
  como haría PostgREST tras un `insert ... select ... single()`. El resultado
  sigue siendo encadenable, pero su `await` resuelve una fila y no la lista.
*/
function cadenaQueResuelve(respuesta: RespuestaCruda, fila?: RespuestaCruda): Record<string, unknown> {
  const cadena: Record<string, unknown> = {
    then: (resolver: (valor: RespuestaCruda) => unknown) =>
      Promise.resolve(respuesta).then(resolver),
  }

  for (const metodo of METODOS_DE_CADENA) {
    cadena[metodo] = vi.fn(() => cadena)
  }

  const respuestaDeFila: RespuestaCruda = fila ?? {
    data: Array.isArray(respuesta.data) ? (respuesta.data[0] ?? null) : respuesta.data,
    error: respuesta.error,
  }
  const cadenaDeFila: Record<string, unknown> = {
    then: (resolver: (valor: RespuestaCruda) => unknown) =>
      Promise.resolve(respuestaDeFila).then(resolver),
  }
  for (const metodo of METODOS_DE_CADENA) {
    cadenaDeFila[metodo] = vi.fn(() => cadenaDeFila)
  }
  cadenaDeFila['single'] = vi.fn(() => cadenaDeFila)
  cadenaDeFila['maybeSingle'] = vi.fn(() => cadenaDeFila)

  cadena['single'] = vi.fn(() => cadenaDeFila)
  cadena['maybeSingle'] = vi.fn(() => cadenaDeFila)

  return cadena
}

/*
  Respuestas por tabla. Se acumulan en vez de reemplazarse para que una prueba
  pueda preparar varias tablas con llamadas sucesivas, que es el caso normal:
  casi toda pantalla lee de más de una.
*/
let respuestasPorTabla: Record<string, RespuestaCruda> = {}
let filasPorTabla: Record<string, RespuestaCruda> = {}

function instalarFrom(): void {
  vi.mocked(supabase.from).mockImplementation((tabla: string) => {
    const respuesta = respuestasPorTabla[tabla] ?? { data: null, error: null }
    return cadenaQueResuelve(respuesta, filasPorTabla[tabla]) as never
  })
}

/** La tabla devuelve estas filas. Sirve igual para un listado y para un `single()`, según lo que se pase. */
export function mockearTabla(tabla: string, filas: unknown): void {
  respuestasPorTabla = { ...respuestasPorTabla, [tabla]: { data: filas, error: null } }
  instalarFrom()
}

/*
  Lo que `single()`/`maybeSingle()` de esa tabla resuelven, independiente de lo
  que devuelva su lectura como lista. Para el caso «la misma tabla se lee como
  listado en un punto y como `insert ... select ... single()` en otro», donde
  cada uno espera algo distinto.
*/
export function mockearFilaDe(tabla: string, fila: unknown): void {
  filasPorTabla = { ...filasPorTabla, [tabla]: { data: fila, error: null } }
  instalarFrom()
}

/** La tabla falla con un código de Postgres (`23505` unicidad, `42501` RLS, `''` para simular caída de red). */
export function mockearFalloDeTabla(tabla: string, codigo: string, mensaje = 'fallo simulado'): void {
  const error = { code: codigo, message: mensaje, details: '', hint: '' } as PostgrestError
  respuestasPorTabla = { ...respuestasPorTabla, [tabla]: { data: null, error } }
  instalarFrom()
}

/** Devuelve el mock del bucket para afirmar sobre `upload`/`download`/`remove` de Storage. */
export function mockearBucket(archivos: Record<string, unknown> = {}): {
  readonly upload: ReturnType<typeof vi.fn>
  readonly download: ReturnType<typeof vi.fn>
  readonly remove: ReturnType<typeof vi.fn>
} {
  const upload = vi.fn().mockResolvedValue({ data: { path: 'ruta/simulada' }, error: null })
  const download = vi.fn().mockImplementation((ruta: string) =>
    Promise.resolve({ data: archivos[ruta] ?? null, error: null }),
  )
  const remove = vi.fn().mockResolvedValue({ data: [], error: null })

  vi.mocked(supabase.storage.from).mockReturnValue({
    upload,
    download,
    remove,
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://ejemplo/firmada' }, error: null }),
  } as never)

  return { upload, download, remove }
}

/** Para `afterEach`: olvida lo preparado por la prueba anterior y vuelve a "todas las tablas vacías". */
export function reiniciarMocksDeDatos(): void {
  respuestasPorTabla = {}
  filasPorTabla = {}
  vi.mocked(supabase.from).mockReset()
  instalarFrom()
}
