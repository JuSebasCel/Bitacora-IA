import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Popover } from './Popover'

/*
  El cierre pasa por la animación de salida de `AnimatePresence`, así que el
  panel sigue en el DOM un instante después de que la acción que lo cierra ya
  ocurrió. `waitFor` es obligatorio en las aserciones de cierre; sin él, la
  prueba lee el DOM antes de que Motion termine de desmontar el panel.
*/

/*
  El Popover es el patrón unificado para "un solo botón que abre un panel":
  lo usan tanto el selector de orden como el panel de filtros. Se prueba aquí
  una sola vez, y los consumidores confían en este contrato.
*/

function montar(props: Partial<Parameters<typeof Popover>[0]> = {}) {
  return render(
    <Popover boton="Abrir panel" etiquetaAccesible="Abrir panel" {...props}>
      {(cerrar) => (
        <div>
          <p>Contenido del panel</p>
          <button type="button" onClick={cerrar}>
            Elegir y cerrar
          </button>
        </div>
      )}
    </Popover>,
  )
}

describe('Popover', () => {
  it('empieza cerrado', () => {
    montar()

    expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir panel' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('abre el panel al pulsar el disparador', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Abrir panel' }))

    expect(await screen.findByText('Contenido del panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir panel' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('cierra al pulsar fuera del panel', async () => {
    const usuario = userEvent.setup()
    render(
      <div>
        <p>Fuera del panel</p>
        <Popover boton="Abrir panel" etiquetaAccesible="Abrir panel">
          {() => <p>Contenido del panel</p>}
        </Popover>
      </div>,
    )

    await usuario.click(screen.getByRole('button', { name: 'Abrir panel' }))
    expect(await screen.findByText('Contenido del panel')).toBeInTheDocument()

    await usuario.click(screen.getByText('Fuera del panel'))

    await waitFor(() => {
      expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument()
    })
  })

  it('cierra con Escape y devuelve el foco al disparador', async () => {
    const usuario = userEvent.setup()
    montar()

    const disparador = screen.getByRole('button', { name: 'Abrir panel' })
    await usuario.click(disparador)
    await screen.findByText('Contenido del panel')

    await usuario.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument()
    })
    expect(disparador).toHaveFocus()
  })

  /*
    Cuando el propio contenido decide cerrar (por ejemplo, al elegir una
    opción), también tiene sentido devolver el foco al disparador: quien
    navega con teclado no debería perderlo en el vacío.
  */
  it('devuelve el foco al disparador cuando el contenido cierra el panel', async () => {
    const usuario = userEvent.setup()
    montar()

    const disparador = screen.getByRole('button', { name: 'Abrir panel' })
    await usuario.click(disparador)

    await usuario.click(await screen.findByRole('button', { name: 'Elegir y cerrar' }))

    await waitFor(() => {
      expect(screen.queryByText('Contenido del panel')).not.toBeInTheDocument()
    })
    expect(disparador).toHaveFocus()
  })

  it('no rompe si se hace clic dentro del panel', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: 'Abrir panel' }))
    await usuario.click(await screen.findByText('Contenido del panel'))

    expect(screen.getByText('Contenido del panel')).toBeInTheDocument()
  })

  it('acepta un botón con contenido enriquecido y una etiqueta accesible aparte', async () => {
    const usuario = userEvent.setup()
    render(
      <Popover
        boton={
          <>
            <span aria-hidden="true">≡</span> Fecha, más reciente
          </>
        }
        etiquetaAccesible="Ordenar por"
      >
        {() => <p>Contenido del panel</p>}
      </Popover>,
    )

    const disparador = screen.getByRole('button', { name: 'Ordenar por' })
    expect(disparador).toHaveTextContent('Fecha, más reciente')

    await usuario.click(disparador)
    expect(await screen.findByText('Contenido del panel')).toBeInTheDocument()
  })

  it('llama a alAbrir y alCerrar cuando corresponde', async () => {
    const usuario = userEvent.setup()
    const alAbrir = vi.fn()
    const alCerrar = vi.fn()

    montar({ alAbrir, alCerrar })

    await usuario.click(screen.getByRole('button', { name: 'Abrir panel' }))
    expect(alAbrir).toHaveBeenCalledOnce()

    await usuario.keyboard('{Escape}')
    expect(alCerrar).toHaveBeenCalledOnce()
  })
})
