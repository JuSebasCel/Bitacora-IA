import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockearTabla, reiniciarMocksDeDatos } from '@/test/supabaseDePrueba'
import { useEtiquetas } from './useEtiquetas'

vi.mock('@/shared/supabase/cliente')

const ZULUAGA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'

const ETIQUETAS_DE_ZULUAGA = [
  { id: 'etq-zul-tesis', nombre: 'tesis', id_propietario: ZULUAGA },
  { id: 'etq-zul-ia', nombre: 'ia', id_propietario: ZULUAGA },
]

beforeEach(() => {
  reiniciarMocksDeDatos()
  mockearTabla('etiquetas', ETIQUETAS_DE_ZULUAGA)
  mockearTabla('etiquetas_asignaciones', [{ id_etiqueta: 'etq-zul-tesis', id_conferencia: 'cnf-zul-01' }])
})

afterEach(() => {
  vi.clearAllMocks()
})

async function etiquetasListas(idUsuario = ZULUAGA) {
  const render = renderHook(() => useEtiquetas(idUsuario))
  await waitFor(() => expect(render.result.current.cargando).toBe(false))
  return render
}

describe('useEtiquetas', () => {
  it('carga el espacio propio de Supabase', async () => {
    const { result } = await etiquetasListas()

    expect(result.current.espacio.etiquetas.map((e) => e.nombre)).toEqual(['tesis', 'ia'])
    expect(result.current.espacio.asignaciones).toHaveLength(1)
  })

  it('sin sesión no consulta nada y queda vacío', async () => {
    const { result } = await etiquetasListas('')

    expect(result.current.espacio.etiquetas).toHaveLength(0)
  })

  /*
    La regla pura corta antes del viaje: un nombre repetido devuelve su código
    con nombre propio sin tocar Supabase ni el espacio.
  */
  it('rechaza un nombre repetido con ETQ_YA_EXISTE, sin escribir', async () => {
    const { result } = await etiquetasListas()

    const resultado = await result.current.crear('tesis')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.codigo).toBe('ETQ_YA_EXISTE')
    expect(result.current.espacio.etiquetas).toHaveLength(2)
  })

  it('quitar una etiqueta ajena falla con ETQ_NO_EDITABLE', async () => {
    const { result } = await etiquetasListas()

    const resultado = await result.current.quitar('etq-de-otra-persona', 'cnf-zul-01')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.codigo).toBe('ETQ_NO_EDITABLE')
  })
})
