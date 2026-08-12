import { describe, expect, it } from 'vitest'
import { limitarALienzo, moverElemento, redimensionarElemento, TAMANO_MINIMO } from './geometria'
import type { Rectangulo } from './geometria'

const RECTANGULO_BASE: Rectangulo = { x: 0.1, y: 0.1, ancho: 0.3, alto: 0.2 }

describe('limitarALienzo', () => {
  it('deja intacto un rectángulo que ya cabe dentro del lienzo', () => {
    expect(limitarALienzo(RECTANGULO_BASE)).toEqual(RECTANGULO_BASE)
  })

  it('recorta x para que el elemento no se salga por la derecha', () => {
    const resultado = limitarALienzo({ x: 0.9, y: 0.1, ancho: 0.3, alto: 0.2 })

    expect(resultado.x).toBe(0.7)
  })

  it('recorta y para que el elemento no se salga por abajo', () => {
    const resultado = limitarALienzo({ x: 0.1, y: 0.95, ancho: 0.3, alto: 0.2 })

    expect(resultado.y).toBe(0.8)
  })

  it('no deja x ni y negativos', () => {
    const resultado = limitarALienzo({ x: -0.5, y: -0.5, ancho: 0.3, alto: 0.2 })

    expect(resultado.x).toBe(0)
    expect(resultado.y).toBe(0)
  })

  it('no deja el ancho ni el alto superar 1', () => {
    const resultado = limitarALienzo({ x: 0, y: 0, ancho: 2, alto: 3 })

    expect(resultado.ancho).toBe(1)
    expect(resultado.alto).toBe(1)
  })

  it('respeta un tamaño mínimo, nunca deja un elemento en 0', () => {
    const resultado = limitarALienzo({ x: 0.1, y: 0.1, ancho: 0, alto: -1 })

    expect(resultado.ancho).toBe(TAMANO_MINIMO)
    expect(resultado.alto).toBe(TAMANO_MINIMO)
  })
})

describe('moverElemento', () => {
  it('desplaza x e y por el delta dado', () => {
    const resultado = moverElemento(RECTANGULO_BASE, 0.05, -0.02)

    expect(resultado.x).toBeCloseTo(0.15)
    expect(resultado.y).toBeCloseTo(0.08)
  })

  it('no cambia el tamaño del elemento', () => {
    const resultado = moverElemento(RECTANGULO_BASE, 0.05, 0.05)

    expect(resultado.ancho).toBe(RECTANGULO_BASE.ancho)
    expect(resultado.alto).toBe(RECTANGULO_BASE.alto)
  })

  it('no deja mover el elemento fuera del lienzo, y conserva su tamaño', () => {
    const resultado = moverElemento(RECTANGULO_BASE, 5, 5)

    expect(resultado.x).toBeCloseTo(1 - RECTANGULO_BASE.ancho)
    expect(resultado.y).toBeCloseTo(1 - RECTANGULO_BASE.alto)
    expect(resultado.ancho).toBe(RECTANGULO_BASE.ancho)
    expect(resultado.alto).toBe(RECTANGULO_BASE.alto)
  })
})

describe('redimensionarElemento', () => {
  it('cambia ancho y alto por el delta dado', () => {
    const resultado = redimensionarElemento(RECTANGULO_BASE, 0.1, 0.1)

    expect(resultado.ancho).toBeCloseTo(0.4)
    expect(resultado.alto).toBeCloseTo(0.3)
  })

  it('no cambia la posición del elemento', () => {
    const resultado = redimensionarElemento(RECTANGULO_BASE, 0.1, 0.1)

    expect(resultado.x).toBe(RECTANGULO_BASE.x)
    expect(resultado.y).toBe(RECTANGULO_BASE.y)
  })

  it('no deja el elemento crecer más allá del borde del lienzo', () => {
    const resultado = redimensionarElemento(RECTANGULO_BASE, 5, 5)

    expect(resultado.x + resultado.ancho).toBeLessThanOrEqual(1)
    expect(resultado.y + resultado.alto).toBeLessThanOrEqual(1)
    expect(resultado.ancho).toBeLessThanOrEqual(1)
    expect(resultado.alto).toBeLessThanOrEqual(1)
  })

  it('no deja reducir por debajo del tamaño mínimo', () => {
    const resultado = redimensionarElemento(RECTANGULO_BASE, -5, -5)

    expect(resultado.ancho).toBe(TAMANO_MINIMO)
    expect(resultado.alto).toBe(TAMANO_MINIMO)
  })
})
