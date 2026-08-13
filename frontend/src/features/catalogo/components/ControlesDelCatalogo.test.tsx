import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CRITERIOS_POR_DEFECTO } from '../filtros'
import { ControlesDelCatalogo } from './ControlesDelCatalogo'

describe('ControlesDelCatalogo', () => {
  it('escribir en la búsqueda llama a alCambiar con el parche de búsqueda', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()

    render(
      <ControlesDelCatalogo
        criterios={CRITERIOS_POR_DEFECTO}
        temasDisponibles={[]}
        eventosDisponibles={[]}
        alCambiar={alCambiar}
      />,
    )

    await usuario.type(screen.getByLabelText(/buscar/i), 'x')

    expect(alCambiar).toHaveBeenCalledWith({ busqueda: 'x' })
  })

  it('ofrece el botón de filtros', () => {
    render(
      <ControlesDelCatalogo
        criterios={CRITERIOS_POR_DEFECTO}
        temasDisponibles={[]}
        eventosDisponibles={[]}
        alCambiar={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /filtros/i })).toBeInTheDocument()
  })
})
