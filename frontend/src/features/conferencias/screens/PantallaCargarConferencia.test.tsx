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

function archivoDe(nombre: string, tipo = 'audio/mpeg'): File {
  return new File([new Uint8Array(1)], nombre, { type: tipo })
}

function selectDeEvento(): HTMLSelectElement {
  return screen.getByLabelText('Evento') as HTMLSelectElement
}

function selectDePonente(): HTMLSelectElement {
  return screen.getByLabelText('Ponente') as HTMLSelectElement
}

async function completarCamposBasicos(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Título'), 'Series de tiempo urbanas')
  await usuario.selectOptions(selectDeEvento(), 'evt-ccdn')
  await usuario.selectOptions(selectDePonente(), 'pon-evt-ccdn-tomas-iriarte-villalba')
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
    expect(selectDeEvento()).toBeInTheDocument()
    expect(selectDePonente()).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha del evento')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /fuente/i })).toBeInTheDocument()
  })

  it('el selector de evento ya trae la semilla del directorio', () => {
    montar()

    expect(
      within(selectDeEvento()).getByRole('option', {
        name: 'Coloquio de Ciencia de Datos del Norte',
      }),
    ).toBeInTheDocument()
  })

  it('el selector de ponente empieza deshabilitado sin evento elegido', () => {
    montar()

    expect(selectDePonente()).toBeDisabled()
  })

  it('elegir un evento habilita el selector de ponente con los suyos', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.selectOptions(selectDeEvento(), 'evt-ccdn')

    expect(selectDePonente()).toBeEnabled()
    expect(
      within(selectDePonente()).getByRole('option', { name: 'Tomás Iriarte Villalba' }),
    ).toBeInTheDocument()
    expect(
      within(selectDePonente()).queryByRole('option', { name: 'Andrés Felipe Restrepo Ocampo' }),
    ).not.toBeInTheDocument()
  })

  it('cambiar de evento limpia el ponente ya elegido', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.selectOptions(selectDeEvento(), 'evt-ccdn')
    await usuario.selectOptions(selectDePonente(), 'pon-evt-ccdn-tomas-iriarte-villalba')
    await usuario.selectOptions(selectDeEvento(), 'evt-saia')

    expect(selectDePonente()).toHaveValue('')
  })

  it('elegir "Crear evento nuevo" abre el diálogo de creación', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.selectOptions(selectDeEvento(), '__crear_evento__')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText(/nuevo evento/i)).toBeInTheDocument()
  })

  it('crear un evento nuevo lo deja elegido automáticamente', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.selectOptions(selectDeEvento(), '__crear_evento__')
    const dialogoDeEvento = within(screen.getByRole('dialog'))
    await usuario.type(dialogoDeEvento.getByLabelText('Nombre'), 'Coloquio de Prueba')
    await usuario.click(dialogoDeEvento.getByRole('button', { name: 'Crear' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(selectDeEvento().value).toContain('coloquio-de-prueba')
    expect(selectDePonente()).toBeEnabled()
  })

  it('crear un ponente nuevo lo deja elegido, asociado al evento activo', async () => {
    const usuario = userEvent.setup()
    montar()
    await usuario.selectOptions(selectDeEvento(), 'evt-ccdn')

    await usuario.selectOptions(selectDePonente(), '__crear_ponente__')
    const dialogoDePonente = within(screen.getByRole('dialog'))
    await usuario.type(dialogoDePonente.getByLabelText('Nombre'), 'Persona Nueva')
    await usuario.click(dialogoDePonente.getByRole('button', { name: 'Crear' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(within(selectDePonente()).getByRole('option', { name: 'Persona Nueva' })).toBeInTheDocument()
  })

  it('enviar el formulario vacío muestra un error por cada campo sin completar', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

    const alertas = await screen.findAllByRole('alert')
    expect(alertas.length).toBeGreaterThan(0)
    for (const alerta of alertas) {
      expect(alerta.textContent).not.toContain('CARGA_')
    }
    expect(selectDeEvento()).toHaveAttribute('aria-invalid', 'true')
  })

  it('la vista previa refleja el evento y el ponente elegidos', async () => {
    const usuario = userEvent.setup()
    montar()

    await usuario.selectOptions(selectDeEvento(), 'evt-ccdn')
    await usuario.selectOptions(selectDePonente(), 'pon-evt-ccdn-tomas-iriarte-villalba')

    const vistaPrevia = screen.getByRole('complementary', { name: /vista previa/i })
    expect(within(vistaPrevia).getByText('Coloquio de Ciencia de Datos del Norte')).toBeInTheDocument()
    expect(within(vistaPrevia).getByText('Tomás Iriarte Villalba')).toBeInTheDocument()
  })
})

describe('PantallaCargarConferencia, envío y confirmación', () => {
  it(
    'tras el retraso simulado, la confirmación muestra el evento y el ponente por nombre, no por id',
    async () => {
      const usuario = userEvent.setup()
      montar()
      await completarCamposBasicos(usuario)

      const control = document.querySelector<HTMLInputElement>('input[type="file"]')
      if (control === null) throw new Error('no se encontró el control de archivo')
      await usuario.upload(control, archivoDe('charla.mp3'))
      await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

      /*
        "Series de tiempo urbanas" también aparece en la vista previa mientras
        el formulario sigue visible, así que no sirve para esperar la
        confirmación: se espera el botón "Cargar otra conferencia", que solo
        existe una vez confirmada.
      */
      await screen.findByRole(
        'button',
        { name: /cargar otra conferencia/i },
        { timeout: RETRASO_SIMULADO_MS + 2000 },
      )

      expect(screen.getByText(/Series de tiempo urbanas/)).toBeInTheDocument()
      expect(screen.getByText('Coloquio de Ciencia de Datos del Norte')).toBeInTheDocument()
      expect(screen.getByText('Tomás Iriarte Villalba')).toBeInTheDocument()
      expect(document.body.textContent).not.toContain('evt-ccdn')
      expect(document.body.textContent).not.toContain('pon-evt-ccdn')
    },
    RETRASO_SIMULADO_MS + 5000,
  )

  it(
    '"Cargar otra conferencia" vuelve al formulario con el ponente deshabilitado de nuevo',
    async () => {
      const usuario = userEvent.setup()
      montar()
      await completarCamposBasicos(usuario)

      const control = document.querySelector<HTMLInputElement>('input[type="file"]')
      if (control === null) throw new Error('no se encontró el control de archivo')
      await usuario.upload(control, archivoDe('charla.mp3'))
      await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

      await usuario.click(
        await screen.findByRole(
          'button',
          { name: /cargar otra conferencia/i },
          { timeout: RETRASO_SIMULADO_MS + 2000 },
        ),
      )

      expect(screen.getByLabelText('Título')).toHaveValue('')
      expect(selectDePonente()).toBeDisabled()
    },
    RETRASO_SIMULADO_MS + 5000,
  )
})

describe('PantallaCargarConferencia, archivo', () => {
  it('una extensión que no corresponde a la fuente elegida muestra el error traducido', async () => {
    const usuario = userEvent.setup()
    montar()
    await completarCamposBasicos(usuario)

    const control = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (control === null) throw new Error('no se encontró el control de archivo')
    fireEvent.change(control, {
      target: { files: [archivoDe('notas.txt', 'text/plain')] },
    })

    await usuario.click(screen.getByRole('button', { name: /cargar conferencia/i }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/formato admitido/i)
  })
})
