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
import type { OrigenDeMarcador, RegistroDeDatosDeCampo } from './tipos'

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

  it('con datos reales para el campo, los usa en vez del dato de ejemplo', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'nombre_ponente' }
    const datosReales: RegistroDeDatosDeCampo = {
      nombre_ponente: { parrafo: 'Rodrigo Peñaloza', lista: ['Rodrigo Peñaloza'] },
    }

    expect(resolverMarcador(origen, 'parrafo', datosReales)).toBe('Rodrigo Peñaloza')
  })

  it('con datos reales que no cubren ese campo, cae al dato de ejemplo', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'cita_destacada' }
    const datosReales: RegistroDeDatosDeCampo = {
      nombre_ponente: { parrafo: 'Mariana Escobar Vallejo', lista: ['Mariana Escobar Vallejo'] },
    }

    expect(resolverMarcador(origen, 'parrafo', datosReales)).toBe(DATOS_DE_EJEMPLO.cita_destacada.parrafo)
  })

  it('un origen personalizado ignora los datos reales, siempre usa el dato de ejemplo', () => {
    const origen: OrigenDeMarcador = { tipo: 'personalizado', etiqueta: 'Puntos de la agenda' }
    const datosReales: RegistroDeDatosDeCampo = {
      tema_principal: { parrafo: 'Un tema real', lista: ['Un tema real'] },
    }

    const parrafo = resolverMarcador(origen, 'parrafo', datosReales)
    expect(parrafo).toContain('Puntos de la agenda')
  })
})

describe('resolverListaDeMarcador', () => {
  it('devuelve el mismo arreglo que resolverMarcador con formato de lista', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'resumen_metodo' }

    expect(resolverListaDeMarcador(origen)).toEqual(DATOS_DE_EJEMPLO.resumen_metodo.lista)
  })

  it('con datos reales para el campo, devuelve esa lista en vez de la de ejemplo', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'cita_destacada' }
    const datosReales: RegistroDeDatosDeCampo = {
      cita_destacada: { parrafo: 'Una cita real', lista: ['Una cita real', 'Otra cita real'] },
    }

    expect(resolverListaDeMarcador(origen, datosReales)).toEqual(['Una cita real', 'Otra cita real'])
  })
})

describe('resolverCondicionDeMarcador', () => {
  it('los datos de ejemplo siempre están presentes, así que la condición siempre es verdadera', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      expect(resolverCondicionDeMarcador({ tipo: 'campo', campo })).toBe(true)
    }

    expect(resolverCondicionDeMarcador({ tipo: 'personalizado', etiqueta: 'Lo que sea' })).toBe(true)
  })

  it('con datos reales vacíos para el campo, la condición es falsa', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'cita_destacada' }
    const datosReales: RegistroDeDatosDeCampo = {
      cita_destacada: { parrafo: '', lista: [] },
    }

    expect(resolverCondicionDeMarcador(origen, datosReales)).toBe(false)
  })

  it('con datos reales para otro campo, la condición de este sigue cayendo al dato de ejemplo (verdadera)', () => {
    const origen: OrigenDeMarcador = { tipo: 'campo', campo: 'resumen_metodo' }
    const datosReales: RegistroDeDatosDeCampo = {
      cita_destacada: { parrafo: '', lista: [] },
    }

    expect(resolverCondicionDeMarcador(origen, datosReales)).toBe(true)
  })
})
