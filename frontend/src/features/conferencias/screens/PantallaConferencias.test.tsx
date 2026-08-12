import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { mensajeDeError } from '@/shared/errors'
import { PantallaConferencias } from './PantallaConferencias'

/*
  El dashboard de F2. Se monta con la sesión sembrada directamente en
  sessionStorage, igual que hace la prueba del shell en F1: el recorrido de
  acceso ya está cubierto por su propio módulo y repetirlo aquí solo alarga
  cada caso.

  Camila Zuluaga es la cuenta de referencia porque es la única que ve las dos
  procedencias a la vez: tres conferencias propias y cuatro compartidas.
*/

const ZULUAGA = {
  id: 'usr-zuluaga',
  nombre: 'Camila Zuluaga Nieto',
  correo: 'camila.zuluaga@labanfora.org',
}

const BERRIO = {
  id: 'usr-berrio',
  nombre: 'Joaquín Berrío Salazar',
  correo: 'joaquin.berrio@labanfora.org',
}

/* Expone la ubicación del router para poder comprobar que los filtros viajan a la URL. */
function Ubicacion() {
  const ubicacion = useLocation()

  return <span data-testid="ubicacion">{`${ubicacion.pathname}${ubicacion.search}`}</span>
}

function montar(rutaInicial = '/conferencias', cuenta = ZULUAGA) {
  sessionStorage.setItem(CLAVE_SESION, JSON.stringify(cuenta))

  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Ubicacion />
        <Routes>
          <Route path="/conferencias" element={<PantallaConferencias />} />
          <Route path="/conferencias/:idConferencia" element={<p>Detalle de la conferencia</p>} />
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

function ubicacion(): string {
  return screen.getByTestId('ubicacion').textContent ?? ''
}

async function listado(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: /conferencias/i })
}

async function filas(): Promise<HTMLElement[]> {
  return within(await listado()).getAllByRole('listitem')
}

async function campoDeBusqueda(): Promise<HTMLElement> {
  return screen.findByLabelText(/buscar/i)
}

describe('PantallaConferencias', () => {
  it('se anuncia con su encabezado de sección', async () => {
    montar()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Conferencias' }),
    ).toBeInTheDocument()
  })

  /*
    El estado de carga no se prueba desde aquí: React vacía el efecto dentro del
    render, así que la pantalla nunca llega a observarse cargando. Los cuatro
    estados del listado se prueban sobre el componente, en
    `components/ListadoDeConferencias.test.tsx`, que es para lo que los recibe
    como prop.
  */
  it('lista una fila por conferencia visible y ninguna ajena', async () => {
    montar()

    expect(await filas()).toHaveLength(7)
    expect(screen.queryByText(/Evaluación de modelos de predicción/)).not.toBeInTheDocument()
  })

  it('muestra la coordenada de cada charla en monoespaciada', async () => {
    montar()

    const coordenada = await screen.findByText('CCDN-2026-01')

    expect(coordenada).toHaveClass('coordenada')
    /* Dos charlas del mismo día, así que la fecha aparece más de una vez. */
    expect(screen.getAllByText('14 may 2026').length).toBeGreaterThan(0)
  })

  it('enlaza cada fila con el detalle de esa conferencia', async () => {
    montar()

    const enlace = await screen.findByRole('link', {
      name: /Calidad de datos en registros administrativos/,
    })

    expect(enlace).toHaveAttribute('href', expect.stringContaining('/conferencias/cnf-zul-01'))
  })

  it('dice quién compartió cada conferencia ajena', async () => {
    montar()

    expect(await screen.findAllByText(/Valentina Alcántara Rueda/)).not.toHaveLength(0)
  })

  it('muestra el número de fichas y el estado de procesamiento', async () => {
    montar()

    expect(await screen.findByText('12 fichas')).toBeInTheDocument()
    expect(screen.getAllByText('Procesada').length).toBeGreaterThan(0)
  })

  it('anuncia cuántas conferencias quedan a la vista', async () => {
    montar()

    expect(await screen.findByText(/7 conferencias/i)).toBeInTheDocument()
  })
})

describe('PantallaConferencias, controles', () => {
  it('acota el listado a las propias y lo deja escrito en la URL', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('radio', { name: 'Mías' }))

    await waitFor(() => expect(ubicacion()).toContain('segmento=propias'))
    expect(await filas()).toHaveLength(3)
  })

  it('acota el listado a las compartidas conmigo', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('radio', { name: 'Compartidas conmigo' }))

    await waitFor(async () => expect(await filas()).toHaveLength(4))
  })

  it('lee los criterios que ya venían en la URL al abrir la pantalla', async () => {
    montar('/conferencias?segmento=propias')

    expect(await filas()).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Mías' })).toBeChecked()
  })

  it('filtra por texto y lo deja escrito en la URL', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.type(await campoDeBusqueda(), 'sesgos')

    await waitFor(async () => expect(await filas()).toHaveLength(1))
    expect(ubicacion()).toContain('buscar=sesgos')
  })

  it('filtra por estado de procesamiento', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await usuario.click(await screen.findByRole('radio', { name: 'Procesada' }))

    await waitFor(async () => expect(await filas()).toHaveLength(6))
  })

  it('ordena el listado por título', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('button', { name: /ordenar por/i }))
    await usuario.click(await screen.findByRole('radio', { name: 'Título, de la A a la Z' }))

    await waitFor(() => expect(ubicacion()).toContain('orden=titulo-asc'))

    const primera = (await filas())[0]
    expect(primera).toHaveTextContent('Calidad de datos en registros administrativos')
  })

  it('filtra por una etiqueta personal', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await usuario.click(await screen.findByRole('checkbox', { name: 'revisión 2026' }))

    await waitFor(async () => expect(await filas()).toHaveLength(1))
    expect(ubicacion()).toContain('etiquetas=')
  })

  /*
    El contador sobre el botón "Filtros" es lo único que dice cuántos filtros
    están activos sin tener que abrir el panel: si no se actualizara, alguien
    podría dejar un filtro puesto sin saberlo.
  */
  it('muestra en el botón de filtros cuántos están activos', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    expect(screen.queryByText('1', { selector: 'span' })).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await usuario.click(await screen.findByRole('radio', { name: 'Procesada' }))

    expect(screen.getByRole('button', { name: 'Filtros' })).toHaveTextContent('1')
  })
})

