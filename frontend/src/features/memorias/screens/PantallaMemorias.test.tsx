import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { CLAVE_MEMORIAS } from '../almacenamiento'
import { PantallaMemorias } from './PantallaMemorias'

const ALCANTARA = {
  id: 'usr-alcantara',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(ALCANTARA))
})

afterEach(() => {
  vi.restoreAllMocks()
})

function montar(rutaInicial = '/memorias') {
  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Routes>
          <Route path="/memorias" element={<PantallaMemorias />} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

describe('PantallaMemorias', () => {
  it('lista la semilla, con el nombre de la conferencia y la plantilla de origen', () => {
    montar()
    const listado = within(screen.getByRole('list', { name: 'Memorias' }))

    expect(
      listado.getByText('Memoria de Modelos de lenguaje aplicados a la revisión sistemática de literatura'),
    ).toBeInTheDocument()
    expect(listado.getByText('Modelos de lenguaje aplicados a la revisión sistemática de literatura')).toBeInTheDocument()
    expect(listado.getByText('Memoria estándar')).toBeInTheDocument()
  })

  it('«Generar memoria» abre el panel', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Generar memoria' }))

    expect(screen.getByRole('dialog', { name: 'Generar memoria' })).toBeInTheDocument()
  })

  it('con ?conferencia= en la URL, el panel se abre solo y preselecciona esa conferencia', () => {
    montar('/memorias?conferencia=cnf-alc-01')

    const dialogo = screen.getByRole('dialog', { name: 'Generar memoria' })
    expect(dialogo).toBeInTheDocument()
    expect(screen.getByLabelText('Conferencia')).toHaveValue('cnf-alc-01')
  })

  it('eliminar quita la memoria de la lista y de sessionStorage', async () => {
    const usuario = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    montar()

    await usuario.click(
      screen.getByRole('button', {
        name: /eliminar «memoria de modelos de lenguaje aplicados a la revisión sistemática de literatura»/i,
      }),
    )

    await waitFor(() =>
      expect(
        screen.queryByText('Memoria de Modelos de lenguaje aplicados a la revisión sistemática de literatura'),
      ).not.toBeInTheDocument(),
    )
    expect(sessionStorage.getItem(CLAVE_MEMORIAS)).not.toContain('mem-alc-01')
  })

  it('sin ninguna memoria, muestra el estado vacío', async () => {
    const usuario = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    montar()

    await usuario.click(
      screen.getByRole('button', {
        name: /eliminar «memoria de modelos de lenguaje aplicados a la revisión sistemática de literatura»/i,
      }),
    )

    expect(await screen.findByText(/todavía no hay memorias generadas/i)).toBeInTheDocument()
  })
})
