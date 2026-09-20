import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { ProveedorDeApiKey } from '@/features/configuracion/ProveedorDeApiKey'
import { mensajeDeError } from '@/shared/errors'
import { mockearSesionAutenticada, reiniciarMocksDeSesion } from '@/test/sesionDePrueba'
import {
  sembrarConferencias,
  sembrarEtiquetasDe,
  sembrarSinConferencias,
} from '@/test/conferenciasDePrueba'
import { mockearFilaDe } from '@/test/supabaseDePrueba'
import { PantallaConferencias } from './PantallaConferencias'

vi.mock('@/shared/supabase/cliente')
vi.mock('@/features/conferencias/repositorio')

/*
  El archivo de conferencias, después del rediseño.

  La pantalla dejó de ser un listado de filas y pasó a ser el explorador de
  columnas (`PantallaArchivo`). Lo que se prueba aquí es lo que esta pantalla
  aporta por encima de ese recorrido: los criterios que viven en la URL, los
  filtros que los cambian y las etiquetas personales.

  Los recorridos del explorador en sí —bajar de evento a conferencia, abrir
  una ficha, la vista completa— son suyos y no de esta pantalla.

  Camila Zuluaga es la cuenta de referencia porque es la única que ve las dos
  procedencias a la vez: tres conferencias propias y cuatro compartidas.
*/

const ZULUAGA = {
  id: 'ad474b7c-4a6e-4092-8c7e-ccf8701d9178',
  nombre: 'Camila Zuluaga Nieto',
  correo: 'camila.zuluaga@labanfora.org',
}

/* Expone la ubicación del router para comprobar que los criterios viajan a la URL. */
function Ubicacion() {
  const ubicacion = useLocation()

  return <span data-testid="ubicacion">{`${ubicacion.pathname}${ubicacion.search}`}</span>
}

function montar(rutaInicial = '/conferencias', cuenta = ZULUAGA) {
  mockearSesionAutenticada(cuenta)
  sembrarEtiquetasDe(cuenta.id)

  return render(
    <SessionProvider>
      <ProveedorDeApiKey>
        <MemoryRouter initialEntries={[rutaInicial]}>
          <Ubicacion />
          <Routes>
            <Route path="/conferencias" element={<PantallaConferencias />} />
          </Routes>
        </MemoryRouter>
      </ProveedorDeApiKey>
    </SessionProvider>,
  )
}

function ubicacion(): string {
  return screen.getByTestId('ubicacion').textContent ?? ''
}

/* La columna de conferencias es la segunda; la primera es la de eventos. */
function columnaDeConferencias(): HTMLElement {
  const columnas = document.querySelectorAll('section.columna-colapsable')
  return columnas[1] as HTMLElement
}

async function esperarAlArchivo(): Promise<void> {
  await screen.findByRole('button', { name: /Todos los eventos|Todavía no hay conferencias/ })
}

/** Títulos de las conferencias que el explorador está mostrando. */
async function conferenciasListadas(): Promise<string[]> {
  await esperarAlArchivo()

  return within(columnaDeConferencias())
    .getAllByRole('button')
    .map((boton) => boton.textContent ?? '')
    .filter((texto) => !/^(Conferencias|Temas)$/.test(texto.trim()))
    .filter((texto) => !texto.includes('Todas las conferencias'))
}

async function abrirFiltros(): Promise<HTMLElement> {
  await esperarAlArchivo()
  await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))

  return screen.findByRole('dialog', { name: 'Filtros' })
}

beforeEach(() => {
  sembrarConferencias()
})

afterEach(() => {
  reiniciarMocksDeSesion()
})

describe('PantallaConferencias', () => {
  it('se anuncia con su encabezado de sección', async () => {
    montar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Conferencias' })).toBeInTheDocument()
  })

  it('lista las conferencias que la sesión puede ver, y ninguna ajena', async () => {
    montar()

    const listadas = (await conferenciasListadas()).join(' | ')

    expect(listadas).toContain('Modelos de lenguaje aplicados a la revisión sistemática de literatura')
    /* De Joaquín Berrío, que no comparte con Camila. */
    expect(listadas).not.toContain('Series de tiempo aplicadas a la demanda')
  })
})

