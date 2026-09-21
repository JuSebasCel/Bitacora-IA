import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plantilla } from './data'
import { crearPlantillaDesdeDocx } from './plantillas'
import type { ResultadoPlantilla } from './plantillas'
import { ESPERA_DE_GUARDADO_MS, usePlantillas } from './usePlantillas'

/*
  El hook se prueba contra el repositorio sustituido, que es el límite del
  dominio: lo que importa aquí es qué se guarda y cuándo, no qué consulta se
  arma (eso lo cubre `repositorio.test.ts` contra el cliente simulado).
*/
const repositorio = vi.hoisted(() => ({
  listarPlantillas: vi.fn(),
  crearPlantilla: vi.fn(),
  actualizarPlantilla: vi.fn(),
  eliminarPlantilla: vi.fn(),
  subirDocxDePlantilla: vi.fn(),
  descargarDocxDePlantilla: vi.fn(),
  eliminarDocxDePlantilla: vi.fn(),
}))

vi.mock('./repositorio', () => repositorio)

const ID_GUARDADA = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
const PLANTILLA_GUARDADA: Plantilla = crearPlantillaDesdeDocx(
  ID_GUARDADA,
  `${ID_GUARDADA}/original.docx`,
  'Memoria estándar',
  [],
)

const ARCHIVO_DOCX = new File([new Uint8Array(8)], 'tem.docx', {
  type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
})

beforeEach(() => {
  repositorio.listarPlantillas.mockResolvedValue({ ok: true, datos: [PLANTILLA_GUARDADA] })
  repositorio.crearPlantilla.mockImplementation((plantilla: Plantilla) =>
    Promise.resolve({ ok: true, datos: plantilla }),
  )
  repositorio.actualizarPlantilla.mockImplementation((plantilla: Plantilla) =>
    Promise.resolve({ ok: true, datos: plantilla }),
  )
  repositorio.eliminarPlantilla.mockResolvedValue({ ok: true, datos: null })
  repositorio.subirDocxDePlantilla.mockImplementation((id: string) =>
    Promise.resolve({ ok: true, datos: `${id}/original.docx` }),
  )
  repositorio.eliminarDocxDePlantilla.mockResolvedValue({ ok: true, datos: null })
})

afterEach(() => {
  vi.useRealTimers()
  /* Desmontar antes de vaciar los simulacros: ver la nota en plantillas/screens/politica.test.tsx. */
  cleanup()
  vi.resetAllMocks()
})

/** Monta el hook y espera a que la lectura inicial termine, que es el estado desde el que se opera. */
async function montarCargado() {
  const { result } = renderHook(() => usePlantillas())
  await waitFor(() => expect(result.current.cargando).toBe(false))
  return result
}

describe('usePlantillas, carga inicial', () => {
  it('arranca cargando y sin plantillas, para no afirmar que no hay ninguna antes de saberlo', () => {
    repositorio.listarPlantillas.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlantillas())

    expect(result.current.cargando).toBe(true)
    expect(result.current.plantillas).toEqual([])
  })

  it('trae el listado del repositorio', async () => {
    const result = await montarCargado()

    expect(result.current.plantillas).toEqual([PLANTILLA_GUARDADA])
    expect(result.current.codigoDeError).toBeNull()
  })

  it('si la lectura falla, expone el código en vez de quedarse en un vacío mudo', async () => {
    repositorio.listarPlantillas.mockResolvedValue({ ok: false, codigo: 'DATOS_SIN_CONEXION' })

    const result = await montarCargado()

    expect(result.current.codigoDeError).toBe('DATOS_SIN_CONEXION')
    expect(result.current.plantillas).toEqual([])
  })
})

describe('usePlantillas, crear desde .docx', () => {
  it('sube el archivo antes de insertar la fila, y guarda solo su ruta', async () => {
    const result = await montarCargado()

    let creada: ResultadoPlantilla | undefined
    await act(async () => {
      creada = await result.current.crearDesdeDocx(ARCHIVO_DOCX, 'Importada', [])
    })

    expect(creada?.ok).toBe(true)
    if (creada?.ok && creada.plantilla.origen === 'docx') {
      expect(repositorio.subirDocxDePlantilla).toHaveBeenCalledWith(creada.plantilla.id, ARCHIVO_DOCX)
      expect(creada.plantilla.rutaArchivoOriginal).toBe(`${creada.plantilla.id}/original.docx`)
    }
  })

  it('si la subida falla, ni siquiera intenta insertar la fila', async () => {
    repositorio.subirDocxDePlantilla.mockResolvedValue({ ok: false, codigo: 'PLANT_DOCX_FALLO_SUBIDA' })
    const result = await montarCargado()

    let creada: ResultadoPlantilla | undefined
    await act(async () => {
      creada = await result.current.crearDesdeDocx(ARCHIVO_DOCX, 'Importada', [])
    })

    expect(creada).toEqual({ ok: false, codigo: 'PLANT_DOCX_FALLO_SUBIDA' })
    expect(repositorio.crearPlantilla).not.toHaveBeenCalled()
  })

  /*
    Postgres y Storage no comparten transacción: si la fila no entra, el
    archivo ya subido no lo nombra nadie y se quedaría en el bucket para
    siempre.
  */
  it('si el insert falla después de subir, borra el archivo que quedó huérfano', async () => {
    repositorio.crearPlantilla.mockResolvedValue({ ok: false, codigo: 'DATOS_FALLO_INESPERADO' })
    const result = await montarCargado()

    await act(async () => {
      await result.current.crearDesdeDocx(ARCHIVO_DOCX, 'Importada', [])
    })

    expect(repositorio.eliminarDocxDePlantilla).toHaveBeenCalledOnce()
  })
})

