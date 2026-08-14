import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVE_ETIQUETAS } from './almacenamiento'
import { useEtiquetas } from './useEtiquetas'

const ZULUAGA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'
const PENALOZA = '1f265edb-88ff-48fb-aeaf-1ff0c8d49aa5'

function nombresDe(etiquetas: readonly { nombre: string }[]): string[] {
  return etiquetas.map((etiqueta) => etiqueta.nombre)
}

describe('useEtiquetas', () => {
  it('arranca con las etiquetas del fixture de esa persona', () => {
    const { result } = renderHook(() => useEtiquetas(ZULUAGA))

    expect(nombresDe(result.current.espacio.etiquetas)).toContain('tesis')
  })

  it('arranca vacío para quien todavía no tiene ninguna', () => {
    const { result } = renderHook(() => useEtiquetas(PENALOZA))

    expect(result.current.espacio.etiquetas).toHaveLength(0)
  })

  it('deja disponible una etiqueta recién creada sin recargar', () => {
    const { result } = renderHook(() => useEtiquetas(PENALOZA))

    act(() => {
      result.current.crear('art9')
    })

    expect(nombresDe(result.current.espacio.etiquetas)).toEqual(['art9'])
  })

  it('persiste la etiqueta creada para que sobreviva a un recargado', () => {
    const { result } = renderHook(() => useEtiquetas(PENALOZA))

    act(() => {
      result.current.crear('art9')
    })

    expect(sessionStorage.getItem(CLAVE_ETIQUETAS)).toContain('art9')

    const segundaVisita = renderHook(() => useEtiquetas(PENALOZA))
    expect(nombresDe(segundaVisita.result.current.espacio.etiquetas)).toEqual(['art9'])
  })

  it('devuelve el código de error y no toca el espacio ante un nombre repetido', () => {
    const { result } = renderHook(() => useEtiquetas(ZULUAGA))
    const antes = result.current.espacio.etiquetas.length

    let codigo = ''
    act(() => {
      const resultado = result.current.crear('tesis')
      if (!resultado.ok) {
        codigo = resultado.codigo
      }
    })

    expect(codigo).toBe('ETQ_YA_EXISTE')
    expect(result.current.espacio.etiquetas).toHaveLength(antes)
  })

  it('asigna y quita una etiqueta sobre una conferencia', () => {
    const { result } = renderHook(() => useEtiquetas(ZULUAGA))

    act(() => {
      result.current.asignar('etq-zul-ia', 'cnf-zul-03')
    })

    expect(
      result.current.espacio.asignaciones.some(
        (asignacion) =>
          asignacion.idEtiqueta === 'etq-zul-ia' && asignacion.idConferencia === 'cnf-zul-03',
      ),
    ).toBe(true)

    act(() => {
      result.current.quitar('etq-zul-ia', 'cnf-zul-03')
    })

    expect(
      result.current.espacio.asignaciones.some(
        (asignacion) =>
          asignacion.idEtiqueta === 'etq-zul-ia' && asignacion.idConferencia === 'cnf-zul-03',
      ),
    ).toBe(false)
  })

  it('rechaza quitar una etiqueta ajena sin alterar el espacio', () => {
    const { result } = renderHook(() => useEtiquetas(ZULUAGA))
    const antes = result.current.espacio.asignaciones.length

    let codigo = ''
    act(() => {
      const resultado = result.current.quitar('etq-alc-ia', 'cnf-alc-01')
      if (!resultado.ok) {
        codigo = resultado.codigo
      }
    })

    expect(codigo).toBe('ETQ_NO_EDITABLE')
    expect(result.current.espacio.asignaciones).toHaveLength(antes)
  })

  /*
    Cerrar sesión y entrar con otra cuenta no puede dejar a la vista las
    etiquetas de la anterior, ni por un render intermedio.
  */
  it('cambia de espacio al cambiar de persona', () => {
    const { result, rerender } = renderHook(({ idUsuario }) => useEtiquetas(idUsuario), {
      initialProps: { idUsuario: ZULUAGA },
    })

    expect(nombresDe(result.current.espacio.etiquetas)).toContain('tesis')

    rerender({ idUsuario: PENALOZA })

    expect(result.current.espacio.etiquetas).toHaveLength(0)
  })
})
