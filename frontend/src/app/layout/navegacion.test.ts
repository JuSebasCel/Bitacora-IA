import { describe, expect, it } from 'vitest'
import { SECCIONES_DE_NAVEGACION, esSeccionActiva } from './navegacion'

/*
  F1 resolvía la sección activa con un booleano por sección y el `end` de
  NavLink. Dejó de servir al entrar el detalle de conferencia: con `end`,
  /conferencias/cnf-alc-01 no marcaba ninguna sección, y sin `end` marcaba dos a
  la vez en /conferencias/nueva.

  La regla que sí resuelve los dos casos es de especificidad: gana la sección
  más profunda que coincida con la ruta actual.
*/

function seccion(ruta: string) {
  const encontrada = SECCIONES_DE_NAVEGACION.find((candidata) => candidata.ruta === ruta)

  if (encontrada === undefined) {
    throw new Error(`La navegación ya no tiene la sección ${ruta}`)
  }

  return encontrada
}

function activasEn(rutaActual: string): string[] {
  return SECCIONES_DE_NAVEGACION.filter((candidata) => esSeccionActiva(candidata, rutaActual)).map(
    (candidata) => candidata.etiqueta,
  )
}

describe('esSeccionActiva', () => {
  it('marca la sección cuya ruta coincide exactamente', () => {
    expect(activasEn('/catalogo')).toEqual(['Catálogo'])
    expect(activasEn('/conferencias')).toEqual(['Conferencias'])
  })

  /*
    El caso que rompía el `end`: el detalle cuelga de Conferencias y de ninguna
    otra sección, así que Conferencias sigue siendo el sitio donde estás.
  */
  it('marca Conferencias en el detalle de una conferencia', () => {
    expect(activasEn('/conferencias/cnf-alc-01')).toEqual(['Conferencias'])
  })

  it('no marca nada en una ruta que no pertenece a ninguna sección', () => {
    expect(activasEn('/acceso')).toEqual([])
  })

  /*
    Una ruta que solo comparte el principio del texto no cuelga de la sección.
    Sin comprobar el separador, /conferencias-antiguas marcaría Conferencias.
  */
  it('no confunde un prefijo de texto con una ruta anidada', () => {
    expect(esSeccionActiva(seccion('/conferencias'), '/conferencias-antiguas')).toBe(false)
  })

  it('nunca marca más de una sección a la vez', () => {
    const rutas = [
      '/conferencias',
      '/conferencias/nueva',
      '/conferencias/cnf-zul-01',
      '/catalogo',
      '/memorias',
      '/plantillas',
      '/taxonomia',
      '/configuracion',
    ]

    for (const ruta of rutas) {
      expect(activasEn(ruta).length).toBeLessThanOrEqual(1)
    }
  })
})
