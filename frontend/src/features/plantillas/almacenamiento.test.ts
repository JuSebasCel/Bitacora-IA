import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_PLANTILLAS, eliminarPlantilla, guardarPlantilla, todasLasPlantillas } from './almacenamiento'
import type { Plantilla } from './data'

const PLANTILLA_DE_PRUEBA: Plantilla = {
  id: 'pla-prueba',
  nombre: 'Plantilla de prueba',
  colorPrincipal: '#123456',
  colorSecundario: '#654321',
  elementos: [],
  actualizadaEl: '2026-06-01T00:00:00.000Z',
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('todasLasPlantillas', () => {
  it('sin nada guardado, devuelve la semilla del fixture', () => {
    const plantillas = todasLasPlantillas()

    expect(plantillas.some((plantilla) => plantilla.id === 'pla-memoria-estandar')).toBe(true)
  })

  it('un valor corrupto en sessionStorage se descarta y cae a la semilla', () => {
    sessionStorage.setItem(CLAVE_PLANTILLAS, '{ esto no es JSON')

    const plantillas = todasLasPlantillas()

    expect(plantillas.some((plantilla) => plantilla.id === 'pla-memoria-estandar')).toBe(true)
  })

  it('una entrada individual corrupta se descarta, sin perder las válidas', () => {
    sessionStorage.setItem(
      CLAVE_PLANTILLAS,
      JSON.stringify([PLANTILLA_DE_PRUEBA, { nombre: 'sin id ni elementos' }]),
    )

    const plantillas = todasLasPlantillas()

    expect(plantillas.some((plantilla) => plantilla.id === 'pla-prueba')).toBe(true)
    expect(plantillas.some((plantilla) => plantilla.nombre === 'sin id ni elementos')).toBe(false)
  })
})

describe('guardarPlantilla', () => {
  it('con un id nuevo, lo añade sin reemplazar lo existente', () => {
    guardarPlantilla(PLANTILLA_DE_PRUEBA)

    const plantillas = todasLasPlantillas()

    expect(plantillas.some((plantilla) => plantilla.id === 'pla-prueba')).toBe(true)
    expect(plantillas.some((plantilla) => plantilla.id === 'pla-memoria-estandar')).toBe(true)
  })

  it('con un id ya guardado, reemplaza esa entrada en vez de duplicarla', () => {
    guardarPlantilla(PLANTILLA_DE_PRUEBA)
    guardarPlantilla({ ...PLANTILLA_DE_PRUEBA, nombre: 'Nombre actualizado' })

    const plantillas = todasLasPlantillas()
    const coincidencias = plantillas.filter((plantilla) => plantilla.id === 'pla-prueba')

    expect(coincidencias).toHaveLength(1)
    expect(coincidencias[0]?.nombre).toBe('Nombre actualizado')
  })

  it('sobrevive a una nueva lectura', () => {
    guardarPlantilla(PLANTILLA_DE_PRUEBA)

    expect(todasLasPlantillas().map((plantilla) => plantilla.id)).toContain('pla-prueba')
    expect(todasLasPlantillas().map((plantilla) => plantilla.id)).toContain('pla-prueba')
  })
})

describe('eliminarPlantilla', () => {
  it('quita una plantilla previamente guardada', () => {
    guardarPlantilla(PLANTILLA_DE_PRUEBA)
    eliminarPlantilla('pla-prueba')

    expect(todasLasPlantillas().some((plantilla) => plantilla.id === 'pla-prueba')).toBe(false)
  })

  it('puede dejar el arreglo guardado legítimamente vacío, sin volver a la semilla', () => {
    for (const plantilla of todasLasPlantillas()) {
      eliminarPlantilla(plantilla.id)
    }

    expect(todasLasPlantillas()).toEqual([])
  })
})
