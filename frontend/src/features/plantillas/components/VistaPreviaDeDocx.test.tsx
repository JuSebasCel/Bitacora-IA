import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VistaPreviaDeDocx } from './VistaPreviaDeDocx'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

afterEach(() => {
  renderAsyncMock.mockReset()
})

describe('VistaPreviaDeDocx', () => {
  it('sin blob, no renderiza nada', () => {
    const { container } = render(<VistaPreviaDeDocx blob={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('con un blob, monta el contenedor y le pide a docx-preview que lo renderice', async () => {
    renderAsyncMock.mockResolvedValue(undefined)
    const blob = new Blob(['contenido'], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    render(<VistaPreviaDeDocx blob={blob} />)

    await waitFor(() => expect(renderAsyncMock).toHaveBeenCalledTimes(1))
    expect(renderAsyncMock.mock.calls[0]?.[0]).toBe(blob)
  })

  it('si docx-preview falla, se degrada a un aviso en vez de dejarlo en blanco', async () => {
    renderAsyncMock.mockRejectedValue(new Error('no se pudo'))
    const blob = new Blob(['contenido'])

    render(<VistaPreviaDeDocx blob={blob} />)

    expect(await screen.findByText(/no pudimos mostrar la vista previa/i)).toBeInTheDocument()
  })
})
