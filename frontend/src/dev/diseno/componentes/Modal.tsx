import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import { M3_TEXTO_SECUNDARIO } from '../paleta'

/*
  Modal de la referencia.

  Lo que no se ve mirando, y sí midiendo: **la ventana no aparece, crece desde
  el botón que la abrió**. En el instante de abrirse, su estilo en línea es

      transform: translate(145.9px, -58px) scale(0.27425, 0.25641)

  y su caja medida es 110×40 en la posición exacta del botón de buscar. Esos
  factores no son arbitrarios: 110/400 y 40/156, el tamaño del botón dividido
  por el de la ventana. Es una animación FLIP — se mide el origen, se
  transforma la ventana para que calce encima de él, y se suelta.

  Sobre eso corren dos cosas más a la vez:
  - el velo entra con un fundido, oscureciendo y desenfocando el fondo
  - la ventana entra con `blur(32px) → 0` de 0.3s

  Sobre el velo: la referencia usa `rgba(0, 0, 0, 0.1)` y ningún desenfoque
  (medido con el modal abierto, tanto en el scrim como en el contenido de
  atrás). Aquí va más oscuro y con desenfoque real, que es una decisión
  deliberada y no un descuido — los dos valores viven en `--m3-velo` y
  `--m3-velo-desenfoque` para poder devolverlos a los de la referencia.

  Las tres juntas son lo que hace que se sienta que el botón *se convierte* en
  el modal, en vez de que aparezca uno encima del otro.

  La duración de la expansión es lo único que no pude medir: la referencia la
  ejecuta con `requestAnimationFrame`, y una pestaña en segundo plano la
  congela. Va a 0.3s con la curva de entrada del sistema, que es lo que usa
  todo lo demás y lo que deja la expansión sincronizada con el desenfoque.

  El anclaje también lo calcula su JS: fija `top` y `right` en línea contra el
  botón (`right: 285px` = ancho de ventana menos el borde derecho del botón).
  Con solo alineación flex la ventana caía en la esquina, no sobre el botón.
*/

export type AnclajeDeModal = 'centro' | 'disparador'

export type PropsModal = {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  children: ReactNode
  /** `disparador` la posa sobre el botón que la abrió; `centro`, en mitad de pantalla. */
  anclaje?: AnclajeDeModal
  /**
   * El botón que la abre. Si se pasa, la ventana **crece desde él**, sin
   * importar dónde termine posada. Sin esto no hay expansión, solo desenfoque.
   */
  anclaEn?: RefObject<HTMLElement | null>
  /** Anclado va angosto; centrado, normal. */
  ancho?: 'angosto' | 'normal'
  /**
   * Región dentro de la cual debe quedar la ventana anclada. Sin esto se
   * acota solo al viewport, y puede acabar encima de la navegación.
   */
  limites?: RefObject<HTMLElement | null>
}

/*
  Algo más generosos que los de la referencia (400 y 600). Con los suyos, el
  modal centrado se lee vacío: el contenido no llena la caja y queda un cerco
  de aire que no comunica nada.
*/
const ANCHO: Record<'angosto' | 'normal', string> = {
  angosto: 'w-110',
  normal: 'w-180',
}

const MARGEN = 16

