import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BarraDeBusquedaDelCatalogo } from './BarraDeBusquedaDelCatalogo'

// Envoltorio con estado propio: `valor` es controlado desde afuera (viene de
// la URL en el uso real), así que para probar que se acumula al escribir hay
// que simular ese mismo ciclo de re-render, no fijar `valor` en un string.
function EnvoltorioControlado({ alCambiar }: { alCambiar: (busqueda: string) => void }) {
  const [valor, setValor] = useState('')
  return (
    <BarraDeBusquedaDelCatalogo
      valor={valor}
      alCambiar={(busqueda) => {
        setValor(busqueda)
        alCambiar(busqueda)
      }}
    />
  )
}

describe('BarraDeBusquedaDelCatalogo', () => {
  it('escribir dispara alCambiar con el texto acumulado', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()

    render(<EnvoltorioControlado alCambiar={alCambiar} />)
    await usuario.type(screen.getByLabelText(/buscar/i), 'IA')

    expect(alCambiar).toHaveBeenLastCalledWith('IA')
  })

  it('con texto, muestra un botón para borrar la búsqueda', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()

    render(<BarraDeBusquedaDelCatalogo valor="algoritmos" alCambiar={alCambiar} />)
    await usuario.click(screen.getByRole('button', { name: /borrar la búsqueda/i }))

    expect(alCambiar).toHaveBeenCalledWith('')
  })

  it('sin texto, no muestra el botón de borrar', () => {
    render(<BarraDeBusquedaDelCatalogo valor="" alCambiar={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /borrar la búsqueda/i })).not.toBeInTheDocument()
  })
})
