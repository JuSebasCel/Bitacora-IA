import type { PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { moverElemento, redimensionarElemento } from '../geometria/geometria'
import type { Rectangulo } from '../geometria/geometria'
import { ElementoEnLienzo } from './ElementoEnLienzo'
import type { ElementoDePlantilla } from '../data'

export type PropsLienzoDePlantilla = {
  elementos: readonly ElementoDePlantilla[]
  /** En `false` (miniatura de tarjeta) no registra ningún evento de puntero. */
  interactivo?: boolean
  idSeleccionado?: string | null
  alSeleccionar?: (id: string | null) => void
  alCambiarPosicion?: (idElemento: string, posicion: Rectangulo) => void
}

type Arrastre = {
  readonly idElemento: string
  readonly modo: 'mover' | 'redimensionar'
  readonly posicionInicial: Rectangulo
  readonly clientXInicial: number
  readonly clientYInicial: number
  readonly anchoLienzoPx: number
  readonly altoLienzoPx: number
}

/*
  Lienzo de una página: contiene los elementos de la plantilla, posicionados
  con `%` (el lienzo es el marco de referencia, así que no hace falta medir
  nada en JS para eso). La única lectura de píxeles ocurre al *iniciar* un
  arrastre — una sola llamada a `getBoundingClientRect()` para poder convertir
  el movimiento del puntero, en píxeles, a una fracción del lienzo. El resto
  del arrastre corre sobre esa medición inicial, no sobre mediciones repetidas.

  En modo no interactivo (miniatura de tarjeta) no se registra ningún
  manejador de puntero: quien lo usa así lo envuelve en su propio
  `transform: scale(...)`.
*/
export function LienzoDePlantilla({
  elementos,
  interactivo = true,
  idSeleccionado = null,
  alSeleccionar,
  alCambiarPosicion,
}: PropsLienzoDePlantilla): ReactElement {
  const refContenedor = useRef<HTMLDivElement>(null)
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)

  useEffect(() => {
    if (arrastre === null) {
      return
    }

    function alMoverPuntero(evento: PointerEvent): void {
      if (arrastre === null) {
        return
      }

      const deltaX = (evento.clientX - arrastre.clientXInicial) / arrastre.anchoLienzoPx
      const deltaY = (evento.clientY - arrastre.clientYInicial) / arrastre.altoLienzoPx

      const nuevaPosicion =
        arrastre.modo === 'mover'
          ? moverElemento(arrastre.posicionInicial, deltaX, deltaY)
          : redimensionarElemento(arrastre.posicionInicial, deltaX, deltaY)

      alCambiarPosicion?.(arrastre.idElemento, nuevaPosicion)
    }

    function alSoltarPuntero(): void {
      setArrastre(null)
    }

    window.addEventListener('pointermove', alMoverPuntero)
    window.addEventListener('pointerup', alSoltarPuntero)
    return () => {
      window.removeEventListener('pointermove', alMoverPuntero)
      window.removeEventListener('pointerup', alSoltarPuntero)
    }
  }, [arrastre, alCambiarPosicion])

  function iniciarArrastre(
    elemento: ElementoDePlantilla,
    modo: Arrastre['modo'],
    evento: ReactPointerEvent,
  ): void {
    if (!interactivo) {
      return
    }

    alSeleccionar?.(elemento.id)

    const rectLienzo = refContenedor.current?.getBoundingClientRect()
    if (rectLienzo === undefined || rectLienzo.width === 0 || rectLienzo.height === 0) {
      return
    }

    setArrastre({
      idElemento: elemento.id,
      modo,
      posicionInicial: elemento.posicion,
      clientXInicial: evento.clientX,
      clientYInicial: evento.clientY,
      anchoLienzoPx: rectLienzo.width,
      altoLienzoPx: rectLienzo.height,
    })
  }

  return (
    <div
      ref={refContenedor}
      data-testid="lienzo-de-plantilla"
      onClick={(evento) => {
        /*
          Sin este chequeo, el click que un navegador sintetiza tras soltar el
          puntero sobre un elemento hijo burbujea hasta aquí y deselecciona lo
          que se acaba de seleccionar. Solo el fondo (target === currentTarget)
          debe deseleccionar.
        */
        if (interactivo && evento.target === evento.currentTarget) {
          alSeleccionar?.(null)
        }
      }}
      className="relative aspect-[8.5/11] w-full overflow-hidden rounded-md border border-filete-fuerte bg-panel"
    >
      {elementos.map((elemento) => (
        <ElementoEnLienzo
          key={elemento.id}
          elemento={elemento}
          interactivo={interactivo}
          seleccionado={interactivo && elemento.id === idSeleccionado}
          onPointerDownCuerpo={(evento) => iniciarArrastre(elemento, 'mover', evento)}
          onPointerDownMango={(evento) => iniciarArrastre(elemento, 'redimensionar', evento)}
        />
      ))}
    </div>
  )
}
