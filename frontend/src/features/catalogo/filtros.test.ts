import { describe, expect, it } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { conferenciasVisibles, fichasDelCatalogo } from '@/features/conferencias/query'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { TEMAS_DE_EJEMPLO, nombreDeTema } from '@/features/taxonomia'
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

const ALCANTARA = '1ba5af9a-f6a2-4504-ab60-1f018c21290a'
const ZULUAGA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'

function entradasDe(idUsuario: string): readonly FichaDelCatalogo[] {
  return fichasDelCatalogo(FICHAS_DE_EJEMPLO, conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario))
}

/* La ficha guarda el id del tema (F9), así que buscar y comparar por nombre pasa por el pool. */
function nombreDelTemaDe(entrada: FichaDelCatalogo): string {
  return nombreDeTema(TEMAS_DE_EJEMPLO, entrada.ficha.idTema)
}

describe('buscarEnCatalogo', () => {
  it('sin texto, no filtra nada', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(buscarEnCatalogo(entradas, '', TEMAS_DE_EJEMPLO)).toHaveLength(entradas.length)
  })

  it('encuentra por tema, por inicio de palabra y no por subcadena', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = buscarEnCatalogo(entradas, 'sesgos', TEMAS_DE_EJEMPLO)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => nombreDelTemaDe(entrada).toLowerCase().includes('sesgos'))).toBe(true)
  })

  it('encuentra por fragmento', () => {
    const entradas = entradasDe(ALCANTARA)
    const [primera] = entradas
    if (primera === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    const palabraDelFragmento = primera.ficha.fragmento.split(/\s+/)[0] ?? ''
    const resultado = buscarEnCatalogo(entradas, palabraDelFragmento, TEMAS_DE_EJEMPLO)

    expect(resultado.some((entrada) => entrada.ficha.id === primera.ficha.id)).toBe(true)
  })

  it('varias palabras exigen todas a la vez', () => {
    const entradas = entradasDe(ALCANTARA)

    expect(buscarEnCatalogo(entradas, 'palabra-que-no-existe-en-ningun-lado', TEMAS_DE_EJEMPLO)).toHaveLength(0)
  })

  /*
    El catálogo cruza fichas de conferencias distintas, así que buscar solo
    dentro de la ficha deja fuera lo que de verdad distingue una entrada de
    otra: de qué charla viene. Mismo alcance que `buscar` de F2 (título,
    ponente, evento), más lo propio de la ficha.
  */
  it('encuentra por título de la conferencia de origen', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = buscarEnCatalogo(entradas, 'subsidios', TEMAS_DE_EJEMPLO)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.conferencia.titulo.toLowerCase().includes('subsidios'))).toBe(true)
  })

  it('encuentra por ponente de la conferencia de origen', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = buscarEnCatalogo(entradas, 'Ferreira', TEMAS_DE_EJEMPLO)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.conferencia.ponente.includes('Ferreira'))).toBe(true)
  })

  it('encuentra por evento de la conferencia de origen', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = buscarEnCatalogo(entradas, 'Coloquio', TEMAS_DE_EJEMPLO)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.conferencia.evento.includes('Coloquio'))).toBe(true)
  })

  /*
    La misma regla de inicio de palabra que ya rige en F2: "IA" no puede
    traer "Mariana" ni "Ingeniería" por la subcadena "ia" a mitad de palabra.
    Aquí importa el doble, porque ahora se busca también sobre ponente y
    evento, que es justo donde vivían esos falsos positivos.
  */
  it('no empareja por subcadena a mitad de palabra en ponente ni evento', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = buscarEnCatalogo(entradas, 'IA', TEMAS_DE_EJEMPLO)

    for (const entrada of resultado) {
      const texto = `${entrada.ficha.fragmento} ${nombreDelTemaDe(entrada)} ${entrada.conferencia.titulo} ${entrada.conferencia.ponente} ${entrada.conferencia.evento}`
      const empiezaAlgunaPalabraEnIa = texto
        .toLowerCase()
        .split(/[^a-záéíóúñ0-9]+/)
        .some((palabra) => palabra.startsWith('ia'))

      expect(empiezaAlgunaPalabraEnIa).toBe(true)
    }
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

    const resultado = filtrarPorTema(entradas, primera.ficha.idTema)

    expect(resultado.length).toBeGreaterThan(0)
    expect(resultado.every((entrada) => entrada.ficha.idTema === primera.ficha.idTema)).toBe(true)
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

    const temas = temasDisponibles(entradas, TEMAS_DE_EJEMPLO)
    const ids = temas.map((tema) => tema.id)

    expect(new Set(ids).size).toBe(temas.length)
    expect(temas.map((tema) => tema.nombre)).toEqual(
      [...temas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map((tema) => tema.nombre),
    )
    for (const tema of temas) {
      expect(entradas.some((entrada) => entrada.ficha.idTema === tema.id)).toBe(true)
    }
  })

  it('devuelve los eventos distintos ya presentes, ordenados y sin repetir', () => {
    const entradas = entradasDe(ZULUAGA)

    const eventos = eventosDisponibles(entradas)

    expect(new Set(eventos).size).toBe(eventos.length)
    expect(eventos).toEqual([...eventos].sort((a, b) => a.localeCompare(b)))
  })

  it('no ofrece un tema de una conferencia que esa persona no puede ver', () => {
    const entradasBerrio = entradasDe('fd5f0a48-ca53-425c-819a-a1b005f529bd')
    const temasDeBerrio = new Set(
      temasDisponibles(entradasBerrio, TEMAS_DE_EJEMPLO).map((tema) => tema.id),
    )

    const idsVisiblesDeBerrio = new Set(
      conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, 'fd5f0a48-ca53-425c-819a-a1b005f529bd').map((visible) => visible.conferencia.id),
    )
    const temasAjenos = FICHAS_DE_EJEMPLO.filter((ficha) => !idsVisiblesDeBerrio.has(ficha.idConferencia)).map(
      (ficha) => ficha.idTema,
    )

    for (const temaAjeno of temasAjenos) {
      if (!temasDeBerrio.has(temaAjeno)) {
        continue
      }
      /* Es válido que el mismo tema clasifique también una ficha de una conferencia visible. */
      expect(entradasBerrio.some((entrada) => entrada.ficha.idTema === temaAjeno)).toBe(true)
    }
  })
})

