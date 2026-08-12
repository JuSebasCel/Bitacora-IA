import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { PantallaEditorDePlantilla } from './PantallaEditorDePlantilla'

function montar(idPlantilla: string) {
  return render(
    <MemoryRouter initialEntries={[`/plantillas/${idPlantilla}`]}>
      <Routes>
        <Route path="/plantillas" element={<p>Contenido del listado</p>} />
        <Route path="/plantillas/:idPlantilla" element={<PantallaEditorDePlantilla />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('PantallaEditorDePlantilla', () => {
  it('un id inexistente muestra el error de plantilla no encontrada', () => {
    montar('pla-que-no-existe')

    expect(screen.getByRole('alert')).toHaveTextContent(/no encontramos esa plantilla/i)
  })

  it('ofrece un enlace de regreso al listado', async () => {
    const usuario = userEvent.setup()
    montar('pla-memoria-estandar')

    await usuario.click(screen.getByRole('link', { name: /volver/i }))

    expect(await screen.findByText('Contenido del listado')).toBeInTheDocument()
  })

  it('renombrar la plantilla persiste tras remontar', async () => {
    const usuario = userEvent.setup()
    const { unmount } = montar('pla-memoria-estandar')

    const campoNombre = screen.getByLabelText(/nombre/i)
    await usuario.clear(campoNombre)
    await usuario.type(campoNombre, 'Memoria renombrada')

    unmount()
    montar('pla-memoria-estandar')

    expect(screen.getByLabelText(/nombre/i)).toHaveValue('Memoria renombrada')
  })

  it('cambiar el color principal se refleja de inmediato', () => {
    montar('pla-memoria-estandar')

    const colorPrincipal = screen.getByLabelText(/color principal/i)
    fireEvent.change(colorPrincipal, { target: { value: '#00ff00' } })

    expect(colorPrincipal).toHaveValue('#00ff00')
  })

  it('agregar un elemento de texto desde la barra de herramientas lo muestra en el lienzo', async () => {
    const usuario = userEvent.setup()
    montar('pla-cita-simple')

    await usuario.click(screen.getByRole('button', { name: /texto/i }))

    expect(within(screen.getByTestId('lienzo-de-plantilla')).getByText('Texto')).toBeInTheDocument()
  })

  it('seleccionar un elemento del lienzo muestra sus propiedades en el inspector', () => {
    montar('pla-memoria-estandar')

    fireEvent.pointerDown(screen.getByTestId('elemento-el-titulo-principal'))

    expect(screen.getByLabelText(/tamaño/i)).toHaveValue('titulo')
  })
})
