import { describe, expect, it } from 'vitest'
import {
  CONFERENCIAS_DE_EJEMPLO,
  ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO,
  FICHAS_DE_EJEMPLO,
} from '../data'
import type { AsignacionDeEtiqueta } from '../data'
import { conferenciasVisibles } from './acceso'
import type { ConferenciaVisible } from './acceso'
import {
  CRITERIOS_POR_DEFECTO,
  buscar,
  filtrarPorEstado,
  filtrarPorEtiquetas,
  filtrarPorSegmento,
  listarConferencias,
  normalizarTexto,
  ordenar,
  palabrasDe,
} from './filtros'

const ALCANTARA = '1ba5af9a-f6a2-4504-ab60-1f018c21290a'
const ZULUAGA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'

function visiblesDe(idUsuario: string): readonly ConferenciaVisible[] {
  return conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario)
}

function asignacionesDe(idUsuario: string): readonly AsignacionDeEtiqueta[] {
  return ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[idUsuario]?.asignaciones ?? []
}

function ids(visibles: readonly ConferenciaVisible[]): string[] {
  return visibles.map((visible) => visible.conferencia.id)
}

describe('filtrarPorSegmento', () => {
  it('deja solo las propias', () => {
    const propias = filtrarPorSegmento(visiblesDe(ZULUAGA), 'propias')

    expect(propias).toHaveLength(3)
    expect(propias.every((visible) => visible.procedencia === 'propia')).toBe(true)
  })

  it('deja solo las compartidas conmigo', () => {
    const compartidas = filtrarPorSegmento(visiblesDe(ZULUAGA), 'compartidas')

    expect(compartidas).toHaveLength(4)
    expect(compartidas.every((visible) => visible.procedencia === 'compartida')).toBe(true)
  })

  it('no filtra nada con el segmento de todas', () => {
    expect(filtrarPorSegmento(visiblesDe(ZULUAGA), 'todas')).toHaveLength(7)
  })
})

/*
  `palabrasDe` se exporta desde F6 (catálogo) hacia afuera: el catálogo busca
  sobre fichas con el mismo emparejamiento por inicio de palabra que ya usa
  `buscar` para conferencias, para no arriesgar reintroducir el bug de
  subcadena que el comentario de `buscar` documenta. Solo separa por tramos
  que no son letra ASCII ni número — no quita tildes por su cuenta, por eso
  todo llamador la compone siempre con `normalizarTexto` primero (`buscar`
  ya lo hace así).
*/
describe('palabrasDe', () => {
  it('separa por cualquier tramo que no sea letra o número, sobre texto ya normalizado', () => {
    expect(palabrasDe(normalizarTexto('Revisión sistemática, de literatura'))).toEqual([
      'revision',
      'sistematica',
      'de',
      'literatura',
    ])
  })

  it('descarta los tramos vacíos', () => {
    expect(palabrasDe(normalizarTexto('  IA   '))).toEqual(['ia'])
  })

  it('con texto vacío, devuelve un arreglo vacío', () => {
    expect(palabrasDe('')).toEqual([])
  })
})

