import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactElement, ReactNode } from 'react'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { unirClases } from './clases'

/*
  Patrón unificado para "un solo botón que abre un panel flotante".

  **El panel se dibuja en un portal sobre `document.body`, con posición fija
  calculada del disparador.** Antes era `absolute` dentro del flujo, y eso lo
  dejaba a merced de cualquier antepasado con `overflow: hidden` o `auto`: el
  calendario del modal de carga salía recortado por el cuerpo desplazable del
  propio modal, que es exactamente el caso que lo destapó. Con el portal, el
  panel no tiene antepasados que lo recorten.

  El precio del portal es que el panel deja de estar dentro del contenedor, así
  que el clic de fuera tiene que mirar los dos: el disparador y el panel.

  La posición se recalcula al desplazar o redimensionar, porque un panel fijo
  no viaja con la página como lo hacía el absoluto.

  Deliberadamente no es un menú ARIA (`role="menu"` con navegación por
  flechas): el contenido son controles nativos (radios, checkboxes, botones),
  y esos ya traen su propia semántica de teclado. Envolverlos en un `menu`
  significaría reimplementar a mano una navegación que el navegador ya da
  gratis, y a medias, que es peor que no darla.
*/

const MARGEN = 12
const SEPARACION = 8

export type PropsPopover = {
  /** Contenido visible del botón disparador (texto, icono, o ambos). */
  boton: ReactNode
  /** Nombre accesible del disparador. Úsalo cuando `boton` no es autodescriptivo por sí solo. */
  etiquetaAccesible?: string
  alinear?: 'izquierda' | 'derecha'
  /** El panel recibe una función para cerrarse a sí mismo tras completar una acción. */
  children: (cerrar: () => void) => ReactNode
  alAbrir?: () => void
  alCerrar?: () => void
  className?: string
  /**
   * Sustituye por completo el aspecto del disparador. Sin esto, el botón pone
   * su propio relleno y fondo, que se suman a los del contenido y descuadran
   * a quien ya llega con forma de pastilla.
   */
  claseDelBoton?: string
  /** Sustituye el tamaño del panel; el fondo, el radio y la elevación se conservan. */
  claseDelPanel?: string
  /**
   * Milisegundos que el cursor puede estar fuera antes de que el panel se
   * cierre solo. Sin esto, el panel solo se cierra por clic fuera o Escape.
   *
   * Existe para los paneles donde elegir algo NO termina la tarea —el
   * calendario es el caso: se elige un día y puede que uno se haya
   * equivocado de mes—. Ahí cerrar al primer clic obliga a reabrir para
   * corregir, así que el panel se queda y es el cursor yéndose lo que dice
   * que ya está.
   *
   * Solo lo dispara el ratón: con teclado no hay "estar fuera", y ahí
   * siguen mandando Escape y el clic fuera.
   */
  cerrarAlSalir?: number
}

