import { describe, expect, it } from 'vitest'
import { CAMPOS_DE_MARCADOR, DATOS_DE_EJEMPLO, ETIQUETAS_DE_CAMPO } from './campos'

describe('CAMPOS_DE_MARCADOR', () => {
  it('lista los cinco campos nombrados en PLAN.md 5.6', () => {
    expect(CAMPOS_DE_MARCADOR).toEqual([
      'tema_principal',
      'cita_destacada',
      'nombre_ponente',
      'fecha_evento',
      'resumen_metodo',
    ])
  })
})

describe('ETIQUETAS_DE_CAMPO', () => {
  it('trae una etiqueta legible para cada campo', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      expect(ETIQUETAS_DE_CAMPO[campo].trim().length).toBeGreaterThan(0)
    }
  })

  it('ninguna etiqueta repite el nombre técnico del campo con guion bajo', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      expect(ETIQUETAS_DE_CAMPO[campo]).not.toContain('_')
    }
  })
})

describe('DATOS_DE_EJEMPLO', () => {
  it('cubre los dos formatos para cada campo', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      expect(DATOS_DE_EJEMPLO[campo].parrafo.trim().length).toBeGreaterThan(0)
      expect(DATOS_DE_EJEMPLO[campo].lista.length).toBeGreaterThan(0)
    }
  })

  it('el formato de lista trae cada elemento con contenido, no vacío', () => {
    for (const campo of CAMPOS_DE_MARCADOR) {
      for (const elemento of DATOS_DE_EJEMPLO[campo].lista) {
        expect(elemento.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
