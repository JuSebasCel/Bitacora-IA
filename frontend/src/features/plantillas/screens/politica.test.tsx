import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { PantallaEditorDePlantilla } from './PantallaEditorDePlantilla'
import { PantallaPlantillas } from './PantallaPlantillas'

/*
  Reglas de redacción de las pantallas de F4. Mismo criterio que
  `features/conferencias/screens/politica.test.tsx`: reemplaza al recorrido
  genérico de `app/placeholders/pantallas.test.tsx` con las palabras propias
  de este dominio ya fuera de la lista prohibida donde aplica.
*/

const LENGUAJE_DE_OBRA_EN_CURSO =
  /próximamente|proximamente|en construcción|en construccion|wip|beta|disponible pronto|v0\.\d/i

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '—'

beforeEach(() => {
  sessionStorage.clear()
})

function montarListado() {
  return render(
    <MemoryRouter initialEntries={['/plantillas']}>
      <Routes>
        <Route path="/plantillas" element={<PantallaPlantillas />} />
        <Route path="/plantillas/:idPlantilla" element={<p>Editor</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function montarEditor() {
  return render(
    <MemoryRouter initialEntries={['/plantillas/pla-memoria-estandar']}>
      <Routes>
        <Route path="/plantillas" element={<p>Listado</p>} />
        <Route path="/plantillas/:idPlantilla" element={<PantallaEditorDePlantilla />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Redacción de la pantalla de plantillas', () => {
  it('se anuncia con un encabezado de nivel 1', () => {
    montarListado()

    expect(screen.getByRole('heading', { level: 1, name: 'Plantillas' })).toBeInTheDocument()
  })

  it('describe con una línea qué trabajo se hace en la sección', () => {
    montarListado()

    const encabezado = screen.getByRole('heading', { level: 1, name: 'Plantillas' })
    const descripcion = encabezado.parentElement?.textContent?.replace('Plantillas', '').trim() ?? ''

    expect(descripcion.length).toBeGreaterThan(30)
  })

  it('no usa lenguaje de obra en curso', () => {
    montarListado()

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })

  it('no usa el guion largo en ningún texto visible', () => {
    montarListado()

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})

describe('Redacción de la pantalla del editor de plantillas', () => {
  it('no usa lenguaje de obra en curso', () => {
    montarEditor()

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })

  it('no usa el guion largo en ningún texto visible', () => {
    montarEditor()

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})
