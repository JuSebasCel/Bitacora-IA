import { beforeEach, describe, expect, it } from 'vitest'
import {
  CLAVE_PLANTILLAS,
  eliminarPlantilla,
  guardarPlantilla,
  todasLasPlantillas,
} from './almacenamiento'
import { crearPlantillaDesdeDocx, crearPlantillaEnBlanco } from './plantillas'
import type { MarcadorDeDocx } from './data'

beforeEach(() => {
  sessionStorage.clear()
})

const MARCADOR_SIMPLE: MarcadorDeDocx = {
  tipo: 'simple',
  id: 'mar-1',
  textoOriginal: '[[Nombre grupo]]',
  contexto: 'Grupo: [[Nombre grupo]]',
  origenDeDato: { tipo: 'personalizado', etiqueta: 'Nombre grupo' },
  formato: 'parrafo',
}

describe('todasLasPlantillas', () => {
  it('sin nada guardado, devuelve la semilla del fixture', () => {
    const plantillas = todasLasPlantillas()

    expect(plantillas.some((plantilla) => plantilla.nombre === 'Memoria estándar')).toBe(true)
  })

  it('un valor corrupto en sessionStorage se descarta y cae a la semilla', () => {
    sessionStorage.setItem(CLAVE_PLANTILLAS, '{ esto no es JSON')

    expect(todasLasPlantillas().length).toBeGreaterThan(0)
  })

  it('una entrada sin forma válida se descarta en silencio, sin tumbar el resto', () => {
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([{ id: 'sin-nombre-ni-origen' }]))

    expect(todasLasPlantillas()).toEqual([])
  })

  it('acepta una plantilla en blanco válida', () => {
    const plantilla = crearPlantillaEnBlanco()
    guardarPlantilla(plantilla)

    expect(todasLasPlantillas().map((candidata) => candidata.id)).toContain(plantilla.id)
  })

  it('acepta una plantilla docx válida y descarta un marcador con forma inválida', () => {
    const plantilla = crearPlantillaDesdeDocx('data:application/octet-stream;base64,AA==', 'Prueba', [
      MARCADOR_SIMPLE,
    ])
    sessionStorage.setItem(
      CLAVE_PLANTILLAS,
      JSON.stringify([
        plantilla,
        { ...plantilla, id: 'pla-marcador-invalido', marcadores: [{ tipo: 'simple' }] },
      ]),
    )

    const leidas = todasLasPlantillas()

    expect(leidas.map((candidata) => candidata.id)).toEqual([plantilla.id])
  })
})

describe('guardarPlantilla', () => {
  it('agrega una plantilla nueva y sobrevive a una nueva lectura', () => {
    const plantilla = crearPlantillaEnBlanco()
    guardarPlantilla(plantilla)

    expect(todasLasPlantillas().map((candidata) => candidata.id)).toContain(plantilla.id)
  })

  it('reemplaza una plantilla existente por id en vez de duplicarla', () => {
    const plantilla = crearPlantillaEnBlanco()
    guardarPlantilla(plantilla)

    const renombrada = { ...plantilla, nombre: 'Con nombre nuevo' }
    guardarPlantilla(renombrada)

    const leidas = todasLasPlantillas().filter((candidata) => candidata.id === plantilla.id)
    expect(leidas).toHaveLength(1)
    expect(leidas[0]?.nombre).toBe('Con nombre nuevo')
  })
})

describe('eliminarPlantilla', () => {
  it('la quita de lecturas posteriores', () => {
    const plantilla = crearPlantillaEnBlanco()
    guardarPlantilla(plantilla)

    eliminarPlantilla(plantilla.id)

    expect(todasLasPlantillas().map((candidata) => candidata.id)).not.toContain(plantilla.id)
  })

  it('borrar la última plantilla deja un arreglo vacío guardado, sin resucitar la semilla', () => {
    for (const plantilla of todasLasPlantillas()) {
      eliminarPlantilla(plantilla.id)
    }

    expect(todasLasPlantillas()).toEqual([])
  })
})
