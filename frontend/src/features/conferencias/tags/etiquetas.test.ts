import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_DE_ETIQUETA } from '@/shared/errors'
import { ESPACIO_DE_ETIQUETAS_VACIO } from '../data'
import type { EspacioDeEtiquetas } from '../data'
import {
  asignarEtiqueta,
  crearEtiqueta,
  etiquetasDeConferencia,
  etiquetasVisibles,
  quitarEtiqueta,
} from './etiquetas'

const ZULUAGA = 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178'
const ALCANTARA = '1ba5af9a-f6a2-4504-ab60-1f018c21290a'

const ESPACIO_DE_ZULUAGA: EspacioDeEtiquetas = {
  etiquetas: [
    { id: 'etq-zul-tesis', nombre: 'tesis', idPropietario: ZULUAGA },
    { id: 'etq-zul-ia', nombre: 'IA', idPropietario: ZULUAGA },
  ],
  asignaciones: [
    { idEtiqueta: 'etq-zul-tesis', idConferencia: 'cnf-alc-03' },
    { idEtiqueta: 'etq-zul-ia', idConferencia: 'cnf-alc-01' },
  ],
}

const ESPACIO_DE_ALCANTARA: EspacioDeEtiquetas = {
  etiquetas: [
    { id: 'etq-alc-ia', nombre: 'IA', idPropietario: ALCANTARA },
    { id: 'etq-alc-art1', nombre: 'art1', idPropietario: ALCANTARA },
  ],
  asignaciones: [
    { idEtiqueta: 'etq-alc-ia', idConferencia: 'cnf-alc-01' },
    { idEtiqueta: 'etq-alc-art1', idConferencia: 'cnf-alc-01' },
  ],
}

function crearOFallar(espacio: EspacioDeEtiquetas, nombre: string): EspacioDeEtiquetas {
  const resultado = crearEtiqueta(espacio, ZULUAGA, nombre)

  if (!resultado.ok) {
    throw new Error(`No se pudo crear la etiqueta: ${resultado.codigo}`)
  }

  return resultado.espacio
}

describe('crearEtiqueta', () => {
  it('rechaza un nombre vacío o compuesto solo de espacios', () => {
    for (const nombre of ['', '   ', '\t']) {
      const resultado = crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, nombre)

      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.codigo).toBe('ETQ_NOMBRE_REQUERIDO')
      }
    }
  })

  it('conserva el nombre tal como se escribió, recortando solo los extremos', () => {
    const resultado = crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, '  Revisión 2026  ')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.etiqueta.nombre).toBe('Revisión 2026')
    }
  })

  it('atribuye la etiqueta creada a quien la crea', () => {
    const resultado = crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, 'art2')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.etiqueta.idPropietario).toBe(ZULUAGA)
      expect(resultado.espacio.etiquetas).toHaveLength(3)
    }
  })

  it('rechaza un nombre que ya existe en el mismo espacio', () => {
    const resultado = crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, 'tesis')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.codigo).toBe('ETQ_YA_EXISTE')
    }
  })

  /*
    "Tesis", "tesis" y "TESIS" son la misma etiqueta para quien las escribe.
    Permitir las tres llenaría el filtro de duplicados que nadie quiso crear.
  */
  it('considera repetido un nombre que solo cambia en mayúsculas o tildes', () => {
    for (const nombre of ['TESIS', 'Tesis', 'tésis']) {
      const resultado = crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, nombre)

      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.codigo).toBe('ETQ_YA_EXISTE')
      }
    }
  })

  it('acepta el nombre más largo permitido y rechaza el siguiente', () => {
    const alLimite = 'a'.repeat(LARGO_MAXIMO_DE_ETIQUETA)
    const pasado = 'a'.repeat(LARGO_MAXIMO_DE_ETIQUETA + 1)

    expect(crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, alLimite).ok).toBe(true)

    const resultado = crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, pasado)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.codigo).toBe('ETQ_NOMBRE_MUY_LARGO')
    }
  })

  it('genera identificadores distintos para nombres distintos', () => {
    const conUna = crearOFallar(ESPACIO_DE_ZULUAGA, 'art2')
    const conDos = crearOFallar(conUna, 'art3')
    const ids = conDos.etiquetas.map((etiqueta) => etiqueta.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no altera el espacio que recibe', () => {
    const copia = structuredClone(ESPACIO_DE_ZULUAGA)

    crearEtiqueta(ESPACIO_DE_ZULUAGA, ZULUAGA, 'art2')

    expect(ESPACIO_DE_ZULUAGA).toEqual(copia)
  })
})

