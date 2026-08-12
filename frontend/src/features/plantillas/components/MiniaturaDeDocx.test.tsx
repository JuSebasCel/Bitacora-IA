import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MiniaturaDeDocx } from './MiniaturaDeDocx'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

afterEach(() => {
  renderAsyncMock.mockReset()
  vi.unstubAllGlobals()
})

describe('MiniaturaDeDocx', () => {
  it('muestra el ícono de respaldo mientras carga', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )

    const { container } = render(<MiniaturaDeDocx archivoOriginal="data:;base64,AA==" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('al renderizar con éxito, oculta el ícono de respaldo', async () => {
    const blob = new Blob(['x'])
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ blob: () => Promise.resolve(blob) }) as unknown as Promise<Response>),
    )
    renderAsyncMock.mockResolvedValue(undefined)

    const { container } = render(<MiniaturaDeDocx archivoOriginal="data:;base64,AA==" />)

    await waitFor(() => expect(container.querySelector('svg')).not.toBeInTheDocument())
    expect(renderAsyncMock).toHaveBeenCalledWith(blob, expect.anything(), undefined, { inWrapper: true })
  })

  it('si el archivo no se puede leer, el ícono de respaldo se queda visible', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('fallo de red')))
    vi.stubGlobal('fetch', fetchMock)

    const { container } = render(<MiniaturaDeDocx archivoOriginal="data:;base64,AA==" />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await Promise.resolve()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
