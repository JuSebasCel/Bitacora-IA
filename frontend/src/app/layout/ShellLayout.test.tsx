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

/*
  El último elemento que recibe foco dentro del dock, sea enlace o botón. No
  se busca "el último enlace" porque el dock cierra con Chat, que es un botón
  y no una ruta: dar por hecho que el último era un enlace ataba la prueba al
  orden concreto de los ítems.
*/
function ultimoEnlaceDeNavegacion(): HTMLElement {
  const enfocables = barraDeNavegacion().querySelectorAll<HTMLElement>('a[href], button')
  const ultimo = enfocables[enfocables.length - 1]

  if (ultimo === undefined) {
    throw new Error('la barra de navegación no tiene nada enfocable')
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

  it('lista las tres secciones de navegación en el orden definido, sin Configuración', () => {
    montarShell()

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')
    const secciones = enlaces.slice(0, 3)

    expect(secciones.map((enlace) => enlace.textContent?.trim())).toEqual([
      'Conferencias',
      'Plantillas',
      'Memorias',
    ])
    expect(secciones.map((enlace) => enlace.getAttribute('href'))).toEqual([
      '/conferencias',
      '/plantillas',
      '/memorias',
    ])
    expect(enlaces.some((enlace) => enlace.getAttribute('href') === '/configuracion')).toBe(false)
  })

  /*
    Las acciones de creación viven en el dock y no enterradas dentro de cada
    pantalla: cargar una conferencia es lo que desbloquea todo lo demás, y
    exigía llegar antes a Conferencias.
  */
  it('ofrece las acciones de creación desde el dock, apuntando a su sección', () => {
    montarShell()

    const dock = barraDeNavegacion()

    expect(within(dock).getByRole('link', { name: 'Cargar conferencia' })).toHaveAttribute(
      'href',
      '/conferencias?nuevo=1',
    )
    expect(within(dock).getByRole('link', { name: 'Generar memoria' })).toHaveAttribute(
      'href',
      '/memorias?nuevo=1',
    )
  })

  /* El chat era un icono sin etiqueta en la barra superior; ahora se llama por su nombre. */
  it('abre el chat desde el dock', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(within(barraDeNavegacion()).getByRole('button', { name: 'Chat' }))

    expect(screen.getByRole('dialog', { name: /chat/i })).toBeInTheDocument()
  })

  /*
    La barra superior nombraba la sección activa, que el dock ya marca y el
    título de la pantalla ya dice: la misma palabra tres veces para sostener
    la cuenta y las notificaciones. Esos dos controles se mudaron al dock y la
    barra quedó solo como manija del cajón en móvil.
  */
  it('no repite el nombre de la sección fuera del dock', () => {
    montarShell('/memorias')

    const encabezado = screen.queryByRole('banner')
    expect(encabezado === null || within(encabezado).queryByText('Memorias') === null).toBe(true)
  })

  it('la cuenta vive en el dock', () => {
    montarShell()

    expect(within(barraDeNavegacion()).getByRole('button', { name: /cuenta de/i })).toBeInTheDocument()
  })

  /*
    La campana volvio al dock. Se habia quitado en el redisenno, y con ella el
    unico acceso a la curaduria de temas; ahora ademas es donde llegan las
    invitaciones a conferencias compartidas, que sin un sitio donde aparecer
    no se podrian ni aceptar.
  */
  it('expone la campana de notificaciones en el dock', () => {
    montarShell()

    expect(
      within(barraDeNavegacion()).getByRole('button', { name: /notificaciones/i }),
    ).toBeInTheDocument()
  })

  it('marca con aria-current="page" solo la sección de la ruta actual', () => {
    montarShell('/memorias')

    const enlaces = within(barraDeNavegacion()).getAllByRole('link')
    const activos = enlaces.filter((enlace) => enlace.getAttribute('aria-current') === 'page')

    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveTextContent('Memorias')
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
    La cabecera del dock pasó de ser solo el disco de iniciales a llevar
    también el nombre y el correo: con el círculo suelto, esa franja se leía
    vacía. Las iniciales siguen dentro del disco.
  */
  it('la cabecera del dock muestra iniciales, nombre y correo', () => {
    montarShell()

    const cuenta = botonDeCuenta()

    expect(cuenta).toHaveTextContent('VA')
    expect(cuenta).toHaveTextContent(NOMBRE_DE_PRUEBA)
    expect(cuenta).toHaveTextContent('valentina.alcantara@labanfora.org')
  })

  /* El menú ya no los repite: quien los enseña es el disparador. */
  it('el menú de cuenta no repite el nombre ni el correo', async () => {
    const usuario = userEvent.setup()
    montarShell()

    await usuario.click(botonDeCuenta())

    expect(within(panelDeCuenta()).queryByText(NOMBRE_DE_PRUEBA)).not.toBeInTheDocument()
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
  /* El dock dejó de llevar iconos: la jerarquía es tipográfica, así que ya no se exige uno. */
  it('define tres secciones con ruta única, sin Configuración', () => {
    expect(SECCIONES_DE_NAVEGACION).toHaveLength(3)
    expect(SECCIONES_DE_NAVEGACION.some((seccion) => seccion.ruta === '/configuracion')).toBe(false)

    const rutas = SECCIONES_DE_NAVEGACION.map((seccion) => seccion.ruta)
    expect(new Set(rutas).size).toBe(3)

    for (const seccion of SECCIONES_DE_NAVEGACION) {
      expect(seccion.etiqueta.trim().length).toBeGreaterThan(0)
      expect(seccion.ruta.startsWith('/')).toBe(true)
    }
  })
})
