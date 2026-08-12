import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FiltroDeEtiquetas } from './FiltroDeEtiquetas'

const ETIQUETAS = [
  { id: 'etq-1', nombre: 'IA', idPropietario: 'usr-1' },
  { id: 'etq-2', nombre: 'art1', idPropietario: 'usr-1' },
]

describe('FiltroDeEtiquetas', () => {
  it('sin ninguna seleccionada, no ofrece quitar todas', () => {
    render(
      <FiltroDeEtiquetas
        etiquetas={ETIQUETAS}
        seleccionadas={[]}
        alAlternar={() => undefined}
        alAbrirCreador={() => undefined}
        alQuitarTodas={() => undefined}
      />,
    )

    expect(screen.queryByRole('button', { name: /quitar todas/i })).not.toBeInTheDocument()
  })

  it('con al menos una seleccionada, ofrece quitar todas', () => {
    render(
      <FiltroDeEtiquetas
        etiquetas={ETIQUETAS}
        seleccionadas={['etq-1']}
        alAlternar={() => undefined}
        alAbrirCreador={() => undefined}
        alQuitarTodas={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: /quitar todas/i })).toBeInTheDocument()
  })

  it('"Quitar todas" llama a alQuitarTodas', async () => {
    const usuario = userEvent.setup()
    const alQuitarTodas = vi.fn()
    render(
      <FiltroDeEtiquetas
        etiquetas={ETIQUETAS}
        seleccionadas={['etq-1', 'etq-2']}
        alAlternar={() => undefined}
        alAbrirCreador={() => undefined}
        alQuitarTodas={alQuitarTodas}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /quitar todas/i }))

    expect(alQuitarTodas).toHaveBeenCalled()
  })
})
