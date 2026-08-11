import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  PantallaCargarConferencia,
  PantallaCatalogo,
  PantallaConfiguracion,
  PantallaMemorias,
  PantallaPlantillas,
} from './index'

/*
  Conferencias salió de esta lista al construirse F2: su pantalla real tiene sus
  propias pruebas de política en `features/conferencias/screens/politica.test.tsx`,
  con las mismas reglas menos las palabras que en ese módulo son vocabulario de
  dominio y no lenguaje de obra en curso.
*/
const PANTALLAS = [
  { titulo: 'Cargar conferencia', Pantalla: PantallaCargarConferencia },
  { titulo: 'Catálogo', Pantalla: PantallaCatalogo },
  { titulo: 'Memorias', Pantalla: PantallaMemorias },
  { titulo: 'Plantillas', Pantalla: PantallaPlantillas },
  { titulo: 'Configuración', Pantalla: PantallaConfiguracion },
] as const

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '\u2014'

const LENGUAJE_PROHIBIDO =
  /próximamente|proximamente|en construcción|en construccion|pendiente|wip|beta|aún no|aun no|no disponible|v0\.\d/i

describe('Pantallas de los módulos', () => {
  it.each(PANTALLAS)('$titulo se anuncia con su encabezado', ({ titulo, Pantalla }) => {
    render(<Pantalla />)

    expect(screen.getByRole('heading', { level: 1, name: titulo })).toBeInTheDocument()
  })

  it.each(PANTALLAS)('$titulo describe qué contiene la pantalla', ({ titulo, Pantalla }) => {
    render(<Pantalla />)

    const encabezado = screen.getByRole('heading', { level: 1, name: titulo })
    const descripcion = encabezado.parentElement?.textContent?.replace(titulo, '').trim() ?? ''

    expect(descripcion.length).toBeGreaterThan(30)
  })

  it.each(PANTALLAS)('$titulo no usa lenguaje de obra en curso', ({ Pantalla }) => {
    render(<Pantalla />)

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_PROHIBIDO)
  })

  it.each(PANTALLAS)('$titulo no usa el guion largo en su texto', ({ Pantalla }) => {
    render(<Pantalla />)

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})