export function Popover({
  boton,
  etiquetaAccesible,
  alinear = 'izquierda',
  children,
  alAbrir,
  alCerrar,
  className,
  claseDelBoton,
  claseDelPanel,
  cerrarAlSalir,
}: PropsPopover): ReactElement {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const disparadorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /* Números y no `CSSProperties`: `motion` tiene su propio tipo de estilo y no acepta el de React. */
  const [posicion, setPosicion] = useState({ top: -9999, left: -9999, maxHeight: 0 })
  const reducirMovimiento = useReducedMotion()
  const idPanel = useId()

  const temporizadorDeSalida = useRef<number | null>(null)

  const cancelarCierre = useCallback((): void => {
    if (temporizadorDeSalida.current !== null) {
      clearTimeout(temporizadorDeSalida.current)
      temporizadorDeSalida.current = null
    }
  }, [])

  /*
    El disparador y el panel estan separados por 8px de aire, asi que ir de
    uno al otro dispara una salida. Por eso es un temporizador y no un cierre
    inmediato: el reingreso lo cancela antes de que llegue a cumplirse.
  */
  const programarCierre = useCallback((): void => {
    if (cerrarAlSalir === undefined) {
      return
    }

    cancelarCierre()
    temporizadorDeSalida.current = window.setTimeout(() => {
      temporizadorDeSalida.current = null
      setAbierto(false)
      alCerrar?.()
    }, cerrarAlSalir)
  }, [cerrarAlSalir, cancelarCierre, alCerrar])

  /* Un temporizador en vuelo cuando el panel ya se fue cerraria algo que no existe. */
  useEffect(() => cancelarCierre, [cancelarCierre])

  useEffect(() => {
    if (!abierto) {
      cancelarCierre()
    }
  }, [abierto, cancelarCierre])

  function abrir(): void {
    setAbierto(true)
    alAbrir?.()
  }

  /*
    Sitúa el panel bajo el disparador y lo mete dentro de la pantalla: se
    corre en horizontal si se sale por un lado, y se pasa arriba si abajo no
    cabe pero arriba sí.
  */
  const situar = useCallback((): void => {
    const disparador = disparadorRef.current
    const panel = panelRef.current

    if (disparador === null || panel === null) {
      return
    }

    const ancla = disparador.getBoundingClientRect()
    const { width, height } = panel.getBoundingClientRect()

    const izquierdaBase = alinear === 'derecha' ? ancla.right - width : ancla.left
    const izquierda = Math.min(
      Math.max(MARGEN, izquierdaBase),
      Math.max(MARGEN, window.innerWidth - width - MARGEN),
    )

    const debajo = ancla.bottom + SEPARACION
    const cabeDebajo = debajo + height <= window.innerHeight - MARGEN
    const cabeEncima = ancla.top - SEPARACION - height >= MARGEN

    setPosicion({
      top: cabeDebajo || !cabeEncima ? debajo : ancla.top - SEPARACION - height,
      left: izquierda,
      maxHeight: window.innerHeight - MARGEN * 2,
    })
  }, [alinear])

  useLayoutEffect(() => {
    if (!abierto) {
      return
    }

    situar()

    window.addEventListener('resize', situar)
    /* En captura: sirve también para el desplazamiento de cualquier contenedor interno. */
    window.addEventListener('scroll', situar, true)

    return () => {
      window.removeEventListener('resize', situar)
      window.removeEventListener('scroll', situar, true)
    }
  }, [abierto, situar])

  /*
    Devuelve el foco al disparador solo cuando el cierre lo decide el teclado o
    una selección dentro del panel. Un clic fuera es una decisión de ir a otra
    parte, y forzar el foco de vuelta ahí sería quitárselo de donde el usuario
    lo puso a propósito.
  */
  const cerrarYEnfocar = useCallback((): void => {
    setAbierto(false)
    alCerrar?.()
    disparadorRef.current?.focus()
  }, [alCerrar])

  useEffect(() => {
    if (!abierto) {
      return
    }

    function alPulsarFuera(evento: MouseEvent): void {
      const destino = evento.target as Node

      /* El panel vive en un portal: no basta con mirar el contenedor. */
      if (contenedorRef.current?.contains(destino) || panelRef.current?.contains(destino)) {
        return
      }

      setAbierto(false)
      alCerrar?.()
    }

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key === 'Escape') {
        /* Que no se lo lleve además el modal que haya detrás. */
        evento.stopPropagation()
        cerrarYEnfocar()
      }
    }

    document.addEventListener('mousedown', alPulsarFuera)
    document.addEventListener('keydown', alPresionarTecla, true)

    return () => {
      document.removeEventListener('mousedown', alPulsarFuera)
      document.removeEventListener('keydown', alPresionarTecla, true)
    }
  }, [abierto, alCerrar, cerrarYEnfocar])

  return (
    <div
      className={unirClases('relative', className)}
      ref={contenedorRef}
      onPointerEnter={cancelarCierre}
      onPointerLeave={programarCierre}
    >
      <button
        ref={disparadorRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={etiquetaAccesible}
        onClick={() => (abierto ? cerrarYEnfocar() : abrir())}
        className={
          claseDelBoton ??
          'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-texto-tenue transition-colors hover:bg-fondo hover:text-texto aria-expanded:bg-fondo aria-expanded:text-acento'
        }
      >
        {boton}
      </button>

      {createPortal(
        <AnimatePresence>
          {abierto ? (
            <motion.div
              id={idPanel}
              ref={panelRef}
              initial={reducirMovimiento ? false : { opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={posicion}
              onPointerEnter={cancelarCierre}
              onPointerLeave={programarCierre}
              className={unirClases(
                'elevacion sin-barra-de-scroll fixed z-[60] overflow-y-auto rounded-[24px] bg-panel p-2',
                claseDelPanel ?? 'min-w-64 max-w-[min(20rem,90vw)]',
              )}
            >
              {children(cerrarYEnfocar)}
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
