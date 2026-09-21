import type { MouseEvent, ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { formatearTimestamp } from '../data'
import { urlDelAudio } from '../repositorio'

/*
  El tramo de audio de una ficha: lo que se escuchó en ese momento de la
  charla, del segundo en que empieza la ficha al segundo en que termina.

  La barra mide el tramo, no la charla entera: en un audio de noventa
  minutos, veinte segundos serían una raya invisible. Al llegar al final se
  detiene y vuelve al principio del tramo, listo para escucharlo otra vez;
  pulsar la barra salta dentro del mismo tramo.

  El audio no se pide hasta el primer play: la mayoría de las fichas se leen
  sin escucharse, y firmar y descargar el archivo de cada una que se abre
  sería gastar red en lo que casi nunca se usa. `preload="none"` por lo
  mismo.
*/
export type PropsFragmentoDeAudio = {
  idDueno: string
  idConferencia: string
  inicio: number
  fin: number
}

type Estado = 'quieto' | 'cargando' | 'sonando' | 'sin-audio'

export function FragmentoDeAudio({ idDueno, idConferencia, inicio, fin }: PropsFragmentoDeAudio): ReactElement {
  const audio = useRef<HTMLAudioElement>(null)
  const [estado, setEstado] = useState<Estado>('quieto')
  const [posicion, setPosicion] = useState(inicio)
  /* Un tramo de largo cero no se puede dibujar ni recorrer: se le da un segundo. */
  const duracion = Math.max(1, fin - inicio)

  /* Otra ficha, otro tramo: se para lo que sonaba y se vuelve al principio. */
  useEffect(() => {
    audio.current?.pause()
    setEstado((anterior) => (anterior === 'sin-audio' ? anterior : 'quieto'))
    setPosicion(inicio)
  }, [inicio, fin])

  async function alternar(): Promise<void> {
    const elemento = audio.current
    if (elemento === null) {
      return
    }

    if (estado === 'sonando') {
      elemento.pause()
      setEstado('quieto')
      return
    }

    if (elemento.src === '') {
      setEstado('cargando')
      const url = await urlDelAudio(idDueno, idConferencia)
      if (url === null) {
        setEstado('sin-audio')
        return
      }
      elemento.src = url
    }

    if (elemento.currentTime < inicio || elemento.currentTime >= fin) {
      elemento.currentTime = inicio
    }

    try {
      await elemento.play()
      setEstado('sonando')
    } catch {
      setEstado('sin-audio')
    }
  }

  function alAvanzar(): void {
    const elemento = audio.current
    if (elemento === null) {
      return
    }

    if (elemento.currentTime >= fin) {
      elemento.pause()
      elemento.currentTime = inicio
      setPosicion(inicio)
      setEstado('quieto')
      return
    }

    setPosicion(elemento.currentTime)
  }

  function saltar(evento: MouseEvent<HTMLDivElement>): void {
    const elemento = audio.current
    if (elemento === null || elemento.src === '') {
      return
    }

    const caja = evento.currentTarget.getBoundingClientRect()
    const proporcion = Math.min(1, Math.max(0, (evento.clientX - caja.left) / caja.width))
    elemento.currentTime = inicio + proporcion * duracion
    setPosicion(elemento.currentTime)
  }

  const avance = Math.min(1, Math.max(0, (posicion - inicio) / duracion))

  if (estado === 'sin-audio') {
    return (
      <p className="rounded-full bg-acento-tenue px-4 py-2 text-sm text-texto-tenue">
        No hay audio disponible para esta conferencia.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-full bg-acento-tenue py-1.5 pr-4 pl-1.5">
      <audio ref={audio} preload="none" onTimeUpdate={alAvanzar} onEnded={() => setEstado('quieto')} />

      <button
        type="button"
        onClick={() => void alternar()}
        disabled={estado === 'cargando'}
        aria-label={estado === 'sonando' ? 'Pausar el fragmento' : 'Escuchar el fragmento'}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-acento text-acento-contraste disabled:cursor-wait"
      >
        <span
          aria-hidden="true"
          className={`material-symbols-rounded icono-relleno text-xl ${estado === 'cargando' ? 'animate-spin' : ''}`}
        >
          {estado === 'cargando' ? 'progress_activity' : estado === 'sonando' ? 'pause' : 'play_arrow'}
        </span>
      </button>

      <div
        role="slider"
        aria-label="Posición dentro del fragmento"
        aria-valuemin={inicio}
        aria-valuemax={fin}
        aria-valuenow={Math.round(posicion)}
        tabIndex={-1}
        onClick={saltar}
        className="relative h-6 flex-1 cursor-pointer"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-fondo" />
        <div
          style={{ width: `${avance * 100}%` }}
          className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-acento"
        />
      </div>

      <span className="coordenada shrink-0 text-sm text-texto-tenue">
        {formatearTimestamp(posicion)} / {formatearTimestamp(fin)}
      </span>
    </div>
  )
}
