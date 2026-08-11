import { describe, expect, it } from 'vitest'
import { formatearDuracion, formatearFecha, formatearTimestamp } from './formato'

/*
  Todo el formato del módulo se prueba contra salidas literales, porque el
  objetivo de estas funciones es justamente no depender de Date ni de Intl:
  `new Date('2026-04-14')` se interpreta como UTC y en zona horaria de Colombia
  devuelve el día anterior, y `toLocaleDateString` cambia de salida según la
  versión de ICU del entorno. Una prueba que aceptara "cualquier fecha
  razonable" no detectaría ninguno de los dos problemas.
*/

describe('formatearTimestamp', () => {
  it('escribe la coordenada con horas, minutos y segundos de dos cifras', () => {
    expect(formatearTimestamp(765)).toBe('00:12:45')
    expect(formatearTimestamp(0)).toBe('00:00:00')
    expect(formatearTimestamp(59)).toBe('00:00:59')
  })

  it('conserva el ancho fijo al pasar de una hora', () => {
    expect(formatearTimestamp(3600)).toBe('01:00:00')
    expect(formatearTimestamp(3725)).toBe('01:02:05')
  })

  /* Un segundo negativo o fraccionario solo puede venir de un dato corrupto. */
  it('no produce basura ante una entrada imposible', () => {
    expect(formatearTimestamp(-10)).toBe('00:00:00')
    expect(formatearTimestamp(12.7)).toBe('00:00:12')
  })
})

describe('formatearDuracion', () => {
  it('omite las horas cuando la charla dura menos de una', () => {
    expect(formatearDuracion(2890)).toBe('48:10')
    expect(formatearDuracion(1840)).toBe('30:40')
  })

  it('muestra las horas sin rellenar cuando la charla las supera', () => {
    expect(formatearDuracion(3720)).toBe('1:02:00')
    expect(formatearDuracion(7325)).toBe('2:02:05')
  })

  it('resuelve el caso de duración cero sin caer en texto vacío', () => {
    expect(formatearDuracion(0)).toBe('00:00')
  })
})

describe('formatearFecha', () => {
  it('escribe la fecha ISO en día, mes abreviado y año', () => {
    expect(formatearFecha('2026-04-14')).toBe('14 abr 2026')
    expect(formatearFecha('2025-10-08')).toBe('8 oct 2025')
    expect(formatearFecha('2026-01-01')).toBe('1 ene 2026')
    expect(formatearFecha('2026-12-31')).toBe('31 dic 2026')
  })

  /*
    Este es el caso que delata el uso de Date: al interpretarse como UTC, en
    zona horaria de Colombia el día 14 se convierte en 13.
  */
  it('no corre la fecha un día por interpretar la cadena como UTC', () => {
    expect(formatearFecha('2026-04-14')).toContain('14')
    expect(formatearFecha('2026-04-14')).not.toContain('13')
  })

  it('devuelve la cadena original cuando no tiene formato ISO', () => {
    expect(formatearFecha('14/04/2026')).toBe('14/04/2026')
    expect(formatearFecha('')).toBe('')
  })
})
