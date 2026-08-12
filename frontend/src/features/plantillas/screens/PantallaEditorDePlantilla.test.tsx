import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_PLANTILLAS } from '../almacenamiento'
import { crearPlantillaDesdeDocx, crearPlantillaEnBlanco } from '../plantillas'
import { PantallaEditorDePlantilla } from './PantallaEditorDePlantilla'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

beforeEach(() => {
  sessionStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  )
})

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.unstubAllGlobals()
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

describe('PantallaEditorDePlantilla — id inexistente', () => {
  it('muestra el error PLANT_NO_ENCONTRADA y un enlace de regreso', () => {
    montar('pla-no-existe')

    expect(screen.getByText(/no encontramos esa plantilla/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /volver a plantillas/i })).toHaveAttribute('href', '/plantillas')
  })
})

describe('PantallaEditorDePlantilla — origen docx', () => {
  it('muestra la pantalla de confirmación de solo lectura, sin editor TipTap', () => {
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Importada', [])
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([plantilla]))

    montar(plantilla.id)

    expect(screen.getByText(/no encontramos ninguna marca/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Negrita' })).not.toBeInTheDocument()
  })
})

describe('PantallaEditorDePlantilla — origen blanco', () => {
  it('renombrar la plantilla persiste el nombre nuevo', async () => {
    const usuario = userEvent.setup()
    const plantilla = crearPlantillaEnBlanco()
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([plantilla]))

    montar(plantilla.id)
    const campoNombre = screen.getByLabelText('Nombre')
    await usuario.clear(campoNombre)
    await usuario.type(campoNombre, 'Memoria de cierre')

    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).toContain('Memoria de cierre')
  })

  it('volver sin tocar nada elimina la plantilla en blanco recién creada', async () => {
    const usuario = userEvent.setup()
    const plantilla = crearPlantillaEnBlanco()
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([plantilla]))

    montar(plantilla.id)
    await usuario.click(screen.getByRole('button', { name: /volver a plantillas/i }))

    expect(await screen.findByText('Listado')).toBeInTheDocument()
    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).not.toContain(plantilla.id)
  })

  it('volver tras renombrar conserva la plantilla', async () => {
    const usuario = userEvent.setup()
    const plantilla = crearPlantillaEnBlanco()
    sessionStorage.setItem(CLAVE_PLANTILLAS, JSON.stringify([plantilla]))

    montar(plantilla.id)
    await usuario.type(screen.getByLabelText('Nombre'), ' agregado')
    await usuario.click(screen.getByRole('button', { name: /volver a plantillas/i }))

    await waitFor(() => expect(screen.getByText('Listado')).toBeInTheDocument())
    expect(sessionStorage.getItem(CLAVE_PLANTILLAS)).toContain(plantilla.id)
  })
})
