import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BarraDeHerramientas } from './BarraDeHerramientas'

function inputDeArchivo(): HTMLInputElement {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

describe('BarraDeHerramientas', () => {
  it('"+ Texto" llama a onAgregarTexto', async () => {
    const usuario = userEvent.setup()
    const onAgregarTexto = vi.fn()
    render(
      <BarraDeHerramientas
        onAgregarTexto={onAgregarTexto}
        onAgregarMarcador={vi.fn()}
        onAgregarImagen={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /texto/i }))

    expect(onAgregarTexto).toHaveBeenCalled()
  })

  it('"+ Marcador" llama a onAgregarMarcador', async () => {
    const usuario = userEvent.setup()
    const onAgregarMarcador = vi.fn()
    render(
      <BarraDeHerramientas
        onAgregarTexto={vi.fn()}
        onAgregarMarcador={onAgregarMarcador}
        onAgregarImagen={vi.fn()}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /marcador/i }))

    expect(onAgregarMarcador).toHaveBeenCalled()
  })

  it('"+ Imagen" con un archivo válido llama a onAgregarImagen con una data URL', async () => {
    const onAgregarImagen = vi.fn()
    render(
      <BarraDeHerramientas onAgregarTexto={vi.fn()} onAgregarMarcador={vi.fn()} onAgregarImagen={onAgregarImagen} />,
    )

    const archivo = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' })
    fireEvent.change(inputDeArchivo(), { target: { files: [archivo] } })

    await vi.waitFor(() => expect(onAgregarImagen).toHaveBeenCalled())
    const [url, nombre] = onAgregarImagen.mock.calls[0] as [string, string]
    expect(url).toMatch(/^data:image\/png;base64,/)
    expect(nombre).toBe('logo.png')
  })

  it('"+ Imagen" con un tipo no soportado muestra el error y no llama a onAgregarImagen', async () => {
    const onAgregarImagen = vi.fn()
    render(
      <BarraDeHerramientas onAgregarTexto={vi.fn()} onAgregarMarcador={vi.fn()} onAgregarImagen={onAgregarImagen} />,
    )

    const archivo = new File([new Uint8Array(10)], 'logo.svg', { type: 'image/svg+xml' })
    fireEvent.change(inputDeArchivo(), { target: { files: [archivo] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/formato admitido/i)
    expect(onAgregarImagen).not.toHaveBeenCalled()
  })

  it('"+ Imagen" con un archivo muy grande muestra el error y no llama a onAgregarImagen', async () => {
    const onAgregarImagen = vi.fn()
    render(
      <BarraDeHerramientas onAgregarTexto={vi.fn()} onAgregarMarcador={vi.fn()} onAgregarImagen={onAgregarImagen} />,
    )

    const archivoGrande = new File([new Uint8Array(3 * 1024 * 1024)], 'logo.png', { type: 'image/png' })
    fireEvent.change(inputDeArchivo(), { target: { files: [archivoGrande] } })

    expect(await screen.findByRole('alert')).toHaveTextContent(/tamaño máximo/i)
    expect(onAgregarImagen).not.toHaveBeenCalled()
  })
})
