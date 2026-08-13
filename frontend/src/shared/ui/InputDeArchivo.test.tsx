import { fireEvent, render, screen } from '@testing-library/react'
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
  it('sin archivo, invita a arrastrar o elegir uno', () => {
    render(<InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={() => undefined} />)

    expect(screen.getByText(/arrastra/i)).toBeInTheDocument()
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

  describe('arrastrar y soltar', () => {
    function zona(container: HTMLElement): HTMLElement {
      const control = container.querySelector<HTMLInputElement>('input[type="file"]')
      if (control === null) throw new Error('no se encontró el control de archivo')
      const contenedor = control.parentElement
      if (contenedor === null) throw new Error('el control de archivo no tiene contenedor')
      return contenedor
    }

    it('al arrastrar un archivo encima, muestra el estado de "soltar aquí"', () => {
      const { container } = render(
        <InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={() => undefined} />,
      )

      fireEvent.dragEnter(zona(container))

      expect(screen.getByText(/suelta/i)).toBeInTheDocument()
    })

    it('al salir del área de arrastre, vuelve al estado normal', () => {
      const { container } = render(
        <InputDeArchivo accept="audio/*" archivo={null} alSeleccionar={() => undefined} />,
      )

      fireEvent.dragEnter(zona(container))
      fireEvent.dragLeave(zona(container))

      expect(screen.queryByText(/suelta/i)).not.toBeInTheDocument()
      expect(screen.getByText(/arrastra/i)).toBeInTheDocument()
    })

    it('soltar un archivo con extensión admitida llama a alSeleccionar con ese archivo', () => {
      const alSeleccionar = vi.fn()
      const { container } = render(
        <InputDeArchivo accept=".mp3,.wav" archivo={null} alSeleccionar={alSeleccionar} />,
      )

      const archivo = archivoDe('charla.mp3', 2048)
      fireEvent.drop(zona(container), { dataTransfer: { files: [archivo] } })

      expect(alSeleccionar).toHaveBeenCalledWith(archivo)
    })

    it('soltar un archivo con extensión no admitida no llama a alSeleccionar', () => {
      const alSeleccionar = vi.fn()
      const { container } = render(
        <InputDeArchivo accept=".mp3,.wav" archivo={null} alSeleccionar={alSeleccionar} />,
      )

      const archivo = archivoDe('notas.pdf', 2048, 'application/pdf')
      fireEvent.drop(zona(container), { dataTransfer: { files: [archivo] } })

      expect(alSeleccionar).not.toHaveBeenCalled()
    })

    it('soltar varios archivos toma solo el primero', () => {
      const alSeleccionar = vi.fn()
      const { container } = render(
        <InputDeArchivo accept=".mp3,.wav" archivo={null} alSeleccionar={alSeleccionar} />,
      )

      const primero = archivoDe('charla.mp3', 2048)
      const segundo = archivoDe('otra.wav', 4096)
      fireEvent.drop(zona(container), { dataTransfer: { files: [primero, segundo] } })

      expect(alSeleccionar).toHaveBeenCalledTimes(1)
      expect(alSeleccionar).toHaveBeenCalledWith(primero)
    })

    it('soltar un archivo quita el estado de "soltar aquí"', () => {
      const { container } = render(
        <InputDeArchivo accept=".mp3,.wav" archivo={null} alSeleccionar={() => undefined} />,
      )

      fireEvent.dragEnter(zona(container))
      fireEvent.drop(zona(container), { dataTransfer: { files: [archivoDe('charla.mp3', 2048)] } })

      expect(screen.queryByText(/suelta/i)).not.toBeInTheDocument()
    })
  })
})
