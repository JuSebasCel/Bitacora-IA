import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'

/*
  Modal del sistema, calcado de la app de referencia.

  **No aparece: crece desde el botón que lo abrió.** En el primer cuadro se le
  aplica la transformación que lo calza exactamente encima del disparador
  —`scale(ancho del botón / ancho de la ventana)` más su traslación— y se
  suelta para que la transición lo lleve a identidad. Es un FLIP, y es lo que
  hace sentir que el botón *se convierte* en el modal.

  Tres capas corren juntas, y las tres hacen falta:

      ventana, transform   caja del botón → identidad   300ms, curva de entrada
      ventana, filtro      blur(32px) → 0               300ms
      velo                 opacidad y desenfoque        250ms

  El cierre es el mismo recorrido al revés.

  Cuatro trampas que costaron una sesión entera, y que están documentadas en
  la skill `diseno-visual`:

  1. Una animación CSS le gana a los estilos en línea mientras siga activa:
     las clases de entrada se **quitan** al cerrar, o la salida no pinta nada.
  2. Anclar y medir para el FLIP van en el **mismo** efecto y en ese orden.
  3. `montado` va en las dependencias del efecto de layout: la ventana se
     monta un render después de `abierto`, y sin esa dependencia el efecto
     corre con la ref en `null` y no vuelve a ejecutarse.
  4. Las props que describen el modal no pueden derivarse de si está abierto,
     o al cerrar cambian de golpe mientras corre la salida.
*/

export type AnclajeDeModal = 'centro' | 'disparador'

export type PropsModal = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  children: ReactNode
  /** `disparador` lo posa sobre el botón que lo abrió; `centro`, en mitad de pantalla. */
  anclaje?: AnclajeDeModal
  /** El botón que lo abre. Si se pasa, la ventana **crece desde él**. */
  anclaEn?: RefObject<HTMLElement | null>
  ancho?: 'angosto' | 'normal'
  /** Región dentro de la cual debe quedar la ventana anclada, para no montarse sobre la navegación. */
  limites?: RefObject<HTMLElement | null>
}

const ANCHO: Record<'angosto' | 'normal', string> = {
  angosto: 'w-110',
  normal: 'w-180',
}

const MARGEN = 16
const DURACION = 300

