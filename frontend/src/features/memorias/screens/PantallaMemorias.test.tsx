import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import { CLAVE_MEMORIAS, guardarMemoria } from '../almacenamiento'
import { PantallaMemorias } from './PantallaMemorias'

vi.mock('@/shared/supabase/cliente')

const MEMORIA_DE_SESGOS = {
  id: 'mem-alc-02',
  idConferencia: 'cnf-alc-03',
  idPlantilla: 'pla-cita-simple',
  nombre: 'Memoria de sesgos algorítmicos',
  generadaEl: '2026-05-20T10:00:00.000Z',
}

const ALCANTARA = {
  id: '1ba5af9a-f6a2-4504-ab60-1f018c21290a',
  nombre: 'Valentina Alcántara Rueda',
  correo: 'valentina.alcantara@labanfora.org',
}

beforeEach(() => {
  mockearSesionAutenticada(ALCANTARA)
})

afterEach(() => {
  vi.restoreAllMocks()
  reiniciarMocksDeSesion()
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

  /*
    La búsqueda del listado (a diferencia de conferencias/F2 y catálogo/F6,
    F5 no tenía ningún control) empareja por el nombre de la memoria, el de
    su conferencia de origen o el de su plantilla, que es lo que la tarjeta
    ya muestra.
  */
  it('buscar filtra el listado por nombre de memoria, conferencia o plantilla', async () => {
    guardarMemoria(MEMORIA_DE_SESGOS)
    const usuario = userEvent.setup()
    montar()

    const listado = within(await screen.findByRole('list', { name: 'Memorias' }))
    expect(listado.getByText('Memoria de sesgos algorítmicos')).toBeInTheDocument()

    await usuario.type(screen.getByLabelText(/buscar por memoria, conferencia o plantilla/i), 'sesgos')

    expect(listado.getByText('Memoria de sesgos algorítmicos')).toBeInTheDocument()
    expect(
      listado.queryByText('Memoria de Modelos de lenguaje aplicados a la revisión sistemática de literatura'),
    ).not.toBeInTheDocument()
  })

  /*
    Los dos vacíos no son el mismo: uno se resuelve generando una memoria y
    el otro quitando un filtro. Decir lo mismo en los dos manda a la persona
    al lugar equivocado (mismo criterio que F2/F6).
  */
  it('distingue el vacío por filtros del vacío por falta de datos, y el botón para quitarlos restablece el listado', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.type(screen.getByLabelText(/buscar por memoria, conferencia o plantilla/i), 'palabra-inexistente')

    expect(await screen.findByText(/ningún resultado con estos filtros/i)).toBeInTheDocument()
    expect(screen.queryByText(/todavía no hay memorias generadas/i)).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: /quitar filtros/i }))

    expect(
      await screen.findByText('Memoria de Modelos de lenguaje aplicados a la revisión sistemática de literatura'),
    ).toBeInTheDocument()
  })

  /*
    `?conferencia=<id>` es el punto de entrada desde el detalle de una
    conferencia (preselecciona y abre el panel): escribir en la búsqueda no
    puede perder ese parámetro, o la preselección se rompería al primer
    caracter escrito.
  */
  it('escribir en la búsqueda conserva ?conferencia= si ya estaba en la URL', async () => {
    const usuario = userEvent.setup()
    montar('/memorias?conferencia=cnf-alc-01')

    await usuario.type(screen.getByLabelText(/buscar por memoria, conferencia o plantilla/i), 'modelos')

    expect(screen.getByLabelText('Conferencia')).toHaveValue('cnf-alc-01')
  })
})
