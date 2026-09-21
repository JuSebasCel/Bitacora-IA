import { describe, expect, it } from 'vitest'
import { actualizarMarcadoresDeDocx, crearPlantillaDesdeDocx, nombreDeMarcador, renombrarPlantilla } from './plantillas'
import type { MarcadorDeDocx } from './data'

const MARCADOR: MarcadorDeDocx = {
  tipo: 'simple',
  id: 'mar-1',
  textoOriginal: '[[Nombre grupo]]',
  contexto: 'Grupo: [[Nombre grupo]]',
  origenDeDato: { tipo: 'personalizado', etiqueta: 'Nombre grupo' },
  formato: 'parrafo',
}

/* Una plantilla importada nace con su id ya decidido: la ruta de su .docx en el bucket lo contiene. */
const ID_DE_PRUEBA = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
const RUTA_DE_PRUEBA = `${ID_DE_PRUEBA}/original.docx`

describe('crearPlantillaDesdeDocx', () => {
  it('nace con origen docx, el archivo y los marcadores tal cual se pasaron', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Mi plantilla', [MARCADOR])

    expect(plantilla.origen).toBe('docx')
    expect(plantilla.id).toBe(ID_DE_PRUEBA)
    expect(plantilla.nombre).toBe('Mi plantilla')
    expect(plantilla.rutaArchivoOriginal).toBe(RUTA_DE_PRUEBA)
    expect(plantilla.marcadores).toEqual([MARCADOR])
  })
})

describe('renombrarPlantilla', () => {
  it('con un nombre válido, lo recorta', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = renombrarPlantilla(plantilla, '  Memoria del taller  ')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.plantilla.nombre).toBe('Memoria del taller')
    }
  })

  it('rechaza un nombre vacío o solo espacios', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = renombrarPlantilla(plantilla, '   ')

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_REQUERIDO' })
  })

  it('rechaza un nombre por encima del largo máximo', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = renombrarPlantilla(plantilla, 'x'.repeat(81))

    expect(resultado).toEqual({ ok: false, codigo: 'PLANT_NOMBRE_MUY_LARGO' })
  })
})

describe('actualizarMarcadoresDeDocx', () => {
  it('reemplaza los marcadores de una plantilla docx', () => {
    const plantilla = crearPlantillaDesdeDocx(ID_DE_PRUEBA, RUTA_DE_PRUEBA, 'Prueba', [])

    const resultado = actualizarMarcadoresDeDocx(plantilla, [MARCADOR])

    expect(resultado.origen).toBe('docx')
    if (resultado.origen === 'docx') {
      expect(resultado.marcadores).toEqual([MARCADOR])
    }
  })
})

describe('nombreDeMarcador', () => {
  it('quita los corchetes dobles y los espacios de alrededor', () => {
    expect(nombreDeMarcador('[[ Resumen de la tesis ]]')).toBe('Resumen de la tesis')
  })
})
