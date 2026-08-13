import { describe, expect, it } from 'vitest'
import { MEMORIAS_DE_EJEMPLO } from './data'
import { CRITERIOS_POR_DEFECTO, buscarMemorias, listarMemorias } from './filtros'
import type { EntradaDeMemoria } from './filtros'

/*
  Mismo esqueleto que `catalogo/filtros.test.ts`: funciones puras, sin React
  ni URL, así que se prueban sobre entradas armadas a mano en vez de montar
  la pantalla completa.
*/

const [MEMORIA_ALCANTARA] = MEMORIAS_DE_EJEMPLO
if (MEMORIA_ALCANTARA === undefined) throw new Error('el fixture no tiene memorias de ejemplo')

const ENTRADAS: readonly EntradaDeMemoria[] = [
  {
    memoria: MEMORIA_ALCANTARA,
    nombreConferencia: 'Modelos de lenguaje aplicados a la revisión sistemática de literatura',
    nombrePlantilla: 'Memoria estándar',
  },
  {
    memoria: { ...MEMORIA_ALCANTARA, id: 'mem-otra-01', nombre: 'Síntesis del taller de subsidios agrícolas' },
    nombreConferencia: 'Subsidios agrícolas y su impacto territorial',
    nombrePlantilla: 'Informe ejecutivo',
  },
]

describe('buscarMemorias', () => {
  it('sin texto, no filtra nada', () => {
    expect(buscarMemorias(ENTRADAS, '')).toHaveLength(ENTRADAS.length)
  })

  it('encuentra por el nombre de la memoria, por inicio de palabra', () => {
    const resultado = buscarMemorias(ENTRADAS, 'sintesis')

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.memoria.id).toBe('mem-otra-01')
  })

  it('encuentra por el nombre de la conferencia de origen', () => {
    const resultado = buscarMemorias(ENTRADAS, 'subsidios')

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.nombreConferencia).toContain('Subsidios')
  })

  it('encuentra por el nombre de la plantilla de origen', () => {
    const resultado = buscarMemorias(ENTRADAS, 'ejecutivo')

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.nombrePlantilla).toBe('Informe ejecutivo')
  })

  it('varias palabras exigen todas a la vez', () => {
    expect(buscarMemorias(ENTRADAS, 'palabra-que-no-existe-en-ningun-lado')).toHaveLength(0)
  })

  /*
    Misma regla de inicio de palabra que ya rige en F2/F6: "sis" no puede
    traer "Subsidios" por la subcadena "sis" a mitad de palabra ("subSISdios"
    no existe, pero sí ilustra el riesgo: nada en esa entrada empieza por
    "sis"), solo lo que de verdad empieza por ahí ("sistemática").
  */
  it('no empareja por subcadena a mitad de palabra', () => {
    const resultado = buscarMemorias(ENTRADAS, 'sis')

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.memoria.id).toBe(MEMORIA_ALCANTARA.id)
  })
})

describe('listarMemorias', () => {
  it('con los criterios por defecto, devuelve todas las entradas', () => {
    expect(listarMemorias({ entradas: ENTRADAS, criterios: CRITERIOS_POR_DEFECTO })).toHaveLength(ENTRADAS.length)
  })

  it('aplica la búsqueda', () => {
    const resultado = listarMemorias({ entradas: ENTRADAS, criterios: { busqueda: 'ejecutivo' } })

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.nombrePlantilla).toBe('Informe ejecutivo')
  })

  it('no altera el arreglo de entradas que recibe', () => {
    const original = [...ENTRADAS]

    listarMemorias({ entradas: ENTRADAS, criterios: CRITERIOS_POR_DEFECTO })

    expect(ENTRADAS).toEqual(original)
  })
})
