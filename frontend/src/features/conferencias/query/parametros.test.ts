import { describe, expect, it } from 'vitest'
import { CRITERIOS_POR_DEFECTO } from './filtros'
import type { CriteriosDeListado } from './filtros'
import { escribirCriterios, leerCriterios } from './parametros'

/*
  Los criterios del dashboard viven en la URL para que una vista filtrada se
  pueda compartir como enlace y sobreviva a un recargado (PLAN.md sección 7).

  Eso significa que la entrada es texto que cualquiera puede escribir a mano,
  así que `leerCriterios` no puede lanzar nunca: un valor que no reconoce cae al
  valor por defecto y la pantalla sigue funcionando.
*/

const ETIQUETAS_CONOCIDAS = ['etq-zul-ia', 'etq-zul-tesis', 'etq-zul-revision']

function leer(consulta: string, conocidas?: readonly string[]): CriteriosDeListado {
  return conocidas === undefined
    ? leerCriterios(new URLSearchParams(consulta))
    : leerCriterios(new URLSearchParams(consulta), conocidas)
}

describe('leerCriterios', () => {
  it('devuelve los criterios por defecto cuando no hay parámetros', () => {
    expect(leer('')).toEqual(CRITERIOS_POR_DEFECTO)
  })

  it('lee cada criterio de su parámetro', () => {
    const criterios = leer('segmento=compartidas&buscar=andino&estado=procesada&orden=titulo-asc')

    expect(criterios.segmento).toBe('compartidas')
    expect(criterios.busqueda).toBe('andino')
    expect(criterios.estado).toBe('procesada')
    expect(criterios.orden).toBe('titulo-asc')
  })

  it('lee la lista de etiquetas separada por comas', () => {
    const criterios = leer('etiquetas=etq-zul-ia,etq-zul-tesis')

    expect(criterios.etiquetas).toEqual(['etq-zul-ia', 'etq-zul-tesis'])
  })

  it('cae al valor por defecto ante un segmento, estado u orden que no reconoce', () => {
    const criterios = leer('segmento=ajenas&estado=congelada&orden=al-azar')

    expect(criterios.segmento).toBe(CRITERIOS_POR_DEFECTO.segmento)
    expect(criterios.estado).toBe(CRITERIOS_POR_DEFECTO.estado)
    expect(criterios.orden).toBe(CRITERIOS_POR_DEFECTO.orden)
  })

  it('limpia comas sueltas y espacios de la lista de etiquetas', () => {
    expect(leer('etiquetas=,etq-zul-ia,,  ,etq-zul-tesis,').etiquetas).toEqual([
      'etq-zul-ia',
      'etq-zul-tesis',
    ])
    expect(leer('etiquetas=').etiquetas).toEqual([])
  })

  it('no repite una etiqueta que venga dos veces', () => {
    expect(leer('etiquetas=etq-zul-ia,etq-zul-ia').etiquetas).toEqual(['etq-zul-ia'])
  })

  /*
    Las etiquetas son privadas, así que un enlace filtrado que viaja de una
    persona a otra trae identificadores que no existen en el espacio de quien
    lo abre. Descartarlos es el comportamiento correcto, no un error: la
    pantalla lo avisa con una línea, sin código de error.
  */
  it('descarta las etiquetas que no existen en el espacio de quien consulta', () => {
    const criterios = leer('etiquetas=etq-zul-ia,etq-de-otra-persona', ETIQUETAS_CONOCIDAS)

    expect(criterios.etiquetas).toEqual(['etq-zul-ia'])
  })

  it('conserva todas las etiquetas cuando no se le pasa con qué contrastarlas', () => {
    expect(leer('etiquetas=etq-de-otra-persona').etiquetas).toEqual(['etq-de-otra-persona'])
  })

  it('conserva el texto de búsqueda tal como se escribió, con sus espacios internos', () => {
    expect(leer('buscar=modelos+de+lenguaje').busqueda).toBe('modelos de lenguaje')
  })
})

describe('escribirCriterios', () => {
  /*
    Omitir los valores por defecto deja limpia la URL del dashboard sin filtrar,
    que es la que más se ve y la que la gente copia.
  */
  it('no escribe nada cuando los criterios son los de por defecto', () => {
    expect(escribirCriterios(CRITERIOS_POR_DEFECTO).toString()).toBe('')
  })

  it('escribe solo los criterios que se apartan del valor por defecto', () => {
    const params = escribirCriterios({ ...CRITERIOS_POR_DEFECTO, segmento: 'propias' })

    expect(params.get('segmento')).toBe('propias')
    expect(params.has('orden')).toBe(false)
    expect(params.has('buscar')).toBe(false)
  })

  it('escribe la lista de etiquetas separada por comas', () => {
    const params = escribirCriterios({
      ...CRITERIOS_POR_DEFECTO,
      etiquetas: ['etq-zul-ia', 'etq-zul-tesis'],
    })

    expect(params.get('etiquetas')).toBe('etq-zul-ia,etq-zul-tesis')
  })

  it('omite la búsqueda cuando solo tiene espacios', () => {
    expect(escribirCriterios({ ...CRITERIOS_POR_DEFECTO, busqueda: '   ' }).toString()).toBe('')
  })
})

describe('ida y vuelta', () => {
  const casos: readonly CriteriosDeListado[] = [
    { ...CRITERIOS_POR_DEFECTO, segmento: 'compartidas', orden: 'fichas-desc' },
    { ...CRITERIOS_POR_DEFECTO, busqueda: 'modelos de lenguaje', estado: 'procesada' },
    { ...CRITERIOS_POR_DEFECTO, etiquetas: ['etq-zul-ia', 'etq-zul-tesis'], orden: 'titulo-asc' },
  ]

  it('recupera los mismos criterios que escribió', () => {
    for (const criterios of casos) {
      expect(leerCriterios(escribirCriterios(criterios), ETIQUETAS_CONOCIDAS)).toEqual(criterios)
    }
  })
})
