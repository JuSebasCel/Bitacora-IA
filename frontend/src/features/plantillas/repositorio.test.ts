import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockearBucket, mockearFalloDeTabla, mockearTabla, reiniciarMocksDeDatos } from '@/test/supabaseDePrueba'
import {
  actualizarPlantilla,
  crearPlantilla,
  descargarDocxDePlantilla,
  eliminarPlantilla,
  listarPlantillas,
  rutaDeDocx,
  subirDocxDePlantilla,
} from './repositorio'
import { crearPlantillaDesdeDocx, crearPlantillaEnBlanco } from './plantillas'

vi.mock('@/shared/supabase/cliente')

afterEach(() => {
  reiniciarMocksDeDatos()
})

const ID = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'

const FILA_EN_BLANCO = {
  id: ID,
  nombre: 'Memoria estándar',
  origen: 'blanco',
  color_principal: '#2f5fdb',
  color_secundario: '#5b6472',
  contenido: { type: 'doc', content: [{ type: 'paragraph' }] },
  ruta_archivo_original: null,
  marcadores: null,
  actualizada_el: '2026-04-02T09:00:00.000Z',
}

const FILA_DOCX = {
  id: ID,
  nombre: 'Plantilla importada',
  origen: 'docx',
  color_principal: null,
  color_secundario: null,
  contenido: null,
  ruta_archivo_original: `${ID}/original.docx`,
  marcadores: [
    {
      tipo: 'simple',
      id: 'mar-1',
      textoOriginal: '[[Nombre grupo]]',
      contexto: 'Grupo: [[Nombre grupo]]',
      origenDeDato: { tipo: 'personalizado', etiqueta: 'Nombre grupo' },
      formato: 'parrafo',
    },
  ],
  actualizada_el: '2026-04-10T09:00:00.000Z',
}

describe('listarPlantillas', () => {
  it('traduce una fila en blanco a su forma de dominio', async () => {
    mockearTabla('plantillas', [FILA_EN_BLANCO])

    const resultado = await listarPlantillas()

    expect(resultado).toEqual({
      ok: true,
      datos: [
        {
          id: ID,
          nombre: 'Memoria estándar',
          origen: 'blanco',
          colorPrincipal: '#2f5fdb',
          colorSecundario: '#5b6472',
          contenido: FILA_EN_BLANCO.contenido,
          actualizadaEl: '2026-04-02T09:00:00.000Z',
        },
      ],
    })
  })

  it('traduce una fila docx a su ruta y sus marcadores, sin bytes de por medio', async () => {
    mockearTabla('plantillas', [FILA_DOCX])

    const resultado = await listarPlantillas()

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      const [plantilla] = resultado.datos
      expect(plantilla?.origen).toBe('docx')
      if (plantilla?.origen === 'docx') {
        expect(plantilla.rutaArchivoOriginal).toBe(`${ID}/original.docx`)
        expect(plantilla.marcadores).toHaveLength(1)
      }
    }
  })

  /*
    Una fila escrita a mano desde el panel de Supabase puede llegar sin colores
    (las dos columnas son opcionales, porque una plantilla docx no las usa).
    Rellenarla es preferible a que el listado entero de todo el grupo falle por
    una fila incompleta.
  */
  it('rellena los colores ausentes en vez de romper el listado', async () => {
    mockearTabla('plantillas', [{ ...FILA_EN_BLANCO, color_principal: null, color_secundario: null }])

    const resultado = await listarPlantillas()

    expect(resultado.ok).toBe(true)
    if (resultado.ok && resultado.datos[0]?.origen === 'blanco') {
      expect(resultado.datos[0].colorPrincipal).toMatch(/^#/)
      expect(resultado.datos[0].colorSecundario).toMatch(/^#/)
    }
  })

  it('sin filas devuelve una lista vacía, no un fallo', async () => {
    mockearTabla('plantillas', [])

    expect(await listarPlantillas()).toEqual({ ok: true, datos: [] })
  })

  it('traduce un rechazo de RLS al código de sin permiso', async () => {
    mockearFalloDeTabla('plantillas', '42501')

    expect(await listarPlantillas()).toEqual({ ok: false, codigo: 'DATOS_SIN_PERMISO' })
  })

  it('traduce una caída de red al código de sin conexión', async () => {
    mockearFalloDeTabla('plantillas', '', 'TypeError: Failed to fetch')

    expect(await listarPlantillas()).toEqual({ ok: false, codigo: 'DATOS_SIN_CONEXION' })
  })
})

describe('escrituras de plantillas', () => {
  it('crear devuelve la misma plantilla que se pidió guardar', async () => {
    mockearTabla('plantillas', null)
    const plantilla = crearPlantillaEnBlanco()

    expect(await crearPlantilla(plantilla)).toEqual({ ok: true, datos: plantilla })
  })

  it('un choque de unicidad se traduce a conflicto', async () => {
    mockearFalloDeTabla('plantillas', '23505')

    expect(await crearPlantilla(crearPlantillaEnBlanco())).toEqual({ ok: false, codigo: 'DATOS_CONFLICTO' })
  })

  it('actualizar devuelve la plantilla pedida, para no reconciliar dos versiones mientras se escribe', async () => {
    mockearTabla('plantillas', null)
    const plantilla = crearPlantillaDesdeDocx(ID, rutaDeDocx(ID), 'Importada', [])

    expect(await actualizarPlantilla(plantilla)).toEqual({ ok: true, datos: plantilla })
  })

  it('eliminar propaga el fallo con su código traducido', async () => {
    mockearFalloDeTabla('plantillas', '42501')

    expect(await eliminarPlantilla(ID)).toEqual({ ok: false, codigo: 'DATOS_SIN_PERMISO' })
  })
})

describe('archivo .docx en el bucket', () => {
  it('sube el archivo bajo la carpeta de su plantilla y devuelve la ruta guardada en la fila', async () => {
    const bucket = mockearBucket()
    const archivo = new File([new Uint8Array(4)], 'tem.docx')

    const resultado = await subirDocxDePlantilla(ID, archivo)

    expect(resultado).toEqual({ ok: true, datos: `${ID}/original.docx` })
    expect(bucket.upload).toHaveBeenCalledWith(`${ID}/original.docx`, archivo, expect.objectContaining({ upsert: true }))
  })

  it('descarga el archivo por su ruta', async () => {
    const contenido = new Blob(['bytes'])
    mockearBucket({ [`${ID}/original.docx`]: contenido })

    expect(await descargarDocxDePlantilla(`${ID}/original.docx`)).toEqual({ ok: true, datos: contenido })
  })

  /*
    Storage no habla el mismo idioma de errores que Postgres, así que sus dos
    fallos llevan códigos propios del dominio en vez de pasar por la traducción
    de `PostgrestError`.
  */
  it('una descarga vacía se reporta como fallo de descarga, no como plantilla inexistente', async () => {
    mockearBucket()

    expect(await descargarDocxDePlantilla('ruta/que-no-existe.docx')).toEqual({
      ok: false,
      codigo: 'PLANT_DOCX_FALLO_DESCARGA',
    })
  })
})
