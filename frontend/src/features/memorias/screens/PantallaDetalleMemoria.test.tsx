import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { CLAVE_MEMORIAS } from '../almacenamiento'
import { PantallaDetalleMemoria } from './PantallaDetalleMemoria'

vi.mock('@/shared/supabase/cliente')

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

function montar(idMemoria: string) {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[`/memorias/${idMemoria}`]}>
        <Routes>
          <Route path="/memorias" element={<p>Listado</p>} />
          <Route path="/memorias/:idMemoria" element={<PantallaDetalleMemoria />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('PantallaDetalleMemoria — id inexistente', () => {
  it('muestra el error MEM_NO_ENCONTRADA y un enlace de regreso', () => {
    montar('mem-que-no-existe')

    expect(screen.getByText(/no encontramos esa memoria/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a memorias/i })).toHaveAttribute('href', '/memorias')
  })
})

describe('PantallaDetalleMemoria — memoria válida (plantilla en blanco)', () => {
  it('regenera la vista previa con los datos reales de la conferencia', async () => {
    montar('mem-alc-01')

    expect(screen.getByText('Memoria de Modelos de lenguaje aplicados a la revisión sistemática de literatura')).toBeInTheDocument()
    /* «Modelos de lenguaje» es el tema real de cnf-alc-01 — el dato de ejemplo del fixture es «Sesgos algorítmicos…». */
    expect(await screen.findByText('Modelos de lenguaje')).toBeInTheDocument()
  })
})

describe('PantallaDetalleMemoria — plantilla de origen eliminada', () => {
  it('muestra un error en vez de un documento a medias', () => {
    sessionStorage.setItem(
      CLAVE_MEMORIAS,
      JSON.stringify([
        {
          id: 'mem-huerfana',
          idConferencia: 'cnf-alc-01',
          idPlantilla: 'pla-que-no-existe',
          nombre: 'Memoria huérfana',
          generadaEl: '2026-05-01T00:00:00.000Z',
        },
      ]),
    )

    montar('mem-huerfana')

    expect(screen.getByText(/no encontramos esa plantilla/i)).toBeInTheDocument()
  })
})
