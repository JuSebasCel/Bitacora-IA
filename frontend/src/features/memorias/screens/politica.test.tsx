import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { PantallaDetalleMemoria } from './PantallaDetalleMemoria'
import { PantallaMemorias } from './PantallaMemorias'

vi.mock('@/shared/supabase/cliente')

/*
  Reglas de redacción de las pantallas de F5. Mismo criterio que
  `features/plantillas/screens/politica.test.tsx`.
*/

const LENGUAJE_DE_OBRA_EN_CURSO =
  /próximamente|proximamente|en construcción|en construccion|wip|beta|disponible pronto|v0\.\d/i

/* Guion largo, escrito como escape para no usarlo literalmente en el código. */
const GUION_LARGO = '—'

const ALCANTARA = {
  id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

beforeEach(() => {
  mockearSesionAutenticada(ALCANTARA)
})

afterEach(() => {
  reiniciarMocksDeSesion()
})

function montarListado() {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/memorias']}>
        <Routes>
          <Route path="/memorias" element={<PantallaMemorias />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

function montarDetalle() {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={['/memorias/mem-alc-01']}>
        <Routes>
          <Route path="/memorias/:idMemoria" element={<PantallaDetalleMemoria />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('Redacción de la pantalla de memorias', () => {
  it('se anuncia con un encabezado de nivel 1', () => {
    montarListado()

    expect(screen.getByRole('heading', { level: 1, name: 'Memorias' })).toBeInTheDocument()
  })

  it('describe con una línea qué trabajo se hace en la sección', () => {
    montarListado()

    const encabezado = screen.getByRole('heading', { level: 1, name: 'Memorias' })
    const descripcion = encabezado.parentElement?.textContent?.replace('Memorias', '').trim() ?? ''

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

describe('Redacción de la pantalla de detalle de una memoria', () => {
  it('no usa lenguaje de obra en curso', () => {
    montarDetalle()

    expect(document.body.textContent ?? '').not.toMatch(LENGUAJE_DE_OBRA_EN_CURSO)
  })
})
