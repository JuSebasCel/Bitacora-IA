import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RETRASO_SIMULADO_MS } from '../carga'
import { PantallaCargarConferencia } from './PantallaCargarConferencia'

function montar() {
  return render(
    <MemoryRouter initialEntries={['/conferencias/nueva']}>
      <Routes>
        <Route path="/conferencias/nueva" element={<PantallaCargarConferencia />} />
        <Route path="/conferencias" element={<p>Listado de conferencias</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

function archivoDe(nombre: string, tipo: string): File {
  return new File([new Uint8Array(1)], nombre, { type: tipo })
}

async function completarCampos(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Título'), 'Series de tiempo urbanas')
  await usuario.type(screen.getByLabelText('Ponente'), 'Tomás Iriarte Villalba')
  await usuario.type(screen.getByLabelText('Evento'), 'Coloquio de Ciencia de Datos del Norte')
  await usuario.type(screen.getByLabelText('Fecha del evento'), '2026-05-14')
}

describe('PantallaCargarConferencia, formulario', () => {
  it('se anuncia con un encabezado de nivel 1', () => {
    montar()

    expect(screen.getByRole('heading', { level: 1, name: 'Cargar conferencia' })).toBeInTheDocument()
  })

  it('muestra los campos del formulario', () => {
    montar()

    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.getByLabelText('Ponente')).toBeInTheDocument()
    expect(screen.getByLabelText('Evento')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha del evento')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /fuente/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Audio' })).toBeChecked()
  })

  it('enviar el formulario vacío muestra el error de campos requeridos, sin código crudo', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/título.*ponente.*evento.*fecha/i)
    expect(alerta.textContent).not.toContain('CARGA_')
  })

  it('con los campos completos pero sin archivo, muestra el error de archivo requerido', async () => {
    const usuario = userEvent.setup()
    montar()
    await completarCampos(usuario)

    await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/elige el archivo/i)
  })

  /*
    `userEvent.upload` filtra por `accept`, igual que el selector de archivos
    de un navegador real: no deja "elegir" una extensión que el propio input
    no admite. Para probar el caso que sí puede pasar en un navegador de
    verdad (el selector nativo suele ofrecer igual una opción de "Todos los
    archivos"), se dispara el evento nativo directamente con `fireEvent`, sin
    pasar por ese filtrado.
  */
  it('una extensión que no corresponde a la fuente elegida muestra el error traducido', async () => {
    const usuario = userEvent.setup()
    montar()
    await completarCampos(usuario)

    const control = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (control === null) throw new Error('no se encontró el control de archivo')
    fireEvent.change(control, { target: { files: [archivoDe('notas.txt', 'text/plain')] } })

    await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/formato admitido/i)
  })
})

/*
  Sin temporizadores falsos aquí: combinarlos con `userEvent` y `findBy`/
  `waitFor` (que sondean con su propio `setTimeout`) dejaba estas pruebas
  colgadas. El retraso simulado es corto (900 ms) y solo lo pagan estas
  cuatro pruebas, así que esperarlo de verdad es más simple y más confiable
  que coordinar temporizadores falsos con el `act` de React.
*/
describe('PantallaCargarConferencia, envío y confirmación', () => {
  it('muestra el botón en estado de envío mientras "procesa"', async () => {
    const usuario = userEvent.setup()
    montar()
    await completarCampos(usuario)

    const control = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (control === null) throw new Error('no se encontró el control de archivo')
    await usuario.upload(control, archivoDe('charla.mp3', 'audio/mpeg'))

    const boton = screen.getByRole('button', { name: /cargar conferencia/i })
    await usuario.click(boton)

    expect(boton).toHaveAttribute('aria-busy', 'true')
  })

  it(
    'tras el retraso simulado, muestra la confirmación con el título cargado',
    async () => {
      const usuario = userEvent.setup()
      montar()
      await completarCampos(usuario)

      const control = document.querySelector<HTMLInputElement>('input[type="file"]')
      if (control === null) throw new Error('no se encontró el control de archivo')
      await usuario.upload(control, archivoDe('charla.mp3', 'audio/mpeg'))
      await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

      await waitFor(
        () => {
          expect(screen.getByText(/series de tiempo urbanas/i)).toBeInTheDocument()
        },
        { timeout: RETRASO_SIMULADO_MS + 2000 },
      )
      expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    },
    RETRASO_SIMULADO_MS + 5000,
  )

  it(
    '"Cargar otra conferencia" vuelve al formulario con los campos vacíos',
    async () => {
      const usuario = userEvent.setup()
      montar()
      await completarCampos(usuario)

      const control = document.querySelector<HTMLInputElement>('input[type="file"]')
      if (control === null) throw new Error('no se encontró el control de archivo')
      await usuario.upload(control, archivoDe('charla.mp3', 'audio/mpeg'))
      await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

      await usuario.click(
        await screen.findByRole(
          'button',
          { name: /cargar otra conferencia/i },
          { timeout: RETRASO_SIMULADO_MS + 2000 },
        ),
      )

      expect(screen.getByLabelText('Título')).toHaveValue('')
    },
    RETRASO_SIMULADO_MS + 5000,
  )

  it(
    'la confirmación ofrece un enlace de vuelta al listado',
    async () => {
      const usuario = userEvent.setup()
      montar()
      await completarCampos(usuario)

      const control = document.querySelector<HTMLInputElement>('input[type="file"]')
      if (control === null) throw new Error('no se encontró el control de archivo')
      await usuario.upload(control, archivoDe('charla.mp3', 'audio/mpeg'))
      await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

      const enlace = await screen.findByRole(
        'link',
        { name: /ver mis conferencias/i },
        { timeout: RETRASO_SIMULADO_MS + 2000 },
      )
      await usuario.click(enlace)

      expect(await within(document.body).findByText('Listado de conferencias')).toBeInTheDocument()
    },
    RETRASO_SIMULADO_MS + 5000,
  )
})
