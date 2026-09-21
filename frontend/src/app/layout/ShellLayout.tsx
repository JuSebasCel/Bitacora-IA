import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ChatEnCamino } from '@/features/chat/components'
import { ProveedorDeApiKey } from '@/features/configuracion/ProveedorDeApiKey'
import { Modal } from '@/shared/ui'
import { BarraLateral } from './BarraLateral'
import { BarraSuperior } from './BarraSuperior'

/* Id compartido entre el cajón y su botón (aria-controls). */
const CLAVE_DEL_DOCK = 'menti-vault:dock'
const ID_DE_NAVEGACION = 'navegacion-del-shell'

/* Lo que puede recibir el foco por tabulación dentro del cajón. */
const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function comoElemento(nodo: Element | null): HTMLElement | null {
  return nodo instanceof HTMLElement ? nodo : null
}

/*
  Armazón de la aplicación autenticada: barra superior, índice de secciones y el
  contenido de la ruta activa. El cajón solo existe bajo 768px; sobre ese ancho
  la barra lateral está siempre visible y su estado abierto es irrelevante, por
  lo que todo el comportamiento modal cuelga de `cajonAbierto` y no del ancho.
*/
export function ShellLayout() {
  const [cajonAbierto, setCajonAbierto] = useState(false)
  const [chatAbierto, setChatAbierto] = useState(false)
  const botonDelChat = useRef<HTMLElement | null>(null)

  /*
    Plegar el dock es una preferencia de quien mira, igual que el tema, así
    que vive en `localStorage` y no en la URL: no describe qué estás viendo y
    no tiene sentido que viaje en un enlace compartido.

    El acceso va en `try` porque en una ventana privada o con las cookies
    bloqueadas lanza, y quedarse sin dock por eso sería absurdo.
  */
  const [dockPlegado, setDockPlegado] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_DEL_DOCK) === 'plegado'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_DEL_DOCK, dockPlegado ? 'plegado' : 'desplegado')
    } catch {
      /* Sin almacenamiento el dock simplemente no recuerda; no es un fallo que contar. */
    }
  }, [dockPlegado])
  const refDelCajon = useRef<HTMLElement>(null)
  const refDelBotonDelCajon = useRef<HTMLButtonElement>(null)

  const cerrarCajon = useCallback(() => {
    setCajonAbierto(false)
  }, [])

  const alternarCajon = useCallback(() => {
    setCajonAbierto((abierto) => !abierto)
  }, [])

  /*
    Mientras el cajón está abierto se comporta como un diálogo modal: encierra
    el foco entre su botón y sus enlaces, bloquea el desplazamiento del
    documento y devuelve el foco a quien lo abrió. La limpieza deshace las tres
    cosas, también cuando el componente se desmonta con el cajón abierto.
  */
  useEffect(() => {
    if (!cajonAbierto) {
      return
    }

    const cajon = refDelCajon.current
    const boton = refDelBotonDelCajon.current
    const enfocadoAntes = comoElemento(document.activeElement)
    const desbordePrevio = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    cajon?.focus()

    /* El botón del cajón abre el ciclo porque precede a la barra en el documento. */
    function recorrido(): HTMLElement[] {
      const dentro = cajon === null ? [] : Array.from(cajon.querySelectorAll(SELECTOR_ENFOCABLE))
      const enfocables = dentro.flatMap((nodo) => {
        const elemento = comoElemento(nodo)
        return elemento === null ? [] : [elemento]
      })

      return boton === null ? enfocables : [boton, ...enfocables]
    }

    function encerrarElFoco(evento: KeyboardEvent): void {
      const lista = recorrido()
      if (lista.length === 0) {
        return
      }

      evento.preventDefault()

      const activo = comoElemento(document.activeElement)
      const indice = activo === null ? -1 : lista.indexOf(activo)
      /* Fuera del recorrido (el propio cajón, por ejemplo) se parte del inicio. */
      const desde = indice === -1 ? 0 : indice
      const paso = evento.shiftKey ? -1 : 1
      const siguiente = lista[(desde + paso + lista.length) % lista.length]

      siguiente?.focus()
    }

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key === 'Escape') {
        setCajonAbierto(false)
        return
      }

      if (evento.key === 'Tab') {
        encerrarElFoco(evento)
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = desbordePrevio

      const aRestaurar = enfocadoAntes !== null && enfocadoAntes.isConnected ? enfocadoAntes : boton
      aRestaurar?.focus()
    }
  }, [cajonAbierto])

  /*
    Armazón de app, no de página: el contenedor mide exactamente el alto de la
    ventana y no desborda, así que el documento nunca scrollea. El dock queda
    quieto por construcción —sin `position: fixed` en escritorio— y lo que se
    desplaza es el contenido, dentro de su propia caja. Es lo que separa que
    esto se sienta una aplicación y no una página larga.
  */
  return (
    <ProveedorDeApiKey>
      <div className="flex h-dvh overflow-hidden bg-fondo font-sans text-texto">
        {/*
          El chat todavía no está listo para usarse: se construyó sobre el
          mundo de fixtures y le falta el backend real. Se abre con la forma
          que va a tener —la tarjeta de la referencia, anclada a su botón y
          creciendo desde él hacia la derecha del dock— y dice que se está
          trabajando en él. El panel viejo (`PanelDeChat`) sigue en el código.
        */}
        <Modal
          abierto={chatAbierto}
          alCerrar={() => setChatAbierto(false)}
          titulo="Chat"
          ancho="angosto"
          anclaje="disparador"
          anclaEn={botonDelChat}
          crecerHacia="derecha"
          sinMarco
        >
          <ChatEnCamino alCerrar={() => setChatAbierto(false)} />
        </Modal>

        <BarraLateral
          id={ID_DE_NAVEGACION}
          abierta={cajonAbierto}
          alNavegar={cerrarCajon}
          refDelCajon={refDelCajon}
          alAbrirChat={(boton) => {
            botonDelChat.current = boton
            setChatAbierto(true)
          }}
          plegada={dockPlegado}
          alPlegar={() => setDockPlegado(true)}
        />

        {cajonAbierto ? (
          <div
            aria-hidden="true"
            onClick={cerrarCajon}
            className="fixed inset-0 z-20 bg-scrim md:hidden"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          {/*
            Con el dock plegado, esto es lo único que queda de él. Va flotando
            sobre el contenido y no dentro del flujo para que desplegarlo no
            recoloque la pantalla dos veces —una por el botón que desaparece y
            otra por el dock que entra—.
          */}
          {dockPlegado ? (
            <button
              type="button"
              onClick={() => setDockPlegado(false)}
              aria-label="Mostrar el panel lateral"
              /*
                Pegado al borde izquierdo y centrado en vertical, no en la
                esquina: arriba se montaba encima del titulo de la pantalla
                —tapaba la C de "Conferencias"— y no habia forma de quitarlo
                de ahi sin mover el titulo. En el centro del borde no hay nada
                con lo que competir, y se lee como la pestana que devuelve el
                panel en vez de como un boton suelto sobre el contenido.
              */
              className="dock-entra fixed top-1/2 left-0 z-30 hidden h-16 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-2xl bg-panel text-texto-tenue shadow-[inset_0_0_0_1px_var(--bitacora-filete)] transition-colors hover:w-8 hover:text-texto md:flex"
            >
              <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                chevron_right
              </span>
            </button>
          ) : null}

          <BarraSuperior
            cajonAbierto={cajonAbierto}
            idDeNavegacion={ID_DE_NAVEGACION}
            alternarCajon={alternarCajon}
            refDelBotonDelCajon={refDelBotonDelCajon}
          />

          {/*
            `flex` y `min-h-0` para que una pantalla pueda llenar el alto y
            repartirlo entre sus columnas. Sin `min-h-0`, un hijo con su
            propio scroll crece hasta desbordar el contenedor en vez de
            ceñirse a él — es el fallo clásico de flexbox.

            Se fue el tope de ancho centrado: la referencia usa todo el ancho
            disponible, y con columnas el espacio sobrante es lo que permite
            que se vean las tres.
          */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-5 py-8 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </ProveedorDeApiKey>
  )
}