describe('PantallaConferencias, filtros', () => {
  it('acota por procedencia y lo deja escrito en la URL', async () => {
    montar()

    const filtros = await abrirFiltros()
    await userEvent.click(within(filtros).getByRole('button', { name: 'Propias' }))

    await waitFor(() => {
      expect(ubicacion()).toBe('/conferencias?segmento=propias')
    })
  })

  it('acota por estado de procesamiento', async () => {
    montar()

    const filtros = await abrirFiltros()
    await userEvent.click(within(filtros).getByRole('radio', { name: 'En cola' }))

    await waitFor(() => {
      expect(ubicacion()).toBe('/conferencias?estado=en-cola')
    })
  })

  it('acota por una etiqueta personal y lo deja escrito en la URL', async () => {
    montar()

    const filtros = await abrirFiltros()
    await userEvent.click(within(filtros).getByRole('checkbox', { name: 'tesis' }))

    await waitFor(() => {
      expect(ubicacion()).toContain('etiquetas=etq-zul-tesis')
    })

    /* "tesis" está sobre cnf-alc-03 y cnf-zul-01; nada más debe quedar. */
    const listadas = await conferenciasListadas()
    expect(listadas).toHaveLength(2)
  })

  it('lee los criterios que ya venían en la URL al abrir la pantalla', async () => {
    montar('/conferencias?segmento=compartidas')

    const filtros = await abrirFiltros()

    expect(within(filtros).getByRole('button', { name: 'Compartidas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('descarta de la URL una etiqueta que no es de esta persona', async () => {
    montar('/conferencias?etiquetas=etq-alc-art1')

    const filtros = await abrirFiltros()

    /* Es de Valentina: no aparece marcada ninguna, y el listado no se vacía por ella. */
    for (const casilla of within(filtros).getAllByRole('checkbox')) {
      expect(casilla).not.toBeChecked()
    }
  })

  it('dice en el botón cuántos filtros están puestos', async () => {
    montar('/conferencias?segmento=propias&estado=procesada')

    await esperarAlArchivo()

    expect(screen.getByRole('button', { name: /Filtros/ }).textContent).toContain('2')
  })

  it('devuelve el listado completo al quitar los filtros', async () => {
    montar('/conferencias?segmento=propias')

    const filtros = await abrirFiltros()
    await userEvent.click(within(filtros).getByRole('button', { name: 'Quitar los filtros' }))

    await waitFor(() => {
      expect(ubicacion()).toBe('/conferencias')
    })
  })

  it('distingue el vacío por filtros del vacío por falta de datos', async () => {
    montar('/conferencias?estado=fallida&segmento=compartidas&etiquetas=etq-zul-revision')

    expect(await screen.findByText(/Ninguna conferencia pasa los filtros/)).toBeInTheDocument()
  })

  /*
    Con el archivo vacío las columnas se quedan mudas y solo habla el panel de
    la derecha: repetir "no hay nada" en cada una daba a entender que se podía
    navegar por algo que no existe.
  */
  it('explica el vacío cuando no hay ninguna conferencia, y solo una vez', async () => {
    sembrarSinConferencias()
    montar()

    expect(await screen.findByText('Crea una conferencia para ver lo que dice')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Todos los eventos/ })).not.toBeInTheDocument()
  })
})

describe('PantallaConferencias, etiquetas', () => {
  it('muestra sobre cada conferencia las etiquetas que esa persona le puso', async () => {
    montar()

    await esperarAlArchivo()

    const fila = within(columnaDeConferencias()).getByRole('button', {
      name: /Modelos de lenguaje aplicados a la revisión sistemática/,
    })

    /* Camila le puso "IA" a cnf-alc-01, que no es suya. */
    expect(fila.textContent).toContain('IA')
  })

  it('pone una etiqueta sobre la conferencia elegida', async () => {
    montar()

    await esperarAlArchivo()

    await userEvent.click(
      within(columnaDeConferencias()).getByRole('button', {
        name: /Modelos de lenguaje aplicados a la revisión sistemática/,
      }),
    )

    /*
      Las acciones de la conferencia viven ahora detras de "Opciones": sueltas
      en el pie usaban el mismo molde que las fichas y el pie parecia la
      continuacion de la lista.
    */
    await userEvent.click(await screen.findByRole('button', { name: /Opciones de la conferencia/ }))
    await userEvent.click(
      await within(await screen.findByRole('dialog', { name: 'Opciones' })).findByRole('button', {
        name: /Etiquetas/,
      }),
    )

    const asignador = await screen.findByRole('dialog', { name: 'Etiquetas' })
    const casilla = within(asignador).getByRole('checkbox', { name: 'revisión 2026' })

    expect(casilla).not.toBeChecked()

    mockearFilaDe('etiquetas_asignaciones', {
      id_etiqueta: 'etq-zul-revision',
      id_conferencia: 'cnf-alc-01',
    })
    await userEvent.click(casilla)

    await waitFor(() => {
      expect(within(asignador).getByRole('checkbox', { name: 'revisión 2026' })).toBeChecked()
    })
  })

  it('deja disponible una etiqueta recién creada', async () => {
    montar()

    const filtros = await abrirFiltros()

    mockearFilaDe('etiquetas', {
      id: 'etq-zul-nueva',
      nombre: 'congreso',
      id_propietario: ZULUAGA.id,
    })

    await userEvent.type(
      within(filtros).getByLabelText('Nombre de la etiqueta nueva'),
      'congreso',
    )
    await userEvent.click(within(filtros).getByRole('button', { name: 'Crear' }))

    expect(await within(filtros).findByRole('checkbox', { name: 'congreso' })).toBeInTheDocument()
  })

  it('traduce el choque de nombres sin mostrar el código crudo', async () => {
    montar()

    const filtros = await abrirFiltros()

    /* "tesis" ya existe en el espacio de Camila: la regla pura lo atrapa antes del viaje. */
    await userEvent.type(within(filtros).getByLabelText('Nombre de la etiqueta nueva'), 'tesis')
    await userEvent.click(within(filtros).getByRole('button', { name: 'Crear' }))

    const aviso = await within(filtros).findByRole('alert')

    expect(aviso.textContent).toBe(mensajeDeError('ETQ_YA_EXISTE'))
    expect(aviso.textContent).not.toContain('ETQ_YA_EXISTE')
  })
})
