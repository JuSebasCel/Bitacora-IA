import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeMemoria } from '../generarMemoria'
import { VistaPreviaDeMemoria } from './VistaPreviaDeMemoria'

const renderAsyncMock = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({
  renderAsync: renderAsyncMock,
}))

afterEach(() => {
  renderAsyncMock.mockReset()
})

describe('VistaPreviaDeMemoria — origen docx', () => {
  it('muestra la vista previa del .docx generado y un enlace de descarga con el nombre de la memoria', async () => {
    renderAsyncMock.mockResolvedValue(undefined)
    const resultado: ResultadoDeMemoria = { origen: 'docx', blob: new Blob(['contenido']) }

    render(<VistaPreviaDeMemoria resultado={resultado} nombre="Memoria de prueba" />)

    await waitFor(() => expect(renderAsyncMock).toHaveBeenCalled())
    const enlace = screen.getByRole('link', { name: /descargar/i })
    expect(enlace).toHaveAttribute('download', 'Memoria de prueba.docx')
  })
})
