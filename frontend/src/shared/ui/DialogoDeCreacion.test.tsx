import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DialogoDeCreacion } from './DialogoDeCreacion'

describe('DialogoDeCreacion', () => {
  it('cerrado no muestra el diálogo', () => {
    render(
      <DialogoDeCreacion
        abierto={false}
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={() => undefined}
        alCrear={() => ({ ok: true })}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abierto muestra el título y el campo', () => {
    render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={() => undefined}
        alCrear={() => ({ ok: true })}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Nuevo evento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })

  it('enviar con un nombre llama a alCrear con ese nombre', async () => {
    const usuario = userEvent.setup()
    const alCrear = vi.fn().mockReturnValue({ ok: true })

    render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={() => undefined}
        alCrear={alCrear}
      />,
    )

    await usuario.type(screen.getByLabelText('Nombre'), 'Coloquio de Prueba')
    await usuario.click(screen.getByRole('button', { name: 'Crear' }))

    expect(alCrear).toHaveBeenCalledWith('Coloquio de Prueba')
  })

  it('al crear con éxito, cierra el diálogo', async () => {
    const usuario = userEvent.setup()
    const alCerrar = vi.fn()

    render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={alCerrar}
        alCrear={() => ({ ok: true })}
      />,
    )

    await usuario.type(screen.getByLabelText('Nombre'), 'Coloquio de Prueba')
    await usuario.click(screen.getByRole('button', { name: 'Crear' }))

    expect(alCerrar).toHaveBeenCalled()
  })

  it('al fallar, muestra el mensaje y mantiene el diálogo abierto', async () => {
    const usuario = userEvent.setup()
    const alCerrar = vi.fn()

    render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={alCerrar}
        alCrear={() => ({ ok: false, mensaje: 'Ya existe un evento con ese nombre.' })}
      />,
    )

    await usuario.type(screen.getByLabelText('Nombre'), 'Repetido')
    await usuario.click(screen.getByRole('button', { name: 'Crear' }))

    expect(screen.getByText('Ya existe un evento con ese nombre.')).toBeInTheDocument()
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('"Cancelar" cierra sin llamar a alCrear', async () => {
    const usuario = userEvent.setup()
    const alCrear = vi.fn()
    const alCerrar = vi.fn()

    render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={alCerrar}
        alCrear={alCrear}
      />,
    )

    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(alCrear).not.toHaveBeenCalled()
    expect(alCerrar).toHaveBeenCalled()
  })

  it('usa el placeholder cuando se pasa uno', () => {
    render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo ponente"
        etiquetaCampo="Nombre"
        placeholder="Mariana Escobar Vallejo"
        alCerrar={() => undefined}
        alCrear={() => ({ ok: true })}
      />,
    )

    expect(screen.getByPlaceholderText('Mariana Escobar Vallejo')).toBeInTheDocument()
  })

  it('reabrir limpia el campo y el error de un intento anterior', async () => {
    const usuario = userEvent.setup()
    const { rerender } = render(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={() => undefined}
        alCrear={() => ({ ok: false, mensaje: 'Ya existe.' })}
      />,
    )

    await usuario.type(screen.getByLabelText('Nombre'), 'Repetido')
    await usuario.click(screen.getByRole('button', { name: 'Crear' }))
    expect(screen.getByText('Ya existe.')).toBeInTheDocument()

    rerender(
      <DialogoDeCreacion
        abierto={false}
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={() => undefined}
        alCrear={() => ({ ok: false, mensaje: 'Ya existe.' })}
      />,
    )

    rerender(
      <DialogoDeCreacion
        abierto
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        alCerrar={() => undefined}
        alCrear={() => ({ ok: false, mensaje: 'Ya existe.' })}
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre')).toHaveValue('')
    })
    expect(screen.queryByText('Ya existe.')).not.toBeInTheDocument()
  })
})
