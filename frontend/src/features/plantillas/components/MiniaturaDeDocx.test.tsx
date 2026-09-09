import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MiniaturaDeDocx } from './MiniaturaDeDocx'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

afterEach(() => {
  renderAsyncMock.mockReset()
})

/*
  Desde B6 la miniatura recibe los bytes ya resueltos (los descarga la tarjeta
  con `useDocxDePlantilla`), así que estas pruebas no simulan red de ninguna
  clase: solo los tres estados visibles del componente.
*/
describe('MiniaturaDeDocx', () => {
  it('sin archivo todavía, muestra el ícono de respaldo', () => {
    const { container } = render(<MiniaturaDeDocx archivo={null} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(renderAsyncMock).not.toHaveBeenCalled()
  })

  it('al renderizar con éxito, oculta el ícono de respaldo', async () => {
    const archivo = new Blob(['x'])
    renderAsyncMock.mockResolvedValue(undefined)

    const { container } = render(<MiniaturaDeDocx archivo={archivo} />)

    await waitFor(() => expect(container.querySelector('svg')).not.toBeInTheDocument())
    expect(renderAsyncMock).toHaveBeenCalledWith(archivo, expect.anything(), undefined, { inWrapper: true })
  })

  it('si el documento no se puede renderizar, el ícono de respaldo se queda visible', async () => {
    renderAsyncMock.mockRejectedValue(new Error('documento ilegible'))

    const { container } = render(<MiniaturaDeDocx archivo={new Blob(['x'])} />)

    await waitFor(() => expect(renderAsyncMock).toHaveBeenCalled())
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