describe('buscar', () => {
  it('encuentra por título', () => {
    expect(ids(buscar(visiblesDe(ALCANTARA), 'sesgos'))).toEqual(['cnf-alc-03'])
  })

  it('encuentra por ponente, incluso cuando dio dos charlas', () => {
    expect(ids(buscar(visiblesDe(ALCANTARA), 'Escobar')).sort()).toEqual([
      'cnf-alc-01',
      'cnf-zul-01',
    ])
  })

  it('encuentra por nombre del evento', () => {
    expect(buscar(visiblesDe(ALCANTARA), 'Andino')).toHaveLength(3)
  })

  it('ignora mayúsculas y minúsculas', () => {
    expect(ids(buscar(visiblesDe(ALCANTARA), 'SESGOS'))).toEqual(['cnf-alc-03'])
  })

  /*
    En los dos sentidos: quien escribe sin tildes debe encontrar el texto con
    tildes, y quien las escribe no debe quedarse sin resultados por hacerlo bien.
  */
  it('ignora las tildes escriba quien escriba', () => {
    expect(ids(buscar(visiblesDe(ZULUAGA), 'Bermudez'))).toEqual(['cnf-zul-03'])
    expect(ids(buscar(visiblesDe(ZULUAGA), 'Bermúdez'))).toEqual(['cnf-zul-03'])
    expect(ids(buscar(visiblesDe(ALCANTARA), 'revision sistematica'))).toEqual(['cnf-alc-01'])
  })

  it('recorta los espacios sobrantes del texto buscado', () => {
    expect(ids(buscar(visiblesDe(ALCANTARA), '   sesgos   '))).toEqual(['cnf-alc-03'])
  })

  it('no filtra nada cuando el texto está vacío', () => {
    expect(buscar(visiblesDe(ALCANTARA), '')).toHaveLength(6)
    expect(buscar(visiblesDe(ALCANTARA), '    ')).toHaveLength(6)
  })

  it('devuelve una lista vacía cuando no hay coincidencias', () => {
    expect(buscar(visiblesDe(ALCANTARA), 'termodinámica cuántica')).toHaveLength(0)
  })

  /*
    "IA" no aparece como palabra propia en ningún título, ponente o evento del
    fixture (solo existe como nombre de etiqueta, que es un campo distinto). Si
    la búsqueda fuera una coincidencia de subcadena sin límites de palabra,
    "ia" aparecería igual dentro de "Mariana", "Lucía" o "Ingeniería", y la
    persona vería conferencias que no tienen nada que ver con lo que escribió.
  */
  it('no confunde una subcadena a mitad de palabra con una coincidencia real', () => {
    expect(buscar(visiblesDe(ALCANTARA), 'IA')).toHaveLength(0)
  })

  /*
    El límite de palabra no debe impedir la búsqueda incremental de siempre:
    "algorit" tiene que seguir encontrando "algorítmicos" mientras se escribe.
  */
  it('sigue encontrando por el inicio de una palabra, letra a letra', () => {
    expect(ids(buscar(visiblesDe(ALCANTARA), 'algorit'))).toEqual(['cnf-alc-03'])
  })
})

describe('filtrarPorEstado', () => {
  it('deja solo las conferencias del estado pedido', () => {
    expect(filtrarPorEstado(visiblesDe(ALCANTARA), 'procesada')).toHaveLength(5)
    expect(ids(filtrarPorEstado(visiblesDe(ALCANTARA), 'procesando'))).toEqual(['cnf-alc-04'])
  })

  it('no filtra nada con el estado de todos', () => {
    expect(filtrarPorEstado(visiblesDe(ALCANTARA), 'todos')).toHaveLength(6)
  })

  it('devuelve una lista vacía cuando ninguna conferencia está en ese estado', () => {
    expect(filtrarPorEstado(visiblesDe(ALCANTARA), 'fallida')).toHaveLength(0)
  })
})

describe('filtrarPorEtiquetas', () => {
  it('deja las conferencias que llevan la etiqueta pedida', () => {
    const filtradas = filtrarPorEtiquetas(
      visiblesDe(ALCANTARA),
      ['etq-alc-ia'],
      asignacionesDe(ALCANTARA),
    )

    expect(ids(filtradas).sort()).toEqual(['cnf-alc-01', 'cnf-alc-03'])
  })

  /*
    Intersección y no unión: pedir "IA" y "art1" significa buscar el material
    que sirve para ese artículo Y trata de ese tema, que es para lo que se usan
    dos etiquetas a la vez.
  */
  it('exige todas las etiquetas a la vez, no cualquiera de ellas', () => {
    const filtradas = filtrarPorEtiquetas(
      visiblesDe(ALCANTARA),
      ['etq-alc-ia', 'etq-alc-art1'],
      asignacionesDe(ALCANTARA),
    )

    expect(ids(filtradas)).toEqual(['cnf-alc-01'])
  })

  it('no filtra nada cuando no se pidió ninguna etiqueta', () => {
    expect(filtrarPorEtiquetas(visiblesDe(ALCANTARA), [], asignacionesDe(ALCANTARA))).toHaveLength(
      6,
    )
  })

  it('no rompe ante una etiqueta que no existe, simplemente no coincide nada', () => {
    const filtradas = filtrarPorEtiquetas(
      visiblesDe(ALCANTARA),
      ['etq-que-no-existe'],
      asignacionesDe(ALCANTARA),
    )

    expect(filtradas).toHaveLength(0)
  })
})

