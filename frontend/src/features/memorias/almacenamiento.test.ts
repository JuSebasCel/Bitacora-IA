import { beforeEach, describe, expect, it } from 'vitest'
import { CLAVE_MEMORIAS, eliminarMemoria, guardarMemoria, todasLasMemorias } from './almacenamiento'
import type { Memoria } from './data'

beforeEach(() => {
  sessionStorage.clear()
})

const MEMORIA: Memoria = {
  id: 'mem-prueba',
  idConferencia: 'cnf-prueba',
  idPlantilla: 'pla-prueba',
  nombre: 'Memoria de prueba',
  generadaEl: '2026-05-01T00:00:00.000Z',
}

describe('todasLasMemorias', () => {
  it('sin nada guardado, devuelve la semilla del fixture', () => {
    const memorias = todasLasMemorias()

    expect(memorias.some((memoria) => memoria.id === 'mem-alc-01')).toBe(true)
  })

  it('un valor corrupto en sessionStorage se descarta y cae a la semilla', () => {
    sessionStorage.setItem(CLAVE_MEMORIAS, '{ esto no es JSON')

    expect(todasLasMemorias().length).toBeGreaterThan(0)
  })

  it('una entrada sin forma válida se descarta en silencio, sin tumbar el resto', () => {
    sessionStorage.setItem(CLAVE_MEMORIAS, JSON.stringify([{ id: 'sin-los-demas-campos' }]))

    expect(todasLasMemorias()).toEqual([])
  })

  it('acepta una memoria válida guardada', () => {
    guardarMemoria(MEMORIA)

    expect(todasLasMemorias().map((memoria) => memoria.id)).toContain(MEMORIA.id)
  })
})

describe('guardarMemoria', () => {
  it('agrega una memoria nueva y sobrevive a una nueva lectura', () => {
    guardarMemoria(MEMORIA)

    expect(todasLasMemorias().map((memoria) => memoria.id)).toContain(MEMORIA.id)
  })

  it('guardar dos veces con el mismo id no lo duplica', () => {
    guardarMemoria(MEMORIA)
    guardarMemoria(MEMORIA)

    expect(todasLasMemorias().filter((memoria) => memoria.id === MEMORIA.id)).toHaveLength(1)
  })
})

describe('eliminarMemoria', () => {
  it('la quita de lecturas posteriores', () => {
    guardarMemoria(MEMORIA)

    eliminarMemoria(MEMORIA.id)

    expect(todasLasMemorias().map((memoria) => memoria.id)).not.toContain(MEMORIA.id)
  })

  it('borrar la última memoria deja un arreglo vacío guardado, sin resucitar la semilla', () => {
    for (const memoria of todasLasMemorias()) {
      eliminarMemoria(memoria.id)
    }

    expect(todasLasMemorias()).toEqual([])
  })
})
