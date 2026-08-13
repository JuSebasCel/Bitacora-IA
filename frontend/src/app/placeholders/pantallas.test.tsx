import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PantallaConfiguracion } from './index'

/*
  Conferencias, Cargar conferencia, Catálogo, Plantillas y Memorias salieron
  de esta lista al construirse F2, F3, F6, F4 y F5: sus pantallas reales
  tienen sus propias pruebas de política en
  `features/conferencias/screens/politica.test.tsx`,
  `features/catalogo/screens/politica.test.tsx`,
  `features/plantillas/screens/politica.test.tsx` y
  `features/memorias/screens/politica.test.tsx`, con las mismas reglas menos
  las palabras que en esos módulos son vocabulario de dominio y no lenguaje de
  obra en curso.
*/
const PANTALLAS = [{ titulo: 'Configuración', Pantalla: PantallaConfiguracion }] as const

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
