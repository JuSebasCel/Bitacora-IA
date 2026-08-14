import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '@/features/auth/session'
import { supabase } from '@/shared/supabase/cliente'
import { ProveedorDeTema } from '@/shared/tema'
import {
  mockearApiKeyGuardada,
  mockearSesionAutenticada,
  reiniciarMocksDeSesion,
} from '@/test/sesionDePrueba'
import { RutaProtegida } from '../RutaProtegida'
import { SECCIONES_DE_NAVEGACION } from './navegacion'
import { ShellLayout } from './ShellLayout'

vi.mock('@/shared/supabase/cliente')

const NOMBRE_DE_PRUEBA = 'Valentina Alcántara Rueda'
const ID_USUARIO_DE_PRUEBA = '1ba5af9a-f6a2-4504-ab60-1f018c21290a'

function montarShell(rutaInicial = '/conferencias') {
  mockearSesionAutenticada({
    id: ID_USUARIO_DE_PRUEBA,
    nombre: NOMBRE_DE_PRUEBA,
    correo: 'valentina.alcantara@labanfora.org',
  })

  return render(
    <ProveedorDeTema>
      <SessionProvider>
        <MemoryRouter initialEntries={[rutaInicial]}>
          <Routes>
            <Route path="/acceso" element={<p>Pantalla de acceso</p>} />
            <Route element={<RutaProtegida />}>
              <Route element={<ShellLayout />}>
                <Route path="/conferencias" element={<p>Contenido de conferencias</p>} />
                <Route path="/conferencias/:idConferencia" element={<p>Contenido del detalle</p>} />
                <Route path="/catalogo" element={<p>Contenido del catálogo</p>} />
                <Route path="/memorias" element={<p>Contenido de memorias</p>} />
                <Route path="/plantillas" element={<p>Contenido de plantillas</p>} />
                <Route path="/configuracion" element={<p>Contenido de configuración</p>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </ProveedorDeTema>,
  )
}

function barraDeNavegacion(): HTMLElement {
  return screen.getByRole('navigation', { name: /secciones/i })
}

function botonDelCajon(): HTMLElement {
  return screen.getByRole('button', { name: /navegación/i })
}

function botonDeCuenta(): HTMLElement {
  return screen.getByRole('button', { name: /cuenta de/i })
}

/** El panel del menú de cuenta, para no confundir su enlace "Configuración" con el de la barra lateral. */
function panelDeCuenta(): HTMLElement {
  const idPanel = botonDeCuenta().getAttribute('aria-controls')
  const panel = idPanel === null ? null : document.getElementById(idPanel)

  if (panel === null) {
    throw new Error('el panel de cuenta no está montado')
  }

  return panel
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

  afterEach(() => {
    reiniciarMocksDeSesion()
  })

  it('renderiza el contenido de la ruta activa dentro del shell', () => {
    montarShell('/memorias')

    expect(screen.getByText('Contenido de memorias')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('lista las cuatro secciones de navegación en el orden definido, sin Configuración', () => {
    montarShell()

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')

    expect(enlaces).toHaveLength(4)
    expect(enlaces.map((enlace) => enlace.textContent?.trim())).toEqual([
      'Conferencias',
      'Catálogo',
      'Memorias',
      'Plantillas',
    ])
    expect(enlaces.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/conferencias',
      '/catalogo',
      '/memorias',
      '/plantillas',
    ])
  })

  it('la barra superior nombra la sección activa junto al nombre del producto', () => {
    montarShell('/catalogo')

    const encabezado = screen.getByRole('banner')
    expect(within(encabezado).getByText('Catálogo')).toBeInTheDocument()
  })

  it('marca con aria-current="page" solo la sección de la ruta actual', () => {
    montarShell('/catalogo')

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')
    const activos = enlaces.filter((enlace) => enlace.getAttribute('aria-current') === 'page')

    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveTextContent('Catálogo')
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

  it('el círculo de cuenta muestra las iniciales, no el nombre completo', () => {
    montarShell()

    expect(screen.queryByText(NOMBRE_DE_PRUEBA)).not.toBeInTheDocument()
    expect(botonDeCuenta()).toHaveTextContent('VA')
  })

  it('abre el menú de cuenta y muestra el nombre y el correo', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDeCuenta())

    expect(screen.getByText(NOMBRE_DE_PRUEBA)).toBeInTheDocument()
    expect(screen.getByText('valentina.alcantara@labanfora.org')).toBeInTheDocument()
  })

  it('el menú de cuenta ofrece un atajo a Configuración', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDeCuenta())
    const enlace = within(panelDeCuenta()).getByRole('link', { name: 'Configuración' })

    expect(enlace).toHaveAttribute('href', '/configuracion')

    await usuario.click(enlace)
    expect(await screen.findByText('Contenido de configuración')).toBeInTheDocument()
  })

  it('cambia el tema desde el menú de cuenta', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDeCuenta())
    await usuario.click(screen.getByRole('button', { name: 'Oscuro' }))

    expect(document.documentElement.dataset.theme).toBe('dark')

    /* El menú sigue abierto: cambiar de tema no lo cierra. */
    await usuario.click(screen.getByRole('button', { name: 'Sistema' }))

    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('avisa en el círculo y en el menú cuando falta la API key', async () => {
    const usuario = userEvent.setup()
    montarShell()

    /* `useApiKey` resuelve de red (B2): se espera a que la llamada mockeada asiente antes de mirar el resultado. */
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('leer_mi_api_key'))
    await waitFor(() => expect(botonDeCuenta()).toHaveAccessibleName(/falta configurar la api key/i))

    await usuario.click(botonDeCuenta())
    const enlace = within(panelDeCuenta()).getByRole('link', { name: /Falta tu API key/ })
    expect(enlace).toHaveAttribute('href', '/configuracion#config-api-key')
  })

  it('no avisa cuando ya hay una API key guardada', async () => {
    mockearApiKeyGuardada('sk-de-prueba')
    const usuario = userEvent.setup()
    montarShell()

    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('leer_mi_api_key'))
    await usuario.click(botonDeCuenta())

    expect(within(panelDeCuenta()).queryByText(/Falta tu API key/)).not.toBeInTheDocument()
  })

  it('cierra la sesión desde el menú de cuenta y deja de mostrar el shell', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDeCuenta())
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(screen.getByText('Pantalla de acceso')).toBeInTheDocument()
    expect(supabase.auth.signOut).toHaveBeenCalled()
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
  it('define cuatro secciones con ruta única e icono, sin Configuración', () => {
    expect(SECCIONES_DE_NAVEGACION).toHaveLength(4)
    expect(SECCIONES_DE_NAVEGACION.some((seccion) => seccion.ruta === '/configuracion')).toBe(false)

    const rutas = SECCIONES_DE_NAVEGACION.map((seccion) => seccion.ruta)
    expect(new Set(rutas).size).toBe(4)

    for (const seccion of SECCIONES_DE_NAVEGACION) {
      expect(seccion.etiqueta.trim().length).toBeGreaterThan(0)
      expect(seccion.ruta.startsWith('/')).toBe(true)
      expect(seccion.icono).toBeDefined()
    }
  })
})