export function Modal({
  abierto,
  alCerrar,
  titulo,
  children,
  anclaje = 'centro',
  anclaEn,
  ancho = 'normal',
  limites,
}: PropsModal): ReactElement | null {
  const ventanaRef = useRef<HTMLDivElement>(null)
  const veloRef = useRef<HTMLDivElement>(null)
  const alCerrarRef = useRef(alCerrar)

  /* Sobrevive a `abierto`: al cerrar hay que seguir en el DOM lo que dure la salida. */
  const [montado, setMontado] = useState(abierto)

  useEffect(() => {
    alCerrarRef.current = alCerrar
  })

  useLayoutEffect(() => {
    const ventana = ventanaRef.current

    if (!abierto || ventana === null) {
      return
    }

    /* Borrar lo que haya dejado una salida a medio camino: si no, reaparece invisible. */
    ventana.style.filter = ''
    ventana.style.opacity = ''

    const disparador = anclaEn?.current

    if (anclaje === 'disparador' && disparador) {
      const caja = disparador.getBoundingClientRect()
      ventana.style.position = 'absolute'
      ventana.style.top = `${caja.top}px`
      ventana.style.right = `${window.innerWidth - caja.right}px`

      const { width: anchoVentana, height: altoVentana } = ventana.getBoundingClientRect()
      const zona = limites?.current?.getBoundingClientRect()
      const bordeIzquierdo = (zona?.left ?? 0) + MARGEN

      ventana.style.top = `${Math.max(MARGEN, Math.min(caja.top, window.innerHeight - altoVentana - MARGEN))}px`

      const derecha = window.innerWidth - caja.right
      if (window.innerWidth - derecha - anchoVentana < bordeIzquierdo) {
        ventana.style.right = `${window.innerWidth - bordeIzquierdo - anchoVentana}px`
      }
    }

    if (!disparador) {
      return
    }

    const destino = ventana.getBoundingClientRect()
    const origen = disparador.getBoundingClientRect()

    if (destino.width === 0 || destino.height === 0) {
      return
    }

    const escalaX = origen.width / destino.width
    const escalaY = origen.height / destino.height
    const dx = origen.left + origen.width / 2 - (destino.left + destino.width / 2)
    const dy = origen.top + origen.height / 2 - (destino.top + destino.height / 2)

    ventana.style.transition = 'none'
    ventana.style.transform = `translate(${dx}px, ${dy}px) scale(${escalaX}, ${escalaY})`

    const cuadro = requestAnimationFrame(() => {
      ventana.style.transition = `transform ${DURACION}ms var(--ease-entrada)`
      ventana.style.transform = ''
    })

    return () => cancelAnimationFrame(cuadro)
  }, [abierto, montado, anclaje, anclaEn, limites])

  /* Salida: el mismo FLIP al revés; al terminar, recién ahí se desmonta. */
  useEffect(() => {
    if (abierto) {
      setMontado(true)
      return
    }

    if (!montado) {
      return
    }

    const ventana = ventanaRef.current
    const velo = veloRef.current
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duracion = sinMovimiento ? 0 : DURACION

    if (!sinMovimiento && ventana !== null) {
      ventana.style.transition = 'none'
      ventana.style.transform = ''
      void ventana.offsetWidth

      const disparador = anclaEn?.current
      const destino = ventana.getBoundingClientRect()

      ventana.style.transition = `transform ${duracion}ms var(--ease-entrada), filter ${duracion}ms ease, opacity ${duracion}ms ease`
      ventana.style.filter = 'blur(32px)'
      ventana.style.opacity = '0'

      if (disparador) {
        const origen = disparador.getBoundingClientRect()
        const dx = origen.left + origen.width / 2 - (destino.left + destino.width / 2)
        const dy = origen.top + origen.height / 2 - (destino.top + destino.height / 2)
        ventana.style.transform = `translate(${dx}px, ${dy}px) scale(${origen.width / destino.width}, ${origen.height / destino.height})`
      }
    }

    if (!sinMovimiento && velo !== null) {
      velo.style.transition = `opacity ${duracion}ms ease, backdrop-filter ${duracion}ms ease`
      velo.style.opacity = '0'
      velo.style.backdropFilter = 'blur(0px)'
    }

    const temporizador = setTimeout(() => setMontado(false), duracion)
    return () => clearTimeout(temporizador)
  }, [abierto, montado, anclaEn])

  useEffect(() => {
    if (!abierto) {
      return
    }

    const enfocadoAntes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const desbordePrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key === 'Escape') alCerrarRef.current()
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = desbordePrevio
      enfocadoAntes?.focus()
    }
  }, [abierto])

  if (!montado) {
    return null
  }

  /* Al cerrar se quitan las clases de entrada: sus animaciones mandarían sobre los estilos en línea. */
  const cerrando = !abierto

  return (
    <div
      ref={veloRef}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) alCerrar()
      }}
      className={`velo-de-modal fixed inset-0 z-50 p-4 ${cerrando ? '' : 'velo-entra'} ${
        anclaje === 'centro' ? 'flex items-center justify-center' : ''
      }`}
    >
      <div
        ref={ventanaRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        /*
          `max-h-full` con el cuerpo desplazable: un formulario largo dentro
          de un modal centrado se salía por abajo de la pantalla y su botón de
          envío quedaba fuera de alcance. La cabecera no se desplaza.
        */
        className={`${cerrando ? '' : 'entra-con-desenfoque'} ${ANCHO[ancho]} flex max-h-full max-w-full flex-col rounded-[32px] bg-panel focus:outline-none`}
      >
        <div className="flex shrink-0 items-center gap-3 px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl text-texto-tenue transition-colors hover:text-texto"
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno">
              close
            </span>
          </button>
          <h2 className="font-titulo text-[28px] leading-tight font-semibold text-texto">{titulo}</h2>
        </div>

        <div className="sin-barra-de-scroll flex min-h-0 flex-col gap-4 overflow-y-auto px-8 pt-2 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
