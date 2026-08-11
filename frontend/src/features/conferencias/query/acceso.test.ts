import { describe, expect, it } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '../data'
import type { Conferencia, Ficha } from '../data'
import {
  conferenciasVisibles,
  fichasVisibles,
  obtenerConferencia,
  privacidadEfectiva,
} from './acceso'

/*
  Estas pruebas cubren la simulación en frontend de la regla de aislamiento por
  fila que exige PRD.md sección 9 y PLAN.md sección 6.3. Se prueban sobre
  funciones puras, y no a través de la pantalla, precisamente porque el
  aislamiento no puede depender de lo que la interfaz decida mostrar.
*/

const ALCANTARA = 'usr-alcantara'
const BERRIO = 'usr-berrio'
const ZULUAGA = 'usr-zuluaga'

function visiblesDe(idUsuario: string) {
  return conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario)
}

function idsVisiblesDe(idUsuario: string): string[] {
  return visiblesDe(idUsuario).map((visible) => visible.conferencia.id)
}

function buscarVisible(idUsuario: string, idConferencia: string) {
  const visible = visiblesDe(idUsuario).find(
    (candidata) => candidata.conferencia.id === idConferencia,
  )

  if (visible === undefined) {
    throw new Error(`El fixture ya no hace visible ${idConferencia} para ${idUsuario}`)
  }

  return visible
}

describe('conferenciasVisibles', () => {
  it('marca como propias las conferencias que cargó quien consulta', () => {
    const propias = visiblesDe(BERRIO)

    expect(propias.length).toBeGreaterThan(0)

    for (const visible of propias) {
      expect(visible.conferencia.idDueno).toBe(BERRIO)
      expect(visible.procedencia).toBe('propia')
      expect(visible.comparticion).toBeNull()
    }
  })

  it('marca como compartidas las que otra persona compartió, con su compartición', () => {
    const compartidas = visiblesDe(ZULUAGA).filter(
      (visible) => visible.procedencia === 'compartida',
    )

    expect(compartidas).toHaveLength(4)

    for (const visible of compartidas) {
      expect(visible.conferencia.idDueno).not.toBe(ZULUAGA)
      expect(visible.comparticion).not.toBeNull()
      expect(visible.comparticion?.idInvitado).toBe(ZULUAGA)
    }
  })

  it('entrega a cada cuenta lo suyo más lo que le compartieron, y nada más', () => {
    expect(idsVisiblesDe(ALCANTARA)).toHaveLength(6)
    expect(idsVisiblesDe(BERRIO)).toHaveLength(4)
    expect(idsVisiblesDe(ZULUAGA)).toHaveLength(7)
    expect(idsVisiblesDe('usr-penaloza')).toHaveLength(3)
  })

  /*
    Berrío no recibió nada compartido. Es el caso que sostiene el estado vacío
    del segmento "compartidas conmigo" en la pantalla.
  */
  it('deja vacío el conjunto compartido de quien no ha recibido nada', () => {
    const compartidas = visiblesDe(BERRIO).filter((visible) => visible.procedencia === 'compartida')

    expect(compartidas).toHaveLength(0)
  })

  it('no muestra nada a una cuenta que no existe', () => {
    expect(conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, 'usr-inexistente')).toHaveLength(0)
  })

  it('no expone ninguna conferencia ajena y no compartida', () => {
    const visibles = new Set(idsVisiblesDe(BERRIO))

    const ajenas = CONFERENCIAS_DE_EJEMPLO.filter(
      (conferencia) =>
        conferencia.idDueno !== BERRIO &&
        !conferencia.comparticiones.some((comparticion) => comparticion.idInvitado === BERRIO),
    )

    expect(ajenas.length).toBeGreaterThan(0)

    for (const conferencia of ajenas) {
      expect(visibles.has(conferencia.id)).toBe(false)
    }
  })

  it('no altera la lista que recibe', () => {
    const original: readonly Conferencia[] = [...CONFERENCIAS_DE_EJEMPLO]

    conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, ZULUAGA)

    expect(CONFERENCIAS_DE_EJEMPLO).toEqual(original)
  })
})