const DURACION_EXPANSION = 300

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

  /*
    `montado` sobrevive a `abierto`: al cerrar hay que seguir en el DOM el
    tiempo que dura la salida. Sin esto React desmonta en el acto y no hay
    nada que animar — que es justo lo que pasaba antes.
  */
  const [montado, setMontado] = useState(abierto)

  useEffect(() => {
    alCerrarRef.current = alCerrar
  })

  /*
    Anclaje y expansión van juntos, en este orden y en un solo efecto. Estaban
    separados y ese era el error: como los efectos corren en el orden en que
    se declaran, el FLIP medía la ventana **antes** de que el anclaje la
    moviera. Calculaba la transformación contra una posición que un instante
    después dejaba de ser cierta, y el resultado era un modal que ni crecía
    desde el botón ni terminaba encima de él.

    Va en `useLayoutEffect` y no en `useEffect` porque hay que medir y
    transformar **antes** de que el navegador pinte: con `useEffect` se
    alcanza a ver un cuadro de la ventana a tamaño completo antes de
    encogerse.
  */
  useLayoutEffect(() => {
    const ventana = ventanaRef.current

    if (!abierto || ventana === null) {
      return
    }

    /*
      Borrar lo que haya dejado una salida a medio camino: si se reabre antes
      de que termine de cerrarse, la ventana todavía trae desenfoque y opacidad
      en cero, y reaparecería invisible.
    */
    ventana.style.filter = ''
    ventana.style.opacity = ''

    // 1. Posarla contra el botón, como hace la referencia con `top` y `right`.
    const disparador = anclaEn?.current

    if (anclaje === 'disparador' && disparador) {
      const caja = disparador.getBoundingClientRect()
      ventana.style.position = 'absolute'
      ventana.style.top = `${caja.top}px`
      ventana.style.right = `${window.innerWidth - caja.right}px`

      /*
        Acotar a la zona permitida. La referencia nunca se topa con esto
        porque su botón vive arriba a la derecha, con toda la pantalla por
        delante; aquí un disparador bajo o muy a la izquierda empuja la
        ventana fuera del viewport o encima de la navegación.

        Se mide después de posarla: hasta ese momento no se conoce su tamaño.
      */
      const { width: anchoVentana, height: altoVentana } = ventana.getBoundingClientRect()
      const zona = limites?.current?.getBoundingClientRect()
      const bordeIzquierdo = (zona?.left ?? 0) + MARGEN

      const topeInferior = window.innerHeight - altoVentana - MARGEN
      ventana.style.top = `${Math.max(MARGEN, Math.min(caja.top, topeInferior))}px`

      /* Se posa por la derecha, así que el borde izquierdo se corrige moviendo esa distancia. */
      const derecha = window.innerWidth - caja.right
      const izquierdaResultante = window.innerWidth - derecha - anchoVentana

      if (izquierdaResultante < bordeIzquierdo) {
        ventana.style.right = `${window.innerWidth - bordeIzquierdo - anchoVentana}px`
      }
    }

    if (!disparador) {
      return
    }

    // 2. Ya colocada, medirla: esta es la caja de destino real del FLIP.
    const destino = ventana.getBoundingClientRect()
    const origen = disparador.getBoundingClientRect()

    if (destino.width === 0 || destino.height === 0) {
      return
    }

    const escalaX = origen.width / destino.width
    const escalaY = origen.height / destino.height
    const desplazamientoX = origen.left + origen.width / 2 - (destino.left + destino.width / 2)
    const desplazamientoY = origen.top + origen.height / 2 - (destino.top + destino.height / 2)

    ventana.style.transition = 'none'
    ventana.style.transform = `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(${escalaX}, ${escalaY})`

    const cuadro = requestAnimationFrame(() => {
      ventana.style.transition = `transform ${DURACION_EXPANSION}ms var(--m3-curva-entrada)`
      ventana.style.transform = ''
    })

    return () => cancelAnimationFrame(cuadro)
    /*
      `montado` va en las dependencias y no es un descuido: la ventana se monta
      un render DESPUÉS de que `abierto` se pone en true, porque quien la monta
      es el efecto de salida. Sin `montado` aquí, este efecto corre una sola
      vez —cuando `ventanaRef` todavía es null— se sale por la puerta de
      atrás, y nunca se vuelve a ejecutar: adiós anclaje y adiós crecimiento.
    */
  }, [abierto, montado, anclaje, anclaEn, limites])

  /*
    Salida: el mismo FLIP al revés. Se mide la ventana en su sitio, se le pone
    la transformación que la calza sobre el botón y se deja que la transición
    la lleve hasta allá, mientras el desenfoque vuelve a subir y el velo se
    va. Al terminar, recién ahí se desmonta.

    El `transform: none` con reflujo forzado antes de medir no es adorno: si
    se cierra a mitad de la apertura, la ventana todavía trae transformación
    puesta y medirla daría la caja a medio camino, no la de destino. Limpiar,
    forzar el reflujo y medir devuelve siempre la caja real.
  */
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
    const duracion = sinMovimiento ? 0 : DURACION_EXPANSION

    if (!sinMovimiento && ventana !== null) {
      ventana.style.transition = 'none'
      ventana.style.transform = ''
      void ventana.offsetWidth

      const disparador = anclaEn?.current
      const destino = ventana.getBoundingClientRect()

      ventana.style.transition = `transform ${duracion}ms var(--m3-curva-entrada), filter ${duracion}ms ease, opacity ${duracion}ms ease`
      ventana.style.filter = 'blur(32px)'
      ventana.style.opacity = '0'

      if (disparador) {
        const origen = disparador.getBoundingClientRect()
        const escalaX = origen.width / destino.width
        const escalaY = origen.height / destino.height
        const desplazamientoX = origen.left + origen.width / 2 - (destino.left + destino.width / 2)
        const desplazamientoY = origen.top + origen.height / 2 - (destino.top + destino.height / 2)
        ventana.style.transform = `translate(${desplazamientoX}px, ${desplazamientoY}px) scale(${escalaX}, ${escalaY})`
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
      if (evento.key === 'Escape') {
        alCerrarRef.current()
      }
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

  /*
    Mientras cierra, las clases de entrada se quitan. Si se quedan, sus
    animaciones siguen mandando sobre `opacity` y `filter` y los estilos en
    línea de la salida no pintan nada.
  */
  const cerrando = !abierto

  return (
    /*
      El clic cierra solo cuando cae en el scrim mismo, no cuando burbujea
      desde dentro de la ventana: comparar `target` con `currentTarget` evita
      tener que parar la propagación desde el contenido.
    */
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
        className={`${cerrando ? '' : 'entra-con-desenfoque'} ${ANCHO[ancho]} max-w-full rounded-[32px] bg-[var(--m3-surface-bright)] focus:outline-none`}
      >
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl ${M3_TEXTO_SECUNDARIO}`}
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno">
              close
            </span>
          </button>
          <h2 className="font-titulo text-[28px] leading-tight font-semibold text-[var(--m3-on-surface)]">{titulo}</h2>
        </div>

        <div className="flex flex-col gap-4 px-8 pt-2 pb-8">{children}</div>
      </div>
    </div>
  )
}