describe('ordenar', () => {
  const visibles = visiblesDe(ALCANTARA)

  it('ordena de la conferencia más reciente a la más antigua', () => {
    const ordenadas = ordenar(visibles, 'fecha-desc', FICHAS_DE_EJEMPLO)

    expect(ids(ordenadas).at(0)).toBe('cnf-zul-01')
    expect(ids(ordenadas).at(-1)).toBe('cnf-alc-05')
  })

  it('ordena de la más antigua a la más reciente', () => {
    const ordenadas = ordenar(visibles, 'fecha-asc', FICHAS_DE_EJEMPLO)

    expect(ids(ordenadas).at(0)).toBe('cnf-alc-05')
    expect(ids(ordenadas).at(-1)).toBe('cnf-alc-03')
  })

  /*
    Dos charlas del mismo día tienen que quedar siempre en el mismo orden. Sin
    desempate explícito, el resultado dependería del orden de entrada y la
    pantalla cambiaría sola entre recargas.
  */
  it('rompe el empate de fecha por el código de la charla, en los dos sentidos', () => {
    const descendente = ids(ordenar(visibles, 'fecha-desc', FICHAS_DE_EJEMPLO))
    const ascendente = ids(ordenar([...visibles].reverse(), 'fecha-desc', FICHAS_DE_EJEMPLO))

    expect(descendente).toEqual(ascendente)
    expect(descendente.indexOf('cnf-zul-01')).toBeLessThan(descendente.indexOf('cnf-alc-03'))
  })

  it('ordena por título sin que las tildes alteren el alfabeto', () => {
    const ordenadas = ids(ordenar(visibles, 'titulo-asc', FICHAS_DE_EJEMPLO))

    expect(ordenadas.at(0)).toBe('cnf-alc-04')
    expect(ordenadas.at(1)).toBe('cnf-zul-01')
    expect(ordenadas.at(-1)).toBe('cnf-alc-02')
  })

  it('ordena por número de fichas, de más a menos', () => {
    const ordenadas = ids(ordenar(visibles, 'fichas-desc', FICHAS_DE_EJEMPLO))

    expect(ordenadas.at(0)).toBe('cnf-zul-01')
    expect(ordenadas.at(-1)).toBe('cnf-alc-04')
  })

  /*
    Cuenta las fichas que esa persona ve, no las que existen: lo que se ordena
    tiene que ser lo mismo que se muestra.
  */
  it('cuenta para el orden solo las fichas que la compartición deja ver', () => {
    const paraZuluaga = ordenar(visiblesDe(ZULUAGA), 'fichas-desc', FICHAS_DE_EJEMPLO)
    const posicion = ids(paraZuluaga).indexOf('cnf-alc-03')
    const posicionDeOcho = ids(paraZuluaga).indexOf('cnf-ber-01')

    expect(posicion).toBeGreaterThan(posicionDeOcho)
  })

  it('no altera la lista que recibe', () => {
    const original = ids(visibles)

    ordenar(visibles, 'titulo-asc', FICHAS_DE_EJEMPLO)

    expect(ids(visibles)).toEqual(original)
  })
})

describe('listarConferencias', () => {
  it('devuelve todo lo visible con los criterios por defecto', () => {
    const listadas = listarConferencias({
      visibles: visiblesDe(ZULUAGA),
      criterios: CRITERIOS_POR_DEFECTO,
      asignaciones: asignacionesDe(ZULUAGA),
      fichas: FICHAS_DE_EJEMPLO,
    })

    expect(listadas).toHaveLength(7)
  })

  it('combina segmento, búsqueda y etiqueta en una sola pasada', () => {
    const listadas = listarConferencias({
      visibles: visiblesDe(ZULUAGA),
      criterios: {
        ...CRITERIOS_POR_DEFECTO,
        segmento: 'compartidas',
        busqueda: 'sesgos',
        etiquetas: ['etq-zul-tesis'],
      },
      asignaciones: asignacionesDe(ZULUAGA),
      fichas: FICHAS_DE_EJEMPLO,
    })

    expect(ids(listadas)).toEqual(['cnf-alc-03'])
  })

  it('devuelve una lista vacía cuando los criterios no dejan pasar nada', () => {
    const listadas = listarConferencias({
      visibles: visiblesDe(ZULUAGA),
      criterios: { ...CRITERIOS_POR_DEFECTO, busqueda: 'sesgos', estado: 'fallida' },
      asignaciones: asignacionesDe(ZULUAGA),
      fichas: FICHAS_DE_EJEMPLO,
    })

    expect(listadas).toHaveLength(0)
  })

  it('aplica el orden pedido al resultado ya filtrado', () => {
    const listadas = listarConferencias({
      visibles: visiblesDe(ALCANTARA),
      criterios: { ...CRITERIOS_POR_DEFECTO, estado: 'procesada', orden: 'fecha-asc' },
      asignaciones: asignacionesDe(ALCANTARA),
      fichas: FICHAS_DE_EJEMPLO,
    })

    expect(ids(listadas).at(0)).toBe('cnf-alc-05')
    expect(listadas).toHaveLength(5)
  })
})