describe('PantallaConferencias, estados vacíos', () => {
  /*
    Berrío no ha recibido nada compartido. Es el único caso del fixture que
    permite probar este vacío con datos reales.
  */
  it('explica el vacío cuando no hay nada compartido con esa persona', async () => {
    montar('/conferencias?segmento=compartidas', BERRIO)

    expect(await screen.findByText(/nadie ha compartido/i)).toBeInTheDocument()
  })

  /*
    Los dos vacíos no son el mismo: uno se resuelve cargando una conferencia y
    el otro quitando un filtro. Decir lo mismo en los dos manda a la persona al
    lugar equivocado.
  */
  it('distingue el vacío por filtros del vacío por falta de datos', async () => {
    montar('/conferencias?buscar=termodinamica')

    expect(await screen.findByText(/ningún resultado/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quitar filtros/i })).toBeInTheDocument()
  })

  it('restablece el listado completo al quitar los filtros', async () => {
    const usuario = userEvent.setup()
    montar('/conferencias?buscar=termodinamica')

    await usuario.click(await screen.findByRole('button', { name: /quitar filtros/i }))

    await waitFor(async () => expect(await filas()).toHaveLength(7))
    expect(ubicacion()).toBe('/conferencias')
  })
})

describe('PantallaConferencias, etiquetas', () => {
  /*
    Crear una etiqueta abre el panel de filtros, dispara el diálogo modal
    desde el chip "Nueva etiqueta", y ese diálogo se cierra solo al crear con
    éxito. Para comprobar que la etiqueta quedó disponible hay que volver a
    abrir el panel: crearla no lo deja abierto a propósito, un diálogo por
    encima de un popover abierto sería dos capas flotantes a la vez.
  */
  it('deja disponible una etiqueta recién creada', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await usuario.click(await screen.findByRole('button', { name: /nueva etiqueta/i }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'art2')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    expect(await screen.findByRole('checkbox', { name: 'art2' })).toBeInTheDocument()
  })

  it('traduce el choque de nombres sin mostrar el código crudo, sin cerrar el diálogo', async () => {
    const usuario = userEvent.setup()
    montar()
    await listado()

    await usuario.click(screen.getByRole('button', { name: 'Filtros' }))
    await usuario.click(await screen.findByRole('button', { name: /nueva etiqueta/i }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.type(within(dialogo).getByLabelText('Nombre'), 'tesis')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Crear' }))

    const alerta = await screen.findByRole('alert')

    expect(alerta).toHaveTextContent(mensajeDeError('ETQ_YA_EXISTE'))
    expect(alerta.textContent).not.toContain('ETQ_')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('muestra sobre cada fila las etiquetas que esa persona le puso', async () => {
    montar()

    const listadoDeFilas = await filas()
    const conTesis = listadoDeFilas.filter((fila) => fila.textContent?.includes('tesis'))

    expect(conTesis.length).toBeGreaterThan(0)
  })
})

describe('PantallaConferencias, ocultar', () => {
  /*
    Ocultar es una preferencia de vista, no una regla de acceso: no hace falta
    volver a montar la pantalla para comprobar que persiste, con que la fila
    desaparezca del listado actual ya queda probado que la acción funcionó.
  */
  it('ocultar una conferencia la saca del listado', async () => {
    const usuario = userEvent.setup()
    montar()

    const filasIniciales = await filas()
    expect(filasIniciales).toHaveLength(7)

    const [botonDeQuitar] = screen.getAllByRole('button', { name: /quitar «.*» de tu listado/i })
    if (botonDeQuitar === undefined) throw new Error('se esperaba al menos un botón de quitar')
    await usuario.click(botonDeQuitar)

    await waitFor(async () => expect(await filas()).toHaveLength(6))
  })

  it('funciona igual sobre una conferencia compartida', async () => {
    const usuario = userEvent.setup()
    montar('/conferencias?segmento=compartidas')

    const filasIniciales = await filas()
    expect(filasIniciales).toHaveLength(4)

    const [botonDeQuitar] = screen.getAllByRole('button', { name: /quitar «.*» de tu listado/i })
    if (botonDeQuitar === undefined) throw new Error('se esperaba al menos un botón de quitar')
    await usuario.click(botonDeQuitar)

    await waitFor(async () => expect(await filas()).toHaveLength(3))
  })
})
