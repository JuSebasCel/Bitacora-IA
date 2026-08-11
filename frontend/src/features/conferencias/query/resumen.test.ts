import { describe, expect, it } from 'vitest'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '../data'
import { conferenciasVisibles, fichasVisibles } from './acceso'
import { resumirFichas } from './resumen'

function visibleDe(idUsuario: string, idConferencia: string) {
  const visible = conferenciasVisibles(CONFERENCIAS_DE_EJEMPLO, idUsuario).find(
    (candidata) => candidata.conferencia.id === idConferencia,
  )

  if (visible === undefined) {
    throw new Error(`El fixture ya no hace visible ${idConferencia} para ${idUsuario}`)
  }

  return visible
}

function resumenDe(idUsuario: string, idConferencia: string) {
  return resumirFichas(fichasVisibles(FICHAS_DE_EJEMPLO, visibleDe(idUsuario, idConferencia)))
}

describe('resumirFichas', () => {
  it('cuenta el total de fichas recibidas', () => {
    const resumen = resumenDe('usr-alcantara', 'cnf-alc-01')

    expect(resumen.total).toBe(9)
  })

  it('reparte el total entre los tres estados de validación', () => {
    const resumen = resumenDe('usr-alcantara', 'cnf-alc-01')
    const { validada, pendiente, automatica } = resumen.porEstado

    expect(validada + pendiente + automatica).toBe(resumen.total)
    expect(pendiente).toBe(1)
    expect(automatica).toBe(1)
  })

  /*
    Los tipos que valen cero tienen que aparecer igual: el detalle muestra la
    distribución completa, y un tipo ausente es información, no un hueco.
  */
  it('declara los seis tipos de unidad aunque alguno valga cero', () => {
    const resumen = resumenDe('usr-penaloza', 'cnf-pen-01')

    expect(Object.keys(resumen.porTipo)).toHaveLength(6)
    expect(resumen.porTipo['postura']).toBe(0)
    expect(resumen.porTipo['cita-textual']).toBe(1)
  })

  it('reparte el total entre los seis tipos de unidad', () => {
    const resumen = resumenDe('usr-zuluaga', 'cnf-zul-01')
    const suma = Object.values(resumen.porTipo).reduce((total, cuenta) => total + cuenta, 0)

    expect(suma).toBe(resumen.total)
  })

  it('devuelve todo en cero para una conferencia sin fichas', () => {
    const resumen = resumirFichas([])

    expect(resumen.total).toBe(0)
    expect(resumen.porEstado.validada).toBe(0)
    expect(resumen.porEstado.pendiente).toBe(0)
    expect(resumen.porEstado.automatica).toBe(0)
    expect(Object.values(resumen.porTipo).every((cuenta) => cuenta === 0)).toBe(true)
  })

  /*
    El resumen se calcula sobre lo que esa persona puede ver, no sobre el total
    real. Si contara el total, el conteo delataría cuántas fichas pendientes
    esconde una compartición que decidió no mostrarlas.
  */
  it('cuenta solo lo visible cuando la compartición oculta las pendientes', () => {
    const resumenDelDueno = resumenDe('usr-alcantara', 'cnf-alc-03')
    const resumenDelInvitado = resumenDe('usr-zuluaga', 'cnf-alc-03')

    expect(resumenDelDueno.porEstado.pendiente).toBeGreaterThan(0)
    expect(resumenDelInvitado.porEstado.pendiente).toBe(0)
    expect(resumenDelInvitado.total).toBeLessThan(resumenDelDueno.total)
  })

  it('no altera la lista de fichas que recibe', () => {
    const fichas = fichasVisibles(FICHAS_DE_EJEMPLO, visibleDe('usr-alcantara', 'cnf-alc-01'))
    const copia = [...fichas]

    resumirFichas(fichas)

    expect(fichas).toEqual(copia)
  })
})