describe('usePlantillas, ediciones diferidas', () => {
  it('renombrar se ve al instante y se guarda una sola vez tras la ráfaga de tecleo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const result = await montarCargado()

    act(() => {
      result.current.renombrarPlantilla(PLANTILLA_GUARDADA.id, 'Memo')
    })
    act(() => {
      result.current.renombrarPlantilla(PLANTILLA_GUARDADA.id, 'Memoria de cierre')
    })

    expect(result.current.plantillas[0]?.nombre).toBe('Memoria de cierre')
    expect(repositorio.actualizarPlantilla).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(ESPERA_DE_GUARDADO_MS)
    })

    expect(repositorio.actualizarPlantilla).toHaveBeenCalledOnce()
    expect(repositorio.actualizarPlantilla.mock.calls[0]?.[0]).toMatchObject({ nombre: 'Memoria de cierre' })
  })

  it('renombrar con un nombre vacío devuelve el error sin guardar nada', async () => {
    const result = await montarCargado()

    let resultado: ResultadoPlantilla | undefined
    act(() => {
      resultado = result.current.renombrarPlantilla(PLANTILLA_GUARDADA.id, '   ')
    })

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_REQUERIDO' })
    expect(repositorio.actualizarPlantilla).not.toHaveBeenCalled()
  })

  it('renombrar una plantilla que ya no está devuelve PLANT_NO_ENCONTRADA', async () => {
    const result = await montarCargado()

    let resultado: ResultadoPlantilla | undefined
    act(() => {
      resultado = result.current.renombrarPlantilla('11111111-2222-4333-8444-555555555555', 'Nombre')
    })

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NO_ENCONTRADA' })
  })

  it('cambiar los marcadores actualiza el estado y termina en una escritura', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const result = await montarCargado()
    const marcador = {
      tipo: 'simple',
      id: 'mar-1',
      textoOriginal: '[[Tesis]]',
      contexto: '[[Tesis]]',
      origenDeDato: { tipo: 'personalizado', etiqueta: 'Tesis' },
      formato: 'parrafo',
      instruccion: 'La idea central',
    } as const

    act(() => {
      result.current.actualizarMarcadoresDeDocx(PLANTILLA_GUARDADA.id, [marcador])
    })

    await act(async () => {
      vi.advanceTimersByTime(ESPERA_DE_GUARDADO_MS)
    })

    expect(repositorio.actualizarPlantilla).toHaveBeenCalledOnce()
    expect(repositorio.actualizarPlantilla.mock.calls[0]?.[0]).toMatchObject({ marcadores: [marcador] })
  })

  /*
    Salir del editor es el momento en que una edición a medio guardar se
    perdería, y el más probable: se escribe y se vuelve al listado en el mismo
    segundo, mucho antes de que venza la espera.
  */
  it('al desmontar, manda de inmediato lo que quedara pendiente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result, unmount } = renderHook(() => usePlantillas())
    await waitFor(() => expect(result.current.cargando).toBe(false))

    act(() => {
      result.current.renombrarPlantilla(PLANTILLA_GUARDADA.id, 'Sin tiempo de guardarse')
    })
    expect(repositorio.actualizarPlantilla).not.toHaveBeenCalled()

    unmount()

    expect(repositorio.actualizarPlantilla).toHaveBeenCalledOnce()
    expect(repositorio.actualizarPlantilla.mock.calls[0]?.[0]).toMatchObject({ nombre: 'Sin tiempo de guardarse' })
  })
})

describe('usePlantillas, eliminar', () => {
  it('la quita del listado y la borra en el repositorio', async () => {
    const result = await montarCargado()

    await act(async () => {
      await result.current.eliminar(PLANTILLA_GUARDADA.id)
    })

    expect(result.current.plantillas).toEqual([])
    expect(repositorio.eliminarPlantilla).toHaveBeenCalledWith(PLANTILLA_GUARDADA.id)
  })

  /* Borrar la fila y dejar el archivo llenaría el bucket de documentos que ya no nombra nadie. */
  it('de una plantilla importada, borra también su archivo del bucket', async () => {
    const result = await montarCargado()

    let creada: ResultadoPlantilla | undefined
    await act(async () => {
      creada = await result.current.crearDesdeDocx(ARCHIVO_DOCX, 'Importada', [])
    })

    const id = creada?.ok === true ? creada.plantilla.id : ''
    await act(async () => {
      await result.current.eliminar(id)
    })

    expect(repositorio.eliminarDocxDePlantilla).toHaveBeenCalledWith(`${id}/original.docx`)
  })
})
