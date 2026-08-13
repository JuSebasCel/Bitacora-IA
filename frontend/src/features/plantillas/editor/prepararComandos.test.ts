import { describe, expect, it } from 'vitest'
import type { MarcadorDeDocx, RegistroDeDatosDeCampo } from '../data'
import { detectarMarcadoresEnDocx } from './detectarMarcadoresEnDocx'
import { prepararComandos } from './prepararComandos'

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

function conCampo(marcador: MarcadorDeDocx, etiqueta: string): MarcadorDeDocx {
  return { ...marcador, origenDeDato: { tipo: 'personalizado', etiqueta } }
}

function conCampoFijo(marcador: MarcadorDeDocx): MarcadorDeDocx {
  return { ...marcador, origenDeDato: { tipo: 'campo', campo: 'nombre_ponente' } }
}

describe('prepararComandos', () => {
  it('reemplaza un marcador simple por un comando INS con su propia variable', () => {
    const xml = documentoXml([parrafo('Grupo: [[Nombre grupo]]')])
    const [marcador] = detectarMarcadoresEnDocx(xml)
    if (marcador === undefined) throw new Error('se esperaba un marcador')

    const { documentXml, datos } = prepararComandos(xml, [marcador])

    expect(documentXml).toContain('Grupo: [[m_')
    expect(documentXml).not.toContain('[[Nombre grupo]]')
    expect(Object.keys(datos)).toHaveLength(1)
    expect(Object.values(datos)[0]).toEqual(expect.any(String))
  })

  it('dos marcadores con el mismo texto literal reciben variables distintas', () => {
    const xml = documentoXml([parrafo('[[Nombre]] y también [[Nombre]]')])
    const marcadores = detectarMarcadoresEnDocx(xml)
    expect(marcadores).toHaveLength(2)

    const { datos } = prepararComandos(xml, marcadores)

    expect(Object.keys(datos)).toHaveLength(2)
  })

  it('traduce una sección condicional a IF/END-IF con un booleano', () => {
    const xml = documentoXml([parrafo('[[SI: Cita opcional]]'), parrafo('Cita.'), parrafo('[[FIN SI]]')])
    const marcadores = detectarMarcadoresEnDocx(xml)

    const { documentXml, datos } = prepararComandos(xml, marcadores)

    expect(documentXml).toMatch(/\[\[IF m_\S+\]\]/)
    expect(documentXml).toContain('[[END-IF]]')
    expect(documentXml).not.toContain('[[SI:')
    expect(Object.values(datos)).toEqual([true])
  })

  it('traduce una sección repetible a FOR/END-FOR con un arreglo, y liga el marcador interno al ítem', () => {
    const xml = documentoXml([
      parrafo('[[REPETIR: Lista de puntos]]'),
      parrafo('- [[punto actual]]'),
      parrafo('[[FIN REPETIR]]'),
    ])
    const marcadores = detectarMarcadoresEnDocx(xml)

    const { documentXml, datos } = prepararComandos(xml, marcadores)

    expect(documentXml).toMatch(/\[\[FOR item_m_\S+ IN m_\S+\]\]/)
    expect(documentXml).toMatch(/\[\[END-FOR item_m_\S+\]\]/)
    expect(documentXml).toMatch(/- \[\[\$item_m_\S+\]\]/)
    expect(documentXml).not.toContain('[[punto actual]]')
    expect(Object.values(datos)).toEqual([expect.any(Array)])
  })

  it('el documento real de ejemplo no deja ningún [[...]] original sin traducir', () => {
    const xml = documentoXml([
      parrafo('Grupo de investigación: [[Nombre grupo]]'),
      parrafo('Fecha: [[Fecha de realización]]'),
      parrafo('Asistentes: [[Asistentes a la conferencia]]'),
      parrafo('[[Bullet points de la agenda]]'),
      parrafo('[[Desarrollo por puntos 1, 2, 3…, n]]'),
    ])
    const marcadores = detectarMarcadoresEnDocx(xml).map((marcador) => conCampo(marcador, 'lo que sea'))

    const { documentXml, datos } = prepararComandos(xml, marcadores)

    expect(documentXml).not.toContain('[[Nombre grupo]]')
    expect(documentXml).not.toContain('[[Fecha de realización]]')
    expect(documentXml).not.toContain('[[Asistentes a la conferencia]]')
    expect(documentXml).not.toContain('[[Bullet points de la agenda]]')
    expect(documentXml).not.toContain('[[Desarrollo por puntos 1, 2, 3…, n]]')
    expect(Object.keys(datos)).toHaveLength(5)
  })

  it('con datos reales para el campo del marcador, los usa en vez del dato de ejemplo', () => {
    const xml = documentoXml([parrafo('Ponente: [[Nombre]]')])
    const [detectado] = detectarMarcadoresEnDocx(xml)
    if (detectado === undefined) throw new Error('se esperaba un marcador')
    const marcador = conCampoFijo(detectado)

    const datosReales: RegistroDeDatosDeCampo = {
      nombre_ponente: { parrafo: 'Rodrigo Peñaloza', lista: ['Rodrigo Peñaloza'] },
    }

    const { datos } = prepararComandos(xml, [marcador], datosReales)

    expect(Object.values(datos)).toEqual(['Rodrigo Peñaloza'])
  })

  it('sin datos reales para ese campo, sigue usando el dato de ejemplo', () => {
    const xml = documentoXml([parrafo('Ponente: [[Nombre]]')])
    const [detectado] = detectarMarcadoresEnDocx(xml)
    if (detectado === undefined) throw new Error('se esperaba un marcador')
    const marcador = conCampoFijo(detectado)

    const { datos } = prepararComandos(xml, [marcador])

    expect(Object.values(datos)).toEqual(['Mariana Escobar Vallejo'])
  })
})