describe('listarCatalogo', () => {
  it('con los criterios por defecto, devuelve todas las entradas visibles', () => {
    const entradas = entradasDe(ALCANTARA)

    const resultado = listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO, temas: TEMAS_DE_EJEMPLO })

    expect(resultado).toHaveLength(entradas.length)
  })

  it('combina los filtros como intersección, no como unión', () => {
    const entradas = entradasDe(ALCANTARA)
    const [primera] = entradas
    if (primera === undefined) throw new Error('el fixture no tiene fichas para esta cuenta')

    const resultado = listarCatalogo({
      entradas,
      criterios: { ...CRITERIOS_POR_DEFECTO, idTema: primera.ficha.idTema, estado: 'validada' },
      temas: TEMAS_DE_EJEMPLO,
    })

    expect(
      resultado.every(
        (entrada) =>
          entrada.ficha.idTema === primera.ficha.idTema && entrada.ficha.estadoDeValidacion === 'validada',
      ),
    ).toBe(true)
  })

  it('deja un orden estable (no cambia entre llamadas sobre los mismos datos)', () => {
    const entradas = entradasDe(ZULUAGA)

    const primeraCorrida = listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO, temas: TEMAS_DE_EJEMPLO })
    const segundaCorrida = listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO, temas: TEMAS_DE_EJEMPLO })

    expect(primeraCorrida.map((entrada) => entrada.ficha.id)).toEqual(
      segundaCorrida.map((entrada) => entrada.ficha.id),
    )
  })

  it('no altera el arreglo de entradas que recibe', () => {
    const entradas = entradasDe(ALCANTARA)
    const original = [...entradas]

    listarCatalogo({ entradas, criterios: CRITERIOS_POR_DEFECTO, temas: TEMAS_DE_EJEMPLO })

    expect(entradas).toEqual(original)
  })
})
