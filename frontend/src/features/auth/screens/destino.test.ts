import { describe, expect, test } from 'vitest'
import { destinoTrasAcceder } from './destino'

describe('destinoTrasAcceder', () => {
  test('devuelve la ruta que se había pedido', () => {
    expect(destinoTrasAcceder({ desde: { pathname: '/plantillas' } })).toBe('/plantillas')
  })

  test('conserva la consulta y el fragmento', () => {
    const estado = { desde: { pathname: '/catalogo', search: '?tema=ia', hash: '#f-12' } }

    expect(destinoTrasAcceder(estado)).toBe('/catalogo?tema=ia#f-12')
  })

  test('cae al listado de conferencias cuando no hay estado', () => {
    expect(destinoTrasAcceder(null)).toBe('/conferencias')
    expect(destinoTrasAcceder(undefined)).toBe('/conferencias')
    expect(destinoTrasAcceder({})).toBe('/conferencias')
    expect(destinoTrasAcceder({ desde: null })).toBe('/conferencias')
    expect(destinoTrasAcceder({ desde: { pathname: 42 } })).toBe('/conferencias')
  })

  test('rechaza destinos externos, para no habilitar una redirección abierta', () => {
    expect(destinoTrasAcceder({ desde: { pathname: '//evil.example' } })).toBe('/conferencias')
    expect(destinoTrasAcceder({ desde: { pathname: 'https://evil.example' } })).toBe(
      '/conferencias',
    )
  })

  test('no devuelve a una ruta pública recién resuelta', () => {
    expect(destinoTrasAcceder({ desde: { pathname: '/acceso' } })).toBe('/conferencias')
    expect(destinoTrasAcceder({ desde: { pathname: '/registro' } })).toBe('/conferencias')
  })
})
