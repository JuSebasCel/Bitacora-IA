import { describe, expect, it } from 'vitest'
import {
  CAMPOS_DE_MARCADOR,
  DATOS_DE_EJEMPLO,
  ETIQUETAS_DE_CAMPO,
  etiquetaDeOrigen,
  resolverCondicionDeMarcador,
  resolverListaDeMarcador,
  resolverMarcador,
} from './campos'
import type { OrigenDeMarcador } from './tipos'

describe('etiquetaDeOrigen', () => {
  it('para un campo fijo, devuelve su etiqueta legible', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'nombre_ponente' }

    expect(etiquetaDeOrigen(origen)).toBe(ETIQUETAS_DE_CAMPO.nombre_ponente)
  })

  it('para uno personalizado, devuelve la etiqueta tal cual', () => {
    const origen: OrigenDeMarcador = { tipo: 'personalizado', etiqueta: 'Puntos de la agenda' }

    expect(etiquetaDeOrigen(origen)).toBe('Puntos de la agenda')
  })
})

describe('resolverMarcador', () => {
  it('cada uno de los cinco campos fijos tiene dato de ejemplo para párrafo y lista', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      const origen: OrigenDeMarcador = { tipo: 'campo', campo }

      expect(typeof resolverMarcador(origen, 'parrafo')).toBe('string')
      expect(Array.isArray(resolverMarcador(origen, 'lista_vinetas'))).toBe(true)
      expect(Array.isArray(resolverMarcador(origen, 'lista_numerada'))).toBe(true)
    }
  })

  it('un origen personalizado sin fixture propio igual resuelve un dato de ejemplo', () => {
    const origen: OrigenDeMarcador = { tipo: 'personalizado', etiqueta: 'Puntos de la agenda' }

    const parrafo = resolverMarcador(origen, 'parrafo')
    expect(typeof parrafo).toBe('string')
    expect(parrafo).toContain('Puntos de la agenda')
  })
})

describe('resolverListaDeMarcador', () => {
  it('devuelve el mismo arreglo que resolverMarcador con formato de lista', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'resumen_metodo' }

    expect(resolverListaDeMarcador(origen)).toEqual(DATOS_DE_EJEMPLO.resumen_metodo.lista)
  })
})

describe('resolverCondicionDeMarcador', () => {
  it('los datos de ejemplo siempre están presentes, así que la condición siempre es verdadera', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      expect(resolverCondicionDeMarcador({ tipo: 'campo', campo })).toBe(true)
    }

    expect(resolverCondicionDeMarcador({ tipo: 'personalizado', etiqueta: 'Lo que sea' })).toBe(true)
  })
})
