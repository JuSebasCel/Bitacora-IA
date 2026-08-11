import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { unirClases } from './clases'

/*
  Patrón unificado para "un solo botón que abre un panel flotante". Lo usan el
  selector de orden y el panel de filtros del dashboard, y cualquier control
  futuro que necesite el mismo gesto: sustituye al `<select>` grande y al
  bloque de filtros siempre desplegado por algo más cercano a un producto que a
  un formulario.

  Deliberadamente no es un menú ARIA (`role="menu"` con navegación por
  flechas): el contenido son controles nativos (radios, checkboxes, botones),
  y esos ya traen su propia semántica de teclado. Envolverlos en un `menu`
  significaría reimplementar a mano una navegación que el navegador ya da
  gratis, y a medias, que es peor que no darla.
*/

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
}

export function Popover({
  boton,
  etiquetaAccesible,
  alinear = 'izquierda',
  children,
  alAbrir,
  alCerrar,
  className,
}: PropsPopover): ReactElement {
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const disparadorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [correccionHorizontal, setCorreccionHorizontal] = useState(0)
  const reducirMovimiento = useReducedMotion()
  const idPanel = useId()

  function abrir(): void {
    setAbierto(true)
    alAbrir?.()
  }

  /*
    `alinear` fija un lado preferido, pero no basta: en viewports angostos los
    controles se envuelven (`flex-wrap`) y el mismo botón puede terminar cerca
    del borde contrario al que asumió `alinear` (el filtro "Filtros" alineado
    a la derecha, por ejemplo, puede acabar pegado al borde izquierdo en
    móvil). Tras montar el panel se mide su posición real y, si se sale de la
    pantalla por cualquier lado, se corrige con un desplazamiento horizontal
    encima de la posición base, en vez de recalcular `alinear` en cada sitio
    que usa `Popover`.
  */
  useLayoutEffect(() => {
    if (!abierto) {
      setCorreccionHorizontal(0)
      return
    }

    const panel = panelRef.current
    if (!panel) {
      return
    }

    const margen = 12
    const { left, right } = panel.getBoundingClientRect()

    if (left < margen) {
      setCorreccionHorizontal(margen - left)
    } else if (right > window.innerWidth - margen) {
      setCorreccionHorizontal(window.innerWidth - margen - right)
    } else {
      setCorreccionHorizontal(0)
    }
  }, [abierto])

  /*
    Devuelve el foco al disparador solo cuando el cierre lo decide el teclado o
    una selección dentro del panel. Un clic fuera es una decisión de ir a otra
    parte, y forzar el foco de vuelta ahí sería quitárselo de donde el usuario
    lo puso a propósito.
  */
  function cerrarYEnfocar(): void {
    setAbierto(false)
    alCerrar?.()
    disparadorRef.current?.focus()
  }

  useEffect(() => {
    if (!abierto) {
      return
    }

    function alPulsarFuera(evento: MouseEvent): void {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false)
        alCerrar?.()
      }
    }

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key === 'Escape') {
        cerrarYEnfocar()
      }
    }

    document.addEventListener('mousedown', alPulsarFuera)
    document.addEventListener('keydown', alPresionarTecla)

    return () => {
      document.removeEventListener('mousedown', alPulsarFuera)
      document.removeEventListener('keydown', alPresionarTecla)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  return (
    <div className={unirClases('relative', className)} ref={contenedorRef}>
      <button
        ref={disparadorRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={etiquetaAccesible}
        onClick={() => (abierto ? cerrarYEnfocar() : abrir())}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-texto-tenue transition-colors hover:bg-fondo hover:text-texto aria-expanded:bg-fondo aria-expanded:text-acento"
      >
        {boton}
      </button>

      <AnimatePresence>
        {abierto ? (
          <motion.div
            id={idPanel}
            ref={panelRef}
            initial={reducirMovimiento ? false : { opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ x: correccionHorizontal }}
            className={unirClases(
              'elevacion absolute top-full z-30 mt-2 min-w-64 max-w-[min(20rem,90vw)] rounded-md bg-panel p-3',
              alinear === 'derecha' ? 'right-0' : 'left-0',
            )}
          >
            {children(cerrarYEnfocar)}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
