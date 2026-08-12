import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TarjetaDePlantilla } from './TarjetaDePlantilla'
import type { Plantilla } from '../data'

const PLANTILLA: Plantilla = {
  id: 'pla-prueba',
  nombre: 'Memoria de prueba',
  colorPrincipal: '#112233',
  colorSecundario: '#445566',
  elementos: [],
  actualizadaEl: '2026-06-01T00:00:00.000Z',
}

function montar(alEliminar = vi.fn()) {
  return render(
    <MemoryRouter>
      <TarjetaDePlantilla plantilla={PLANTILLA} alEliminar={alEliminar} />
    </MemoryRouter>,
  )
}

describe('TarjetaDePlantilla', () => {
  it('enlaza al editor de esa plantilla', () => {
    montar()

    expect(screen.getByRole('link', { name: /memoria de prueba/i })).toHaveAttribute(
      'href',
      '/plantillas/pla-prueba',
    )
  })

  it('muestra el nombre de la plantilla', () => {
    montar()

    expect(screen.getByText('Memoria de prueba')).toBeInTheDocument()
  })

  it('ofrece un botón para eliminar', () => {
    montar()

    expect(screen.getByRole('button', { name: /eliminar/i })).toBeInTheDocument()
  })

  describe('eliminar', () => {
    beforeEach(() => {
      vi.spyOn(window, 'confirm')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('con la confirmación aceptada, llama a alEliminar', async () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      const usuario = userEvent.setup()
      const alEliminar = vi.fn()
      montar(alEliminar)

      await usuario.click(screen.getByRole('button', { name: /eliminar/i }))

      expect(window.confirm).toHaveBeenCalled()
      expect(alEliminar).toHaveBeenCalled()
    })

    it('con la confirmación rechazada, no llama a alEliminar', async () => {
      vi.mocked(window.confirm).mockReturnValue(false)
      const usuario = userEvent.setup()
      const alEliminar = vi.fn()
      montar(alEliminar)

      await usuario.click(screen.getByRole('button', { name: /eliminar/i }))

      expect(alEliminar).not.toHaveBeenCalled()
    })
  })
})
