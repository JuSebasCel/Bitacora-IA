import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { CLAVE_SESION } from '@/features/auth/session/almacenamiento'
import { RutaProtegida } from '../RutaProtegida'
import { SECCIONES_DE_NAVEGACION } from './navegacion'
import { ShellLayout } from './ShellLayout'

const NOMBRE_DE_PRUEBA = 'Valentina Alcántara Rueda'

function sembrarSesion(): void {
  sessionStorage.setItem(
    CLAVE_SESION,
    JSON.stringify({
      id: 'usr-alcantara',
      nombre: NOMBRE_DE_PRUEBA,
      correo: 'valentina.alcantara@labanfora.org',
    }),
  )
}

function montarShell(rutaInicial = '/conferencias') {
  sembrarSesion()

  return render(
    <SessionProvider>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Routes>
          <Route path="/acceso" element={<p>Pantalla de acceso</p>} />
          <Route element={<RutaProtegida />}>
            <Route element={<ShellLayout />}>
              <Route path="/conferencias" element={<p>Contenido de conferencias</p>} />
              <Route path="/conferencias/nueva" element={<p>Contenido de carga</p>} />
              <Route path="/conferencias/:idConferencia" element={<p>Contenido del detalle</p>} />
              <Route path="/catalogo" element={<p>Contenido del catálogo</p>} />
              <Route path="/memorias" element={<p>Contenido de memorias</p>} />
              <Route path="/plantillas" element={<p>Contenido de plantillas</p>} />
              <Route path="/configuracion" element={<p>Contenido de configuración</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  )
}

function barraDeNavegacion(): HTMLElement {
  return screen.getByRole('navigation', { name: /secciones/i })
}

function botonDelCajon(): HTMLElement {
  return screen.getByRole('button', { name: /navegación/i })
}

function ultimoEnlaceDeNavegacion(): HTMLElement {
  const enlaces = within(barraDeNavegacion()).getAllByRole('link')
  const ultimo = enlaces.at(-1)

  if (ultimo === undefined) {
    throw new Error('la barra de navegación no tiene enlaces')
  }

  return ultimo
}

describe('ShellLayout', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  it('renderiza el contenido de la ruta activa dentro del shell', () => {
    montarShell('/memorias')

    expect(screen.getByText('Contenido de memorias')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('lista las seis secciones de navegación en el orden definido', () => {
    montarShell()

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')

    expect(enlaces).toHaveLength(6)
    expect(enlaces.map((enlace) => enlace.textContent?.trim())).toEqual([
      'Conferencias',
      'Cargar conferencia',
      'Catálogo',
      'Memorias',
      'Plantillas',
      'Configuración',
    ])
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/conferencias',
      '/conferencias/nueva',
      '/catalogo',
      '/memorias',
      '/plantillas',
      '/configuracion',
    ])
  })

  it('marca con aria-current="page" solo la sección de la ruta actual', () => {
    montarShell('/catalogo')

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')
    const activos = enlaces.filter((enlace) => enlace.getAttribute('aria-current') === 'page')

    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveTextContent('Catálogo')
  })

  it('no marca dos secciones a la vez cuando una ruta es prefijo de otra', () => {
    montarShell('/conferencias/nueva')

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')
    const activos = enlaces.filter((enlace) => enlace.getAttribute('aria-current') === 'page')

    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveTextContent('Cargar conferencia')
  })

  /*
    El detalle de una conferencia cuelga de /conferencias y no tiene sección
    propia, así que la sección de origen tiene que seguir marcada: si no, el
    índice diría que no estás en ninguna parte.
  */
  it('mantiene marcada la sección de origen dentro del detalle de una conferencia', () => {
    montarShell('/conferencias/cnf-alc-01')

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')
    const activos = enlaces.filter((enlace) => enlace.getAttribute('aria-current') === 'page')

    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveTextContent('Conferencias')
    expect(screen.getByText('Contenido del detalle')).toBeInTheDocument()
  })

  /*
    Regresión: el segmento estático tiene que seguir ganando al dinámico ahora
    que las dos rutas conviven.
  */
  it('resuelve la carga de conferencia y no el detalle en /conferencias/nueva', () => {
    montarShell('/conferencias/nueva')

    expect(screen.getByText('Contenido de carga')).toBeInTheDocument()
    expect(screen.queryByText('Contenido del detalle')).not.toBeInTheDocument()
  })

  it('muestra el nombre de la persona con sesión abierta', () => {
    montarShell()

    expect(screen.getByText(NOMBRE_DE_PRUEBA)).toBeInTheDocument()
  })

  it('cierra la sesión y deja de mostrar el shell al pulsar el botón', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument()
    expect(screen.queryByText(NOMBRE_DE_PRUEBA)).not.toBeInTheDocument()
    expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull()
  })

  it('alterna aria-expanded del botón del cajón de navegación', async () => {
    const usuario = userEvent.setup()
    montarShell()

    expect(botonDelCajon()).toHaveAttribute('aria-expanded', 'false')

    await usuario.click(botonDelCajon())
    expect(botonDelCajon()).toHaveAttribute('aria-expanded', 'true')

    await usuario.click(botonDelCajon())
    expect(botonDelCajon()).toHaveAttribute('aria-expanded', 'false')
  })

  it('apunta el botón del cajón a la barra de navegación con aria-controls', () => {
    montarShell()

    expect(botonDelCajon().getAttribute('aria-controls')).toBe(barraDeNavegacion().id)
    expect(barraDeNavegacion().id.length).toBeGreaterThan(0)
  })

  it('cierra el cajón con la tecla Escape', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDelCajon())
    expect(botonDelCajon()).toHaveAttribute('aria-expanded', 'true')

    await usuario.keyboard('{Escape}')

    expect(botonDelCajon()).toHaveAttribute('aria-expanded', 'false')
  })

  it('cierra el cajón al elegir una sección', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDelCajon())
    await usuario.click(within(barraDeNavegacion()).getByRole('link', { name: 'Memorias' }))

    expect(screen.getByText('Contenido de memorias')).toBeInTheDocument()
    expect(botonDelCajon()).toHaveAttribute('aria-expanded', 'false')
  })

  it('mueve el foco al cajón al abrirlo y lo devuelve al botón al cerrarlo', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDelCajon())
    expect(barraDeNavegacion()).toHaveFocus()

    await usuario.keyboard('{Escape}')
    expect(botonDelCajon()).toHaveFocus()
  })

  it('vuelve al principio del cajón al tabular más allá de la última sección', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDelCajon())
    ultimoEnlaceDeNavegacion().focus()

    await usuario.tab()

    expect(botonDelCajon()).toHaveFocus()
  })

  it('vuelve al final del cajón al retroceder con Shift+Tab desde su botón', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDelCajon())
    botonDelCajon().focus()

    await usuario.tab({ shift: true })

    expect(ultimoEnlaceDeNavegacion()).toHaveFocus()
  })

  it('no deja salir el foco del cajón hacia el contenido de detrás', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDelCajon())

    const cajon = barraDeNavegacion()
    const boton = botonDelCajon()
    const enlaces = within(cajon).getAllByRole('link')

    for (let paso = 0; paso < enlaces.length + 3; paso += 1) {
      await usuario.tab()

      const enfocado = document.activeElement
      expect(enfocado === boton || cajon.contains(enfocado)).toBe(true)
    }
  })

  it('bloquea el desplazamiento del documento mientras el cajón está abierto', async () => {
    const usuario = userEvent.setup()
    document.body.style.overflow = 'auto'
    montarShell()

    await usuario.click(botonDelCajon())
    expect(document.body.style.overflow).toBe('hidden')

    await usuario.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('auto')
  })

  it('restaura el desplazamiento del documento al desmontar con el cajón abierto', async () => {
    const usuario = userEvent.setup()
    const { unmount } = montarShell()

    await usuario.click(botonDelCajon())
    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('')
  })

  it('ofrece el disparador del panel de chat con nombre accesible', () => {
    montarShell()

    expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument()
  })

  it('no muestra lenguaje de obra en curso en el shell', () => {
    montarShell()

    const texto = document.body.textContent ?? ''

    expect(texto).not.toMatch(/próximamente|proximamente|en construcción|construccion/i)
    expect(texto).not.toMatch(/pendiente|wip|beta|aún no|aun no|disponible pronto/i)
  })
})

describe('SECCIONES_DE_NAVEGACION', () => {
  it('define seis secciones con ruta única e icono', () => {
    expect(SECCIONES_DE_NAVEGACION).toHaveLength(6)

    const rutas = SECCIONES_DE_NAVEGACION.map((seccion) => seccion.ruta)
    expect(new Set(rutas).size).toBe(6)

    for (const seccion of SECCIONES_DE_NAVEGACION) {
      expect(seccion.etiqueta.trim().length).toBeGreaterThan(0)
      expect(seccion.ruta.startsWith('/')).toBe(true)
      expect(seccion.icono).toBeDefined()
    }
  })
})
