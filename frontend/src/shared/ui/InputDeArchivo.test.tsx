import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'
import { InputDeArchivo } from './InputDeArchivo'

function archivoDe(nombre: string, bytes: number, tipo = 'audio/mpeg'): File {
  const archivo = new File([new Uint8Array(1)], nombre, { type: tipo })
  Object.defineProperty(archivo, 'size', { value: bytes })
  return archivo
}

describe('InputDeArchivo', () => {
  it('sin archivo, invita a elegir uno', () => {
    render(<InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={() => undefined} />)

    expect(screen.getByText(/elegir archivo/i)).toBeInTheDocument()
  })

  it('seleccionar un archivo llama a alSeleccionar con ese archivo', async () => {
    const usuario = userEvent.setup()
    const alSeleccionar = vi.fn()
    const { container } = render(
      <InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={alSeleccionar} />,
    )

    const archivo = archivoDe('charla.mp3', 2048)
    const control = container.querySelector<HTMLInputElement>('input[type="file"]')
    if (control === null) throw new Error('no se encontró el control de archivo')
    await usuario.upload(control, archivo)

    expect(alSeleccionar).toHaveBeenCalledWith(archivo)
  })

  it('con un archivo puesto, muestra su nombre', () => {
    render(
      <InputDeArchivo
        accept="audio/*"
        archivo={archivoDe('charla.mp3', 2048)}
        alSeleccionar={() => undefined}
      />,
    )

    expect(screen.getByText(/charla\.mp3/)).toBeInTheDocument()
  })

  it('con un archivo puesto, muestra su tamaño formateado', () => {
    render(
      <InputDeArchivo
        accept="audio/*"
        archivo={archivoDe('charla.mp3', 2048)}
        alSeleccionar={() => undefined}
      />,
    )

    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument()
  })

  it('sin archivo, no ofrece el control de quitar', () => {
    render(<InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={() => undefined} />)

    expect(screen.queryByRole('button', { name: /quitar/i })).not.toBeInTheDocument()
  })

  it('con un archivo puesto, "Quitar" llama a alSeleccionar con null', async () => {
    const usuario = userEvent.setup()
    const alSeleccionar = vi.fn()
    render(
      <InputDeArchivo
        accept="audio/*"
        archivo={archivoDe('charla.mp3', 2048)}
        alSeleccionar={alSeleccionar}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: /quitar/i }))

    expect(alSeleccionar).toHaveBeenCalledWith(null)
  })

  it('el control real acepta solo la extensión pedida', () => {
    const { container } = render(
      <InputDeArchivo accept=".mp3,.wav" archivo={null} alSeleccionar={() => undefined} />,
    )

    expect(container.querySelector('input[type="file"]')).toHaveAttribute('accept', '.mp3,.wav')
  })

  it('funciona dentro de Field: la etiqueta activa el control real', () => {
    render(
      <Field id="carga-archivo" etiqueta="Archivo">
        <InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={() => undefined} />
      </Field>,
    )

    expect(screen.getByLabelText('Archivo')).toBeInTheDocument()
  })
})
