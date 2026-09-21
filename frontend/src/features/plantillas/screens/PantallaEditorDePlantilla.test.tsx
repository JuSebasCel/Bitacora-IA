import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plantilla } from '../data'
import { crearPlantillaDesdeDocx } from '../plantillas'
import { PantallaEditorDePlantilla } from './PantallaEditorDePlantilla'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

const repositorio = vi.hoisted(() => ({
  listarPlantillas: vi.fn(),
  crearPlantilla: vi.fn(),
  actualizarPlantilla: vi.fn(),
  eliminarPlantilla: vi.fn(),
  subirDocxDePlantilla: vi.fn(),
  descargarDocxDePlantilla: vi.fn(),
  eliminarDocxDePlantilla: vi.fn(),
}))

vi.mock('../repositorio', () => repositorio)

function conPlantillas(plantillas: readonly Plantilla[]): void {
  repositorio.listarPlantillas.mockResolvedValue({ ok: true, datos: plantillas })
}

beforeEach(() => {
  conPlantillas([])
  repositorio.actualizarPlantilla.mockImplementation((plantilla: Plantilla) =>
    Promise.resolve({ ok: true, datos: plantilla }),
  )
  repositorio.eliminarPlantilla.mockResolvedValue({ ok: true, datos: null })
  repositorio.descargarDocxDePlantilla.mockImplementation(() => new Promise(() => {}))
  repositorio.eliminarDocxDePlantilla.mockResolvedValue({ ok: true, datos: null })
})

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.resetAllMocks()
})

function ListadoEspia() {
  return <p>Listado</p>
}

function montar(idPlantilla: string) {
  return render(
    <MemoryRouter initialEntries={[`/plantillas/${idPlantilla}`]}>
      <Routes>
        <Route path="/plantillas" element={<ListadoEspia />} />
        <Route path="/plantillas/:idPlantilla" element={<PantallaEditorDePlantilla />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PantallaEditorDePlantilla — mientras carga', () => {
  /*
    "No encontramos esa plantilla" antes de haber terminado de buscarla es
    literalmente falso, y era lo que se veía en el primer instante de cada
    visita al editor desde que la lectura pasó a ser de red.
  */
  it('muestra el esqueleto y no el error de plantilla inexistente', () => {
    repositorio.listarPlantillas.mockReturnValue(new Promise(() => {}))

    montar('a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11')

    expect(screen.getByLabelText('Cargando la plantilla')).toBeInTheDocument()
    expect(screen.queryByText(/no encontramos esa plantilla/i)).not.toBeInTheDocument()
  })
})

describe('PantallaEditorDePlantilla — id inexistente', () => {
  it('muestra el error PLANT_NO_ENCONTRADA y un enlace de regreso', async () => {
    montar('a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11')

    expect(await screen.findByText(/no encontramos esa plantilla/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a plantillas/i })).toHaveAttribute('href', '/plantillas')
  })
})

describe('PantallaEditorDePlantilla — origen docx', () => {
  it('muestra la configuración de sus campos', async () => {
    const id = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
    conPlantillas([crearPlantillaDesdeDocx(id, `${id}/original.docx`, 'Importada', [])])

    montar(id)

    expect(await screen.findByText(/no encontramos ningún campo/i)).toBeInTheDocument()
  })
})

describe('PantallaEditorDePlantilla — edición', () => {
  it('renombrar la plantilla persiste el nombre nuevo', async () => {
    const usuario = userEvent.setup()
    const id = 'a2c0f7d1-9b3e-4a52-8f10-6d5c4b3a2e11'
    conPlantillas([crearPlantillaDesdeDocx(id, `${id}/original.docx`, 'Importada', [])])

    montar(id)
    await usuario.dblClick(await screen.findByRole('button', { name: /Nombre de la plantilla/ }))
    const campoNombre = screen.getByRole('textbox', { name: 'Nombre de la plantilla' })
    await usuario.clear(campoNombre)
    await usuario.type(campoNombre, 'Memoria de cierre')

    await waitFor(() => expect(repositorio.actualizarPlantilla).toHaveBeenCalled())
    const guardadas = repositorio.actualizarPlantilla.mock.calls.map((llamada) => (llamada[0] as Plantilla).nombre)
    expect(guardadas.at(-1)).toBe('Memoria de cierre')
  })
})
