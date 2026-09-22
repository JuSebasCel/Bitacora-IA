/*
  Avisar de que algo largo terminó: un sonido corto y una marca en la pestaña.

  Un análisis tarda minutos y una memoria decenas de segundos, y en ese
  tiempo lo normal es irse a otra pestaña. Sin aviso, había que volver a
  mirar cada tanto a ver si ya estaba.

  **El sonido se sintetiza, no se descarga.** Dos notas de onda triangular,
  la segunda una quinta por encima, de 70 ms cada una y con caída rápida:
  seco, sin eco, y lo bastante agudo para oírse con música de fondo. Un
  archivo de audio sería una petición más y un recurso que mantener para
  algo que son diez líneas de Web Audio.

  **La pestaña cambia título e icono** hasta que se vuelve a ella: el título
  para quien tiene pocas pestañas y lo lee, y un punto sobre el icono para
  quien tiene tantas que el título ya no se ve.

  Quien llama decide si avisar (la preferencia vive en la cuenta, y esto no
  sabe de cuentas).
*/

let contexto: AudioContext | null = null

function sonar(): void {
  try {
    contexto ??= new AudioContext()
    const ahora = contexto.currentTime

    for (const [indice, frecuencia] of [880, 1320].entries()) {
      const oscilador = contexto.createOscillator()
      const volumen = contexto.createGain()
      const inicio = ahora + indice * 0.09

      oscilador.type = 'triangle'
      oscilador.frequency.value = frecuencia
      volumen.gain.setValueAtTime(0.0001, inicio)
      volumen.gain.exponentialRampToValueAtTime(0.35, inicio + 0.008)
      volumen.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.07)

      oscilador.connect(volumen).connect(contexto.destination)
      oscilador.start(inicio)
      oscilador.stop(inicio + 0.08)
    }
  } catch {
    /* Sin Web Audio (o bloqueado por el navegador) queda la marca en la pestaña. */
  }
}

let tituloOriginal: string | null = null
let iconoOriginal: string | null = null

function enlaceDelIcono(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

/*
  El icono con un punto: el mismo dial, más un círculo en la esquina. Se
  dibuja aparte en vez de reutilizar el SVG del icono porque ese sigue el
  tema del navegador con una media query, y dentro de un `data:` no siempre
  se respeta; aquí el punto va sobre un fondo neutro que se ve en los dos.
*/
const ICONO_CON_AVISO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <defs><mask id="d"><rect width="32" height="32" rx="9" fill="white"/>
      <circle cx="16" cy="16" r="8.25" fill="none" stroke="black" stroke-width="2.75"/>
      <circle cx="16" cy="16" r="2.4" fill="black"/>
      <path d="M16 16 L20.6 11.4" stroke="black" stroke-width="2.75" stroke-linecap="round"/></mask></defs>
      <rect width="32" height="32" rx="9" fill="#8a8a8a" mask="url(#d)"/>
      <circle cx="25" cy="7" r="7" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
    </svg>`,
  )

function restaurarPestana(): void {
  if (tituloOriginal !== null) {
    document.title = tituloOriginal
    tituloOriginal = null
  }

  const enlace = enlaceDelIcono()

  if (enlace !== null && iconoOriginal !== null) {
    enlace.href = iconoOriginal
    iconoOriginal = null
  }
}

function marcarPestana(texto: string): void {
  /*
    Si la pestaña está a la vista, la marca sobra: se está mirando la
    pantalla donde el resultado ya apareció. El sonido sí suena.
  */
  if (document.visibilityState === 'visible' && document.hasFocus()) {
    return
  }

  tituloOriginal ??= document.title
  document.title = `● ${texto} · ${tituloOriginal}`

  const enlace = enlaceDelIcono()

  if (enlace !== null) {
    iconoOriginal ??= enlace.href
    enlace.href = ICONO_CON_AVISO
  }

  window.addEventListener('focus', restaurarPestana, { once: true })
}

/** Suena y marca la pestaña. `texto` es lo que terminó: "Análisis listo", "Memoria lista". */
export function avisarTermino(texto: string): void {
  sonar()
  marcarPestana(texto)
}