describe('asignarEtiqueta', () => {
  it('asigna una etiqueta propia a una conferencia', () => {
    const resultado = asignarEtiqueta(ESPACIO_DE_ZULUAGA, 'etq-zul-ia', 'cnf-zul-01')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(
        etiquetasDeConferencia(resultado.espacio, 'cnf-zul-01').map((etiqueta) => etiqueta.id),
      ).toEqual(['etq-zul-ia'])
    }
  })

  it('no duplica la asignación cuando ya existe', () => {
    const resultado = asignarEtiqueta(ESPACIO_DE_ZULUAGA, 'etq-zul-ia', 'cnf-alc-01')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.espacio.asignaciones).toHaveLength(ESPACIO_DE_ZULUAGA.asignaciones.length)
    }
  })

  it('rechaza asignar una etiqueta que no está en el espacio de quien la asigna', () => {
    const resultado = asignarEtiqueta(ESPACIO_DE_ZULUAGA, 'etq-alc-ia', 'cnf-zul-01')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.codigo).toBe('ETQ_NO_EDITABLE')
    }
  })
})

describe('quitarEtiqueta', () => {
  it('quita la asignación sin borrar la etiqueta', () => {
    const resultado = quitarEtiqueta(ESPACIO_DE_ZULUAGA, 'etq-zul-ia', 'cnf-alc-01')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(etiquetasDeConferencia(resultado.espacio, 'cnf-alc-01')).toHaveLength(0)
      expect(resultado.espacio.etiquetas).toHaveLength(2)
    }
  })

  /*
    La interfaz no ofrece el control para quitar una etiqueta ajena, pero la
    regla se aplica igual en el dato. PLAN.md sección 6.3 exige que el
    aislamiento no dependa de que la interfaz oculte cosas.
  */
  it('rechaza quitar una etiqueta que pertenece a otra persona', () => {
    const resultado = quitarEtiqueta(ESPACIO_DE_ZULUAGA, 'etq-alc-ia', 'cnf-alc-01')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.codigo).toBe('ETQ_NO_EDITABLE')
    }
  })

  it('no falla al quitar una asignación que no existía', () => {
    const resultado = quitarEtiqueta(ESPACIO_DE_ZULUAGA, 'etq-zul-ia', 'cnf-zul-03')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.espacio.asignaciones).toEqual(ESPACIO_DE_ZULUAGA.asignaciones)
    }
  })
})

describe('etiquetasDeConferencia', () => {
  it('devuelve solo las etiquetas asignadas a esa conferencia', () => {
    expect(etiquetasDeConferencia(ESPACIO_DE_ZULUAGA, 'cnf-alc-03').map((e) => e.nombre)).toEqual([
      'tesis',
    ])
  })

  it('devuelve una lista vacía cuando la conferencia no tiene ninguna', () => {
    expect(etiquetasDeConferencia(ESPACIO_DE_ETIQUETAS_VACIO, 'cnf-alc-01')).toHaveLength(0)
  })
})

describe('etiquetasVisibles', () => {
  it('marca como propias las etiquetas de quien mira', () => {
    const visibles = etiquetasVisibles({
      espacioPropio: ESPACIO_DE_ZULUAGA,
      espacioDelDueno: null,
      idConferencia: 'cnf-alc-01',
      compartirEtiquetas: false,
    })

    expect(visibles).toHaveLength(1)
    expect(visibles[0]?.propia).toBe(true)
    expect(visibles[0]?.etiqueta.nombre).toBe('IA')
  })

  it('añade las del dueño, marcadas como ajenas, cuando la compartición las incluye', () => {
    const visibles = etiquetasVisibles({
      espacioPropio: ESPACIO_DE_ZULUAGA,
      espacioDelDueno: ESPACIO_DE_ALCANTARA,
      idConferencia: 'cnf-alc-01',
      compartirEtiquetas: true,
    })

    const ajenas = visibles.filter((visible) => !visible.propia)

    expect(ajenas.map((visible) => visible.etiqueta.id).sort()).toEqual([
      'etq-alc-art1',
      'etq-alc-ia',
    ])
  })

  it('no añade ninguna del dueño cuando la compartición no las incluye', () => {
    const visibles = etiquetasVisibles({
      espacioPropio: ESPACIO_DE_ZULUAGA,
      espacioDelDueno: ESPACIO_DE_ALCANTARA,
      idConferencia: 'cnf-alc-01',
      compartirEtiquetas: false,
    })

    expect(visibles.every((visible) => visible.propia)).toBe(true)
  })

  /*
    Zuluaga y Alcántara tienen las dos una etiqueta llamada "IA" sobre la misma
    conferencia. Son etiquetas distintas y las dos se muestran: fundirlas por
    nombre borraría de quién es cada una.
  */
  it('conserva por separado dos etiquetas con el mismo nombre de personas distintas', () => {
    const visibles = etiquetasVisibles({
      espacioPropio: ESPACIO_DE_ZULUAGA,
      espacioDelDueno: ESPACIO_DE_ALCANTARA,
      idConferencia: 'cnf-alc-01',
      compartirEtiquetas: true,
    })

    const llamadasIa = visibles.filter((visible) => visible.etiqueta.nombre === 'IA')

    expect(llamadasIa).toHaveLength(2)
    expect(llamadasIa.filter((visible) => visible.propia)).toHaveLength(1)
  })
})
