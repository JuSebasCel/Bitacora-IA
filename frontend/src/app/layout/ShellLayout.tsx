import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { BarraLateral } from './BarraLateral'
import { BarraSuperior } from './BarraSuperior'

/* Id compartido entre el cajón y su botón (aria-controls). */
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

  return (
    <div className="min-h-dvh bg-fondo font-sans text-texto">
      <BarraSuperior
        cajonAbierto={cajonAbierto}
        idDeNavegacion={ID_DE_NAVEGACION}
        alternarCajon={alternarCajon}
        refDelBotonDelCajon={refDelBotonDelCajon}
      />

      <div className="flex">
        <BarraLateral
          id={ID_DE_NAVEGACION}
          abierta={cajonAbierto}
          alNavegar={cerrarCajon}
          refDelCajon={refDelCajon}
        />

        {cajonAbierto ? (
          <div
            aria-hidden="true"
            onClick={cerrarCajon}
            className="fixed top-14 right-0 bottom-0 left-0 z-20 bg-fondo/80 md:hidden"
          />
        ) : null}

        <main className="min-w-0 flex-1 px-5 py-8 md:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
