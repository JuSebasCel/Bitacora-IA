import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import type { Location } from 'react-router'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { RutaProtegida } from './RutaProtegida'

vi.mock('@/shared/supabase/cliente')

type EstadoDeRedireccion = { desde?: Location } | null

const SIN_DESTINO = 'sin destino'

/*
  Doble de la pantalla de acceso: además de identificarse por texto, expone el
  destino que la guardia dejó en el estado de la navegación, que es lo que la
  pantalla real usará para devolver a la persona a donde iba.
*/
function AccesoEspia(): ReactElement {
  const ubicacion = useLocation()
  const estado = ubicacion.state as EstadoDeRedireccion
  const desde = estado?.desde ?? null

  return (
    <div>
      <p>Pantalla de acceso</p>
      <p data-testid="destino-pedido">{desde === null ? SIN_DESTINO : desde.pathname}</p>
      <p data-testid="busqueda-pedida">{desde?.search ?? SIN_DESTINO}</p>
    </div>
  )
}

function montar(rutaInicial: string) {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Routes>
          <Route path="/acceso" element={<AccesoEspia />} />
          <Route element={<RutaProtegida />}>
            <Route path="/conferencias" element={<p>Listado de conferencias</p>} />
            <Route path="/conferencias/nueva" element={<p>Carga de conferencia</p>} />
            <Route path="/plantillas" element={<p>Editor de plantillas</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

afterEach(() => {
  reiniciarMocksDeSesion()
})

describe('RutaProtegida', () => {
  it('redirige a /acceso cuando no hay sesión abierta', () => {
    montar('/conferencias')

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument()
    expect(screen.queryByText('Listado de conferencias')).not.toBeInTheDocument()
  })

  it('redirige a /acceso desde cualquier ruta anidada cuando no hay sesión', () => {
    montar('/conferencias/nueva')

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument()
    expect(screen.queryByText('Carga de conferencia')).not.toBeInTheDocument()
  })

  it('adjunta la ubicación pedida en el estado de la navegación a /acceso', () => {
    montar('/plantillas')

    expect(screen.getByTestId('destino-pedido')).toHaveTextContent('/plantillas')
  })

  it('conserva la ubicación completa, no solo la ruta, al redirigir', () => {
    montar('/conferencias/nueva?fuente=marcador')

    expect(screen.getByTestId('destino-pedido')).toHaveTextContent('/conferencias/nueva')
    expect(screen.getByTestId('busqueda-pedida')).toHaveTextContent('?fuente=marcador')
  })

  it('renderiza el contenido hijo cuando hay sesión abierta', () => {
    mockearSesionAutenticada({
      id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
      nombre: 'Valentina Alcántara Rueda',
      correo: 'valentina.alcantara@labanfora.org',
    })

    montar('/conferencias')

    expect(screen.getByText('Listado de conferencias')).toBeInTheDocument()
    expect(screen.queryByText('Pantalla de acceso')).not.toBeInTheDocument()
  })
})
