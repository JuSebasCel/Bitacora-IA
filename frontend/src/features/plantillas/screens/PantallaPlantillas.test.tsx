import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PantallaPlantillas } from './PantallaPlantillas'

function EditorDeSustituto() {
  return <p>Contenido del editor</p>
}

function montar() {
  return render(
    <MemoryRouter initialEntries={['/plantillas']}>
      <Routes>
        <Route path="/plantillas" element={<PantallaPlantillas />} />
        <Route path="/plantillas/:idPlantilla" element={<EditorDeSustituto />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
})

describe('PantallaPlantillas', () => {
  it('se anuncia con un encabezado de nivel 1', () => {
    montar()

    expect(screen.getByRole('heading', { level: 1, name: 'Plantillas' })).toBeInTheDocument()
  })

  it('muestra una tarjeta por cada plantilla de la semilla', () => {
    montar()

    expect(screen.getByRole('link', { name: /memoria estándar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /cita simple/i })).toBeInTheDocument()
  })

  it('"Crear plantilla" navega directo al editor de la nueva plantilla', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: /crear plantilla/i }))

    expect(await screen.findByText('Contenido del editor')).toBeInTheDocument()
  })

  it('eliminar una plantilla la quita del listado', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: /eliminar «memoria estándar»/i }))

    expect(screen.queryByRole('link', { name: /memoria estándar/i })).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
