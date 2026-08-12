import { describe, expect, it } from 'vitest'
import { detectarMarcadoresEnDocx } from './detectarMarcadoresEnDocx'

const NS_W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function parrafo(texto: string): string {
  return `<w:p><w:r><w:t xml:space="preserve">${texto}</w:t></w:r></w:p>`
}

function documentoXml(parrafos: readonly string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${NS_W}">
  <w:body>
    ${parrafos.join('\n')}
    <w:sectPr/>
  </w:body>
</w:document>`
}

describe('detectarMarcadoresEnDocx', () => {
  it('sin marcas [[...]], no detecta nada', () => {
    const xml = documentoXml([parrafo('Memoria de reunión'), parrafo('Texto sin marcas.')])

    expect(detectarMarcadoresEnDocx(xml)).toEqual([])
  })

  it('detecta un marcador simple con su texto exacto', () => {
    const xml = documentoXml([parrafo('Grupo de investigación: [[Nombre grupo]]')])

    const marcadores = detectarMarcadoresEnDocx(xml)

    expect(marcadores).toHaveLength(1)
    expect(marcadores[0]).toMatchObject({
      tipo: 'simple',
      textoOriginal: '[[Nombre grupo]]',
      contexto: 'Grupo de investigación: [[Nombre grupo]]',
    })
  })

  it('detecta varios marcadores simples en párrafos distintos, en orden', () => {
    const xml = documentoXml([parrafo('Fecha: [[Fecha del evento]]'), parrafo('Ponente: [[Nombre ponente]]')])

    const marcadores = detectarMarcadoresEnDocx(xml)

    expect(marcadores.map((marcador) => (marcador.tipo === 'simple' ? marcador.textoOriginal : null))).toEqual([
      '[[Fecha del evento]]',
      '[[Nombre ponente]]',
    ])
  })

  it('detecta más de un marcador simple dentro del mismo párrafo', () => {
    const xml = documentoXml([parrafo('[[Uno]] y [[Dos]]')])

    const marcadores = detectarMarcadoresEnDocx(xml)

    expect(marcadores.map((marcador) => (marcador.tipo === 'simple' ? marcador.textoOriginal : null))).toEqual([
      '[[Uno]]',
      '[[Dos]]',
    ])
  })

  it('reconoce una sección condicional completa, con su descripción', () => {
    const xml = documentoXml([
      parrafo('[[SI: Cita opcional]]'),
      parrafo('Cita: [[La cita en sí]]'),
      parrafo('[[FIN SI]]'),
    ])

    const marcadores = detectarMarcadoresEnDocx(xml)

    expect(marcadores[0]).toMatchObject({ tipo: 'condicional', descripcion: 'Cita opcional' })
    // El marcador simple dentro de la condicional se sigue detectando de forma independiente.
    expect(marcadores[1]).toMatchObject({ tipo: 'simple', textoOriginal: '[[La cita en sí]]' })
  })

  it('reconoce una sección repetible, sin generar un marcador propio para el placeholder interno', () => {
    const xml = documentoXml([
      parrafo('[[REPETIR: Lista de puntos]]'),
      parrafo('- [[punto actual]]'),
      parrafo('[[FIN REPETIR]]'),
    ])

    const marcadores = detectarMarcadoresEnDocx(xml)

    expect(marcadores).toHaveLength(1)
    expect(marcadores[0]).toMatchObject({ tipo: 'repetible', descripcion: 'Lista de puntos' })
  })

  it('documento real de ejemplo: cinco marcadores simples, ninguna sección', () => {
    const xml = documentoXml([
      parrafo('Memoria de reunión'),
      parrafo('Grupo de investigación: [[Nombre grupo]]'),
      parrafo('Fecha: [[Fecha de realización]]'),
      parrafo('Asistentes: [[Asistentes a la conferencia]]'),
      parrafo('Agenda:'),
      parrafo('[[Bullet points de la agenda, si no hay no se coloca esa sección]]'),
      parrafo('Desarrollo.'),
      parrafo('[[Desarrollo por puntos 1, 2, 3…, n]]'),
    ])

    const marcadores = detectarMarcadoresEnDocx(xml)

    expect(marcadores).toHaveLength(5)
    expect(marcadores.every((marcador) => marcador.tipo === 'simple')).toBe(true)
  })

  it('un XML sin <w:body> no revienta, devuelve un arreglo vacío', () => {
    expect(detectarMarcadoresEnDocx('<algo>no es un documento de word</algo>')).toEqual([])
  })
})
