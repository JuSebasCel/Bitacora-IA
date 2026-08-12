import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CLAVE_PLANTILLAS } from './almacenamiento'
import type { Plantilla } from './data'
import type { ResultadoPlantilla } from './plantillas'
import { usePlantillas } from './usePlantillas'

describe('usePlantillas', () => {
  it('arranca con la semilla del fixture', () => {
    const { result } = renderHook(() => usePlantillas())

    expect(result.current.plantillas.some((plantilla) => plantilla.nombre === 'Memoria estándar')).toBe(true)
  })

  it('crear agrega una plantilla en blanco y la deja disponible sin recargar', () => {
    const { result } = renderHook(() => usePlantillas())
    const antes = result.current.plantillas.length

    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crear()
    })

    expect(result.current.plantillas).toHaveLength(antes + 1)
    expect(result.current.plantillas.some((plantilla) => plantilla.id === nueva?.id)).toBe(true)
  })

  it('crear persiste de inmediato', () => {
    const { result } = renderHook(() => usePlantillas())

    act(() => {
      result.current.crear()
    })

    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).toContain('Plantilla sin nombre')
  })

  it('crearDesdeDocx agrega una plantilla origen docx con sus marcadores', () => {
    const { result } = renderHook(() => usePlantillas())

    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crearDesdeDocx('data:;base64,AA==', 'Importada', [])
    })

    expect(nueva).toMatchObject({ origen: 'docx', nombre: 'Importada' })
    expect(result.current.plantillas.some((plantilla) => plantilla.id === nueva?.id)).toBe(true)
  })

  it('renombrarPlantilla actualiza el nombre de una plantilla existente', () => {
    const { result } = renderHook(() => usePlantillas())
    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crear()
    })

    act(() => {
      result.current.renombrarPlantilla(nueva!.id, 'Nombre nuevo')
    })

    expect(result.current.plantillas.find((plantilla) => plantilla.id === nueva!.id)?.nombre).toBe('Nombre nuevo')
  })

  it('renombrarPlantilla con id inexistente devuelve PLANT_NO_ENCONTRADA', () => {
    const { result } = renderHook(() => usePlantillas())

    let resultado: ResultadoPlantilla | undefined
    act(() => {
      resultado = result.current.renombrarPlantilla('pla-no-existe', 'Nombre')
    })

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NO_ENCONTRADA' })
  })

  it('cambiarColores actualiza los colores de una plantilla en blanco', () => {
    const { result } = renderHook(() => usePlantillas())
    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crear()
    })

    act(() => {
      result.current.cambiarColores(nueva!.id, '#101010', '#202020')
    })

    expect(result.current.plantillas.find((plantilla) => plantilla.id === nueva!.id)).toMatchObject({
      colorPrincipal: '#101010',
      colorSecundario: '#202020',
    })
  })

  it('actualizarContenido reemplaza el documento de una plantilla en blanco', () => {
    const { result } = renderHook(() => usePlantillas())
    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crear()
    })

    const contenidoNuevo = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hola' }] }] }
    act(() => {
      result.current.actualizarContenido(nueva!.id, contenidoNuevo)
    })

    const actualizada = result.current.plantillas.find((plantilla) => plantilla.id === nueva!.id)
    expect(actualizada?.origen).toBe('blanco')
    if (actualizada?.origen === 'blanco') {
      expect(actualizada.contenido).toEqual(contenidoNuevo)
    }
  })

  it('actualizarMarcadoresDeDocx reemplaza los marcadores de una plantilla docx', () => {
    const { result } = renderHook(() => usePlantillas())
    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crearDesdeDocx('data:;base64,AA==', 'Importada', [])
    })

    const marcador = {
      tipo: 'simple' as const,
      id: 'mar-1',
      textoOriginal: '[[X]]',
      contexto: '[[X]]',
      origenDeDato: { tipo: 'personalizado' as const, etiqueta: 'X' },
      formato: 'parrafo' as const,
    }

    act(() => {
      result.current.actualizarMarcadoresDeDocx(nueva!.id, [marcador])
    })

    const actualizada = result.current.plantillas.find((plantilla) => plantilla.id === nueva!.id)
    expect(actualizada?.origen).toBe('docx')
    if (actualizada?.origen === 'docx') {
      expect(actualizada.marcadores).toEqual([marcador])
    }
  })

  it('eliminar la quita del estado y de sessionStorage', () => {
    const { result } = renderHook(() => usePlantillas())
    let nueva: Plantilla | undefined
    act(() => {
      nueva = result.current.crear()
    })

    act(() => {
      result.current.eliminar(nueva!.id)
    })

    expect(result.current.plantillas.some((plantilla) => plantilla.id === nueva!.id)).toBe(false)
  })

  it('podarAbandonadas quita las plantillas en blanco sin tocar, deja las demás', () => {
    const { result } = renderHook(() => usePlantillas())
    let abandonada: Plantilla | undefined
    let conNombre: Plantilla | undefined

    act(() => {
      abandonada = result.current.crear()
    })
    act(() => {
      conNombre = result.current.crear()
    })
    act(() => {
      result.current.renombrarPlantilla(conNombre!.id, 'Esta sí tiene nombre')
    })
    act(() => {
      result.current.podarAbandonadas()
    })

    expect(result.current.plantillas.some((plantilla) => plantilla.id === abandonada!.id)).toBe(false)
    expect(result.current.plantillas.some((plantilla) => plantilla.id === conNombre!.id)).toBe(true)
  })

  it('podarAbandonadas no hace nada si no hay ninguna abandonada', () => {
    const { result } = renderHook(() => usePlantillas())
    const antes = result.current.plantillas

    act(() => {
      result.current.podarAbandonadas()
    })

    expect(result.current.plantillas).toEqual(antes)
  })
})
