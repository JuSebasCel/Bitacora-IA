import { afterEach, describe, expect, it, vi } from 'vitest'
import { ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO } from '../data'
import { CLAVE_ETIQUETAS, espacioDe, guardarEspacio, leerEspaciosGuardados } from './almacenamiento'

/*
  El almacenamiento es la superficie por la que entra al programa contenido que
  no escribió el programa. Por eso la mitad de estas pruebas son sobre datos
  rotos: lo que no se puede validar se descarta, y abrir el dashboard nunca
  depende de que lo guardado esté sano.
*/

const ZULUAGA = 'usr-zuluaga'
const PENALOZA = 'usr-penaloza'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('espacioDe', () => {
  it('parte del fixture cuando no hay nada guardado', () => {
    expect(espacioDe(ZULUAGA)).toEqual(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[ZULUAGA])
  })

  it('devuelve un espacio vacío para quien no tiene ni fixture ni nada guardado', () => {
    const espacio = espacioDe('usr-inexistente')

    expect(espacio.etiquetas).toHaveLength(0)
    expect(espacio.asignaciones).toHaveLength(0)
  })

  it('devuelve un espacio vacío para quien tiene fixture vacío', () => {
    expect(espacioDe(PENALOZA).etiquetas).toHaveLength(0)
  })

  /*
    Lo guardado reemplaza al fixture y no se fusiona: fusionar resucitaría las
    etiquetas que la persona quitó.
  */
  it('deja que lo guardado reemplace al fixture', () => {
    guardarEspacio(ZULUAGA, { etiquetas: [], asignaciones: [] })

    expect(espacioDe(ZULUAGA).etiquetas).toHaveLength(0)
  })

  it('conserva el espacio de una persona al guardar el de otra', () => {
    guardarEspacio(PENALOZA, {
      etiquetas: [{ id: 'etq-pen-art9', nombre: 'art9', idPropietario: PENALOZA }],
      asignaciones: [],
    })

    expect(espacioDe(PENALOZA).etiquetas).toHaveLength(1)
    expect(espacioDe(ZULUAGA)).toEqual(ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[ZULUAGA])
  })
})

describe('leerEspaciosGuardados', () => {
  it('devuelve un mapa vacío cuando no hay nada', () => {
    expect(leerEspaciosGuardados()).toEqual({})
  })

  it('recupera lo que guardó', () => {
    const espacio = {
      etiquetas: [{ id: 'etq-zul-art2', nombre: 'art2', idPropietario: ZULUAGA }],
      asignaciones: [{ idEtiqueta: 'etq-zul-art2', idConferencia: 'cnf-zul-01' }],
    }

    guardarEspacio(ZULUAGA, espacio)

    expect(leerEspaciosGuardados()[ZULUAGA]).toEqual(espacio)
  })

  it('descarta un contenido que no es JSON válido', () => {
    sessionStorage.setItem(CLAVE_ETIQUETAS, '{esto no es json')

    expect(leerEspaciosGuardados()).toEqual({})
  })

  it('descarta un JSON válido con la forma equivocada', () => {
    sessionStorage.setItem(CLAVE_ETIQUETAS, JSON.stringify(['una', 'lista']))

    expect(leerEspaciosGuardados()).toEqual({})
  })

  it('descarta las etiquetas rotas y conserva las sanas del mismo espacio', () => {
    sessionStorage.setItem(
      CLAVE_ETIQUETAS,
      JSON.stringify({
        [ZULUAGA]: {
          etiquetas: [
            { id: 'etq-zul-art2', nombre: 'art2', idPropietario: ZULUAGA },
            { id: '', nombre: 'sin identificador', idPropietario: ZULUAGA },
            { nombre: 'sin id ni propietario' },
            'ni siquiera un objeto',
          ],
          asignaciones: [{ idEtiqueta: 'etq-zul-art2', idConferencia: 'cnf-zul-01' }],
        },
      }),
    )

    expect(leerEspaciosGuardados()[ZULUAGA]?.etiquetas).toHaveLength(1)
  })

  /*
    Una asignación que apunta a una etiqueta que se descartó dejaría una
    conferencia filtrada por algo que ya no existe.
  */
  it('descarta las asignaciones que apuntan a una etiqueta descartada', () => {
    sessionStorage.setItem(
      CLAVE_ETIQUETAS,
      JSON.stringify({
        [ZULUAGA]: {
          etiquetas: [{ id: 'etq-zul-art2', nombre: 'art2', idPropietario: ZULUAGA }],
          asignaciones: [
            { idEtiqueta: 'etq-zul-art2', idConferencia: 'cnf-zul-01' },
            { idEtiqueta: 'etq-fantasma', idConferencia: 'cnf-zul-03' },
          ],
        },
      }),
    )

    expect(leerEspaciosGuardados()[ZULUAGA]?.asignaciones).toHaveLength(1)
  })

  it('no tumba la aplicación cuando el almacenamiento lanza al leer', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado')
    })

    expect(() => leerEspaciosGuardados()).not.toThrow()
    expect(leerEspaciosGuardados()).toEqual({})
  })

  it('no tumba la aplicación cuando el almacenamiento lanza al escribir', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota llena')
    })

    expect(() => guardarEspacio(ZULUAGA, { etiquetas: [], asignaciones: [] })).not.toThrow()
  })
})