describe('obtenerConferencia', () => {
  it('entrega una conferencia propia', () => {
    const resultado = obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, ALCANTARA, 'cnf-alc-01')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.visible.procedencia).toBe('propia')
    }
  })

  it('entrega una conferencia compartida con quien la pide', () => {
    const resultado = obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, ZULUAGA, 'cnf-alc-01')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.visible.procedencia).toBe('compartida')
    }
  })

  it('rechaza un identificador que no existe', () => {
    const resultado = obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, ZULUAGA, 'cnf-que-no-existe')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.codigo).toBe('CONF_NO_ENCONTRADA')
    }
  })

  /*
    El corazón de la regla: una conferencia ajena y un identificador inventado
    tienen que ser indistinguibles desde fuera. Si difirieran, bastaría con
    probar identificadores para averiguar qué subió otra persona.
  */
  it('responde a una conferencia ajena exactamente igual que a una inexistente', () => {
    const ajena = obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, BERRIO, 'cnf-alc-01')
    const inexistente = obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, BERRIO, 'cnf-que-no-existe')

    expect(ajena).toEqual(inexistente)
  })

  it('rechaza cualquier consulta de una cuenta que no existe', () => {
    const resultado = obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, 'usr-inexistente', 'cnf-alc-01')

    expect(resultado.ok).toBe(false)
  })
})

describe('privacidadEfectiva', () => {
  it('no restringe nada sobre una conferencia propia', () => {
    const privacidad = privacidadEfectiva(buscarVisible(ALCANTARA, 'cnf-alc-03'))

    expect(privacidad.compartirEtiquetas).toBe(true)
    expect(privacidad.compartirFichasPendientes).toBe(true)
  })

  it('aplica las opciones de la compartición sobre una conferencia ajena', () => {
    const privacidad = privacidadEfectiva(buscarVisible(ZULUAGA, 'cnf-alc-03'))

    expect(privacidad.compartirEtiquetas).toBe(false)
    expect(privacidad.compartirFichasPendientes).toBe(false)
  })
})

describe('fichasVisibles', () => {
  function fichasDe(idConferencia: string): readonly Ficha[] {
    return FICHAS_DE_EJEMPLO.filter((ficha) => ficha.idConferencia === idConferencia)
  }

  it('entrega todas las fichas de una conferencia propia, incluidas las pendientes', () => {
    const visible = buscarVisible(ALCANTARA, 'cnf-alc-03')
    const fichas = fichasVisibles(FICHAS_DE_EJEMPLO, visible)

    expect(fichas).toHaveLength(fichasDe('cnf-alc-03').length)
    expect(fichas.some((ficha) => ficha.estadoDeValidacion === 'pendiente')).toBe(true)
  })

  it('oculta las fichas pendientes cuando la compartición no las incluye', () => {
    const visible = buscarVisible(ZULUAGA, 'cnf-alc-03')
    const fichas = fichasVisibles(FICHAS_DE_EJEMPLO, visible)

    expect(fichas.length).toBeGreaterThan(0)
    expect(fichas.length).toBeLessThan(fichasDe('cnf-alc-03').length)
    expect(fichas.every((ficha) => ficha.estadoDeValidacion !== 'pendiente')).toBe(true)
  })

  it('entrega también las pendientes cuando la compartición sí las incluye', () => {
    const visible = buscarVisible(ZULUAGA, 'cnf-alc-01')
    const fichas = fichasVisibles(FICHAS_DE_EJEMPLO, visible)

    expect(fichas).toHaveLength(fichasDe('cnf-alc-01').length)
    expect(fichas.some((ficha) => ficha.estadoDeValidacion === 'pendiente')).toBe(true)
  })

  it('devuelve una lista vacía para una conferencia sin fichas, sin fallar', () => {
    const visible = buscarVisible('usr-berrio', 'cnf-ber-03')

    expect(fichasVisibles(FICHAS_DE_EJEMPLO, visible)).toHaveLength(0)
  })

  it('no mezcla fichas de otras conferencias', () => {
    const visible = buscarVisible(ALCANTARA, 'cnf-alc-02')

    for (const ficha of fichasVisibles(FICHAS_DE_EJEMPLO, visible)) {
      expect(ficha.idConferencia).toBe('cnf-alc-02')
    }
  })

  it('conserva el orden cronológico de la charla', () => {
    const visible = buscarVisible(ALCANTARA, 'cnf-alc-01')
    const fichas = fichasVisibles(FICHAS_DE_EJEMPLO, visible)

    for (let indice = 1; indice < fichas.length; indice += 1) {
      const anterior = fichas[indice - 1]
      const actual = fichas[indice]

      if (anterior === undefined || actual === undefined) {
        continue
      }

      expect(actual.segundoInicio).toBeGreaterThanOrEqual(anterior.segundoInicio)
    }
  })
})
