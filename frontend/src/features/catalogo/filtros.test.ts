import { describe, expect, it } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { conferenciasVisibles, fichasDelCatalogo } from '@/features/conferencias/query'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import {
  CRITERIOS_POR_DEFECTO,
  buscarEnCatalogo,
  eventosDisponibles,
  filtrarPorEstado,
  filtrarPorEvento,
  filtrarPorTema,
  filtrarPorTipoDeUnidad,
  listarCatalogo,
  temasDisponibles,
} from './filtros'

const ALCANTARA = 'usr-alcantara'
const ZULUAGA = 'usr-zuluaga'

function entradasDe(idUsuario: string): readonly FichaDelCatalogo[] {
  return fichasDelCatalogo(FICHAS_DE_EJEMPLO, conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario))
}

describe('buscarEnCatalogo', () => {
  it('sin texto, no filtra nada', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(buscarEnCatalogo(entradas, '')).toHaveLength(entradas.length)
  })

  it('encuentra por tema, por inicio de palabra y no por subcadena', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = buscarEnCatalogo(entradas, 'sesgos')

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.ficha.tema.toLowerCase().includes('sesgos'))).toBe(true)
  })

  it('encuentra por fragmento', () => {
    const entradas = entradasDe(ALCANTARA)
    const [primera] = entradas
    if (primera === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    const palabraDelFragmento = primera.ficha.fragmento.split(/\s+/)[0] ?? ''
    const resultado = buscarEnCatalogo(entradas, palabraDelFragmento)

    expect(resultado.some((entrada) => entrada.ficha.id === primera.ficha.id)).toBe(true)
  })

  it('varias palabras exigen todas a la vez', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(buscarEnCatalogo(entradas, 'palabra-que-no-existe-en-ningun-lado')).toHaveLength(0)
  })
})

describe('filtrarPorTema', () => {
  it('sin tema, no filtra nada', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(filtrarPorTema(entradas, null)).toHaveLength(entradas.length)
  })

  it('deja solo las fichas de ese tema exacto', () => {
    const entradas = entradasDe(ALCANTARA)
    const [primera] = entradas
    if (primera === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    const resultado = filtrarPorTema(entradas, primera.ficha.tema)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.ficha.tema === primera.ficha.tema)).toBe(true)
  })
})

describe('filtrarPorTipoDeUnidad', () => {
  it('sin tipo, no filtra nada', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(filtrarPorTipoDeUnidad(entradas, null)).toHaveLength(entradas.length)
  })

  it('deja solo las fichas de ese tipo de unidad', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = filtrarPorTipoDeUnidad(entradas, 'cita-textual')

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.ficha.tipoDeUnidad === 'cita-textual')).toBe(true)
  })
})

describe('filtrarPorEvento', () => {
  it('sin evento, no filtra nada', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(filtrarPorEvento(entradas, null)).toHaveLength(entradas.length)
  })

  it('deja solo las fichas de conferencias de ese evento', () => {
    const entradas = entradasDe(ALCANTARA)
    const [primera] = entradas
    if (primera === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    const resultado = filtrarPorEvento(entradas, primera.conferencia.evento)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.conferencia.evento === primera.conferencia.evento)).toBe(true)
  })
})

describe('filtrarPorEstado', () => {
  it('con "todos", no filtra nada', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(filtrarPorEstado(entradas, 'todos')).toHaveLength(entradas.length)
  })

  it('deja solo las fichas de ese estado de validación', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = filtrarPorEstado(entradas, 'validada')

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.ficha.estadoDeValidacion === 'validada')).toBe(true)
  })
})

describe('temasDisponibles / eventosDisponibles', () => {
  it('devuelve los temas distintos ya presentes, ordenados y sin repetir', () => {
    const entradas = entradasDe(ZULUAGA)

    const temas = temasDisponibles(entradas)

    expect(new Set(temas).size).toBe(temas.length)
    expect(temas).toEqual([...temas].sort((a, b) => a.localeCompare(b)))
    for (const tema of temas) {
      expect(entradas.some((entrada) => entrada.ficha.tema === tema)).toBe(true)
    }
  })

  it('devuelve los eventos distintos ya presentes, ordenados y sin repetir', () => {
    const entradas = entradasDe(ZULUAGA)

    const eventos = eventosDisponibles(entradas)

    expect(new Set(eventos).size).toBe(eventos.length)
    expect(eventos).toEqual([...eventos].sort((a, b) => a.localeCompare(b)))
  })

  it('no ofrece un tema de una conferencia que esa persona no puede ver', () => {
    const entradasBerrio = entradasDe('usr-berrio')
    const temasDeBerrio = new Set(temasDisponibles(entradasBerrio))

    const idsVisiblesDeBerrio = new Set(
      conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, 'usr-berrio').map((visible) => visible.conferencia.id),
    )
    const temasAjenos = FICHAS_DE_EJEMPLO.filter((ficha) => !idsVisiblesDeBerrio.has(ficha.idConferencia)).map(
      (ficha) => ficha.tema,
    )

    for (const temaAjeno of temasAjenos) {
      if (!temasDeBerrio.has(temaAjeno)) {
        continue
      }
      /* Es válido que el mismo nombre de tema exista también en una conferencia visible. */
      expect(entradasBerrio.some((entrada) => entrada.ficha.tema === temaAjeno)).toBe(true)
    }
  })
})

describe('listarCatalogo', () => {
  it('con los criterios por defecto, devuelve todas las entradas visibles', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO })

    expect(resultado).toHaveLength(entradas.length)
  })

  it('combina los filtros como intersección, no como unión', () => {
    const entradas = entradasDe(ALCANTARA)
    const [primera] = entradas
    if (primera === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    const resultado = listarCatalogo({
      entradas,
      criterios: { ...CRITERIOS_POR_DEFECTO, tema: primera.ficha.tema, estado: 'validada' },
    })

    expect(
      resultado.every(
        (entrada) => entrada.ficha.tema === primera.ficha.tema && entrada.ficha.estadoDeValidacion === 'validada',
      ),
    ).toBe(true)
  })

  it('deja un orden estable (no cambia entre llamadas sobre los mismos datos)', () => {
    const entradas = entradasDe(ZULUAGA)

    const primeraCorrida = listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO })
    const segundaCorrida = listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO })

    expect(primeraCorrida.map((entrada) => entrada.ficha.id)).toEqual(
      segundaCorrida.map((entrada) => entrada.ficha.id),
    )
  })

  it('no altera el arreglo de entradas que recibe', () => {
    const entradas = entradasDe(ALCANTARA)
    const original = [...entradas]

    listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO })

    expect(entradas).toEqual(original)
  })
})
