import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { RutaPublica } from './RutaPublica'

vi.mock('@/shared/supabase/cliente')

function montar(rutaInicial: string) {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Routes>
          <Route element={<RutaPublica />}>
            <Route path="/acceso" element={<p>Formulario de acceso</p>} />
            <Route path="/registro" element={<p>Formulario de registro</p>} />
          </Route>
          <Route path="/conferencias" element={<p>Listado de conferencias</p>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

afterEach(() => {
  reiniciarMocksDeSesion()
})

describe('RutaPublica', () => {
  it('renderiza el formulario de acceso cuando no hay sesión abierta', () => {
    montar('/acceso')

    expect(screen.getByText('Formulario de acceso')).toBeInTheDocument()
    expect(screen.queryByText('Listado de conferencias')).not.toBeInTheDocument()
  })

  it('renderiza el formulario de registro cuando no hay sesión abierta', () => {
    montar('/registro')

    expect(screen.getByText('Formulario de registro')).toBeInTheDocument()
    expect(screen.queryByText('Listado de conferencias')).not.toBeInTheDocument()
  })

  it('aparta de /acceso a quien ya tiene la sesión abierta', () => {
    mockearSesionAutenticada({
      id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
      nombre: 'Valentina Alcántara Rueda',
      correo: 'valentina.alcantara@labanfora.org',
    })

    montar('/acceso')

    expect(screen.getByText('Listado de conferencias')).toBeInTheDocument()
    expect(screen.queryByText('Formulario de acceso')).not.toBeInTheDocument()
  })

  it('aparta de /registro a quien ya tiene la sesión abierta', () => {
    mockearSesionAutenticada({
      id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
      nombre: 'Valentina Alcántara Rueda',
      correo: 'valentina.alcantara@labanfora.org',
    })

    montar('/registro')

    expect(screen.getByText('Listado de conferencias')).toBeInTheDocument()
    expect(screen.queryByText('Formulario de registro')).not.toBeInTheDocument()
  })
})
