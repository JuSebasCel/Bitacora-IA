import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { PantallaCatalogo } from './PantallaCatalogo'

/*
  Reglas de redacción de la pantalla de F6. Mismo criterio que
  `features/memorias/screens/politica.test.tsx`.
*/

const LENGUAJE_DE_OBRA_EN_CURSO =
  /próximamente|proximamente|en construcción|en construccion|wip|beta|disponible pronto|v0\.\d/i

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '—'

const ALCANTARA = {
  id: 'usr-alcantara',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(ALCANTARA))
})

function montar() {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/catalogo']}>
        <Routes>
          <Route path="/catalogo" element={<PantallaCatalogo />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('Redacción de la pantalla de catálogo', () => {
  it('se anuncia con un encabezado de nivel 1', () => {
    montar()

    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
  })

  it('describe con una línea qué trabajo se hace en la sección', () => {
    montar()

    const encabezado = screen.getByRole('heading', { level: 1, name: 'Catálogo' })
    const descripcion = encabezado.parentElement?.textContent?.replace('Catálogo', '').trim() ?? ''

    expect(descripcion.length).toBeGreaterThan(30)
  })

  it('no usa lenguaje de obra en curso', () => {
    montar()

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })

  it('no usa el guion largo en ningún texto visible', () => {
    montar()

    expect(document.body.textContent ?? '').not.toContain(GUION_LARGO)
  })
})
