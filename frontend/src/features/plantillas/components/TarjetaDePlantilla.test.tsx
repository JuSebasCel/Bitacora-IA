import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Plantilla } from '../data'
import { crearPlantillaDesdeDocx, crearPlantillaEnBlanco } from '../plantillas'
import { TarjetaDePlantilla } from './TarjetaDePlantilla'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function montar(plantilla: Plantilla, alEliminar: () => void) {
  return render(
    <MemoryRouter>
      <TarjetaDePlantilla plantilla={plantilla} alEliminar={alEliminar} />
    </MemoryRouter>,
  )
}

describe('TarjetaDePlantilla — origen blanco', () => {
  it('muestra el nombre y enlaza al editor de esa plantilla', () => {
    const plantilla = crearPlantillaEnBlanco()

    montar(plantilla, vi.fn())

    const enlace = screen.getByRole('link')
    expect(enlace).toHaveAttribute('href', `/plantillas/${plantilla.id}`)
    expect(screen.getByText(plantilla.nombre)).toBeInTheDocument()
  })

  it('el botón eliminar pide confirmación y solo llama a alEliminar si se confirma', async () => {
    const usuario = userEvent.setup()
    const plantilla = crearPlantillaEnBlanco()
    const alEliminar = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    montar(plantilla, alEliminar)
    await usuario.click(screen.getByRole('button', { name: `Eliminar «${plantilla.nombre}»` }))

    expect(alEliminar).not.toHaveBeenCalled()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await usuario.click(screen.getByRole('button', { name: `Eliminar «${plantilla.nombre}»` }))

    expect(alEliminar).toHaveBeenCalledOnce()
  })
})

describe('TarjetaDePlantilla — origen docx', () => {
  it('muestra el nombre, el conteo de marcadores, y enlaza al editor', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Plantilla importada', [
      {
        tipo: 'simple',
        id: 'mar-1',
        textoOriginal: '[[X]]',
        contexto: '[[X]]',
        origenDeDato: { tipo: 'personalizado', etiqueta: 'X' },
        formato: 'parrafo',
      },
    ])

    montar(plantilla, vi.fn())

    expect(screen.getByRole('link')).toHaveAttribute('href', `/plantillas/${plantilla.id}`)
    expect(screen.getByText('Plantilla importada')).toBeInTheDocument()
    expect(screen.getByText('1 marcador detectado')).toBeInTheDocument()
  })

  it('pluraliza el conteo de marcadores cuando hay más de uno', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const plantilla = crearPlantillaDesdeDocx('data:;base64,AA==', 'Plantilla importada', [
      {
        tipo: 'condicional',
        id: 'sec-1',
        descripcion: 'Cita opcional',
        origenDeDato: { tipo: 'personalizado', etiqueta: 'Cita opcional' },
      },
      {
        tipo: 'repetible',
        id: 'sec-2',
        descripcion: 'Lista de puntos',
        origenDeDato: { tipo: 'personalizado', etiqueta: 'Lista de puntos' },
      },
    ])

    montar(plantilla, vi.fn())

    expect(screen.getByText('2 marcadores detectados')).toBeInTheDocument()
  })
})
