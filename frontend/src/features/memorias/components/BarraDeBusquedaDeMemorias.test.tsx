import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BarraDeBusquedaDeMemorias } from './BarraDeBusquedaDeMemorias'

/*
  Mismo esqueleto de prueba que `catalogo/components/BarraDeBusquedaDelCatalogo.test.tsx`:
  `valor` es controlado desde afuera (viene de la URL en el uso real), así
  que para probar que se acumula al escribir hay que simular ese mismo ciclo
  de re-render.
*/
function EnvoltorioControlado({ alCambiar }: { alCambiar: (busqueda: string) => void }) {
  const [valor, setValor] = useState('')
  return (
    <BarraDeBusquedaDeMemorias
      valor={valor}
      alCambiar={(busqueda) => {
        setValor(busqueda)
        alCambiar(busqueda)
      }}
    />
  )
}

describe('BarraDeBusquedaDeMemorias', () => {
  it('escribir dispara alCambiar con el texto acumulado', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()

    render(<EnvoltorioControlado alCambiar={alCambiar} />)
    await usuario.type(screen.getByLabelText(/buscar por memoria, conferencia o plantilla/i), 'IA')

    expect(alCambiar).toHaveBeenLastCalledWith('IA')
  })

  it('con texto, muestra un botón para borrar la búsqueda', async () => {
    const usuario = userEvent.setup()
    const alCambiar = vi.fn()

    render(<BarraDeBusquedaDeMemorias valor="algoritmos" alCambiar={alCambiar} />)
    await usuario.click(screen.getByRole('button', { name: /borrar la búsqueda/i }))

    expect(alCambiar).toHaveBeenCalledWith('')
  })

  it('sin texto, no muestra el botón de borrar', () => {
    render(<BarraDeBusquedaDeMemorias valor="" alCambiar={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /borrar la búsqueda/i })).not.toBeInTheDocument()
  })
})
