import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import type { Conferencia, PrivacidadDeComparticion } from '@/features/conferencias/data'
import { Modal, SelectorDeOpciones } from '@/shared/ui'
import type { OpcionDeSelector } from '@/shared/ui'
import { listarPerfiles } from '../comparticiones/repositorio'
import type { PerfilDelGrupo } from '../comparticiones/repositorio'
import { useComparticiones } from '../useComparticiones'

/*
  Compartir varias conferencias de una vez.

  **Dos columnas y un trasvase:** a la izquierda lo que tienes, a la derecha lo
  que se va a enviar. Una conferencia se pasa de un lado a otro pulsándola, y
  la tarjeta viaja —no desaparece de un sitio y aparece en otro— porque el
  mismo `layoutId` en las dos listas deja que `motion` interpole la posición.
  Ver de dónde sale cada cosa es lo que hace que enviar un puñado de charlas a
  alguien no dé miedo.

  El destinatario va primero y no al final: decide qué tiene sentido enviar, y
  preguntarlo después obligaría a rehacer la selección al cambiarlo.

  Los permisos son dos, no cuatro. `compartirFichasPendientes` y
  `permitirValidarFichas` describen el flujo de validación, que salió de la
  interfaz: ofrecerlos aquí sería pedir una decisión sobre algo que ya no se
  ve. Se envían en sus valores por defecto para no esconderle fichas a nadie.
*/

const PRIVACIDAD_INICIAL: PrivacidadDeComparticion = {
  compartirEtiquetas: false,
  /* En `true` a propósito: con la validación fuera de la vista, filtrar por ella escondería fichas sin explicación. */
  compartirFichasPendientes: true,
  permitirValidarFichas: false,
  permitirRecompartir: false,
}

type Permiso = {
  readonly clave: 'compartirEtiquetas' | 'permitirRecompartir'
  readonly etiqueta: string
  readonly explicacion: string
}

const PERMISOS: readonly Permiso[] = [
  {
    clave: 'compartirEtiquetas',
    etiqueta: 'Enviar también mis etiquetas',
    explicacion: 'Verán cómo tienes organizada cada charla.',
  },
  {
    clave: 'permitirRecompartir',
    etiqueta: 'Dejar que la compartan',
    explicacion: 'Podrán pasársela a otras personas por su cuenta.',
  },
]

function Columna({
  titulo, conteo, children,
}: {
  titulo: string
  conteo: number
  children: ReactNode
}): ReactElement {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <h3 className="flex items-baseline gap-2 px-1 text-sm font-medium text-texto-tenue">
        {titulo}
        <span className="coordenada text-xs">{conteo}</span>
      </h3>

      <div className="sin-barra-de-scroll flex max-h-72 min-h-40 flex-col gap-1.5 overflow-y-auto rounded-[20px] bg-panel p-2">
        {children}
      </div>
    </section>
  )
}

/*
  Va fuera del componente a propósito. Definida dentro, React la trataría como
  un tipo nuevo en cada render y la desmontaría y volvería a montar — que es
  justo lo que impide a `layoutId` interpolar la posición entre las dos
  columnas, o sea la animación entera.
*/
function Tarjeta({
  conferencia,
  enviada,
  animada,
  alPulsar,
}: {
  conferencia: Conferencia
  enviada: boolean
  animada: boolean
  alPulsar: () => void
}): ReactElement {
  return (
    <motion.button
      layoutId={conferencia.id}
      {...(animada
        ? { layout: true as const, transition: { duration: 0.35, ease: [0.37, 0.35, 0, 1] as const } }
        : {})}
      type="button"
      onClick={alPulsar}
      className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl bg-fondo px-4 py-2 text-left transition-colors hover:bg-acento-tenue"
    >
      <span
        aria-hidden="true"
        className="material-symbols-rounded icono-contorno shrink-0 text-lg text-texto-tenue"
      >
        {enviada ? 'remove' : 'add'}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm text-texto">{conferencia.titulo}</span>
        <span className="truncate text-xs text-texto-tenue">{conferencia.evento}</span>
      </span>
    </motion.button>
  )
}

export type PropsModalDeCompartir = {
  abierto: boolean
  alCerrar: () => void
  /** Las que se pueden enviar: propias, o ajenas con permiso para recompartir. */
  conferencias: readonly Conferencia[]
  idUsuario: string
  anclaEn?: RefObject<HTMLElement | null>
  limites?: RefObject<HTMLElement | null>
}

export function ModalDeCompartir({
  abierto,
  alCerrar,
  conferencias,
  idUsuario,
  anclaEn,
  limites,
}: PropsModalDeCompartir): ReactElement {
  const { invitar } = useComparticiones()
  const reducirMovimiento = useReducedMotion()

  const [perfiles, setPerfiles] = useState<readonly PerfilDelGrupo[]>([])
  const [idInvitado, setIdInvitado] = useState('')
  const [elegidas, setElegidas] = useState<readonly string[]>([])
  const [privacidad, setPrivacidad] = useState<PrivacidadDeComparticion>(PRIVACIDAD_INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviadas, setEnviadas] = useState(0)

  useEffect(() => {
    if (!abierto) {
      return
    }

    setIdInvitado('')
    setElegidas([])
    setPrivacidad(PRIVACIDAD_INICIAL)
    setError(null)
    setEnviadas(0)

    void listarPerfiles().then((resultado) => {
      if (resultado.ok) {
        /* Uno mismo no es un destinatario posible. */
        setPerfiles(resultado.datos.filter((perfil) => perfil.id !== idUsuario))
      }
    })
  }, [abierto, idUsuario])

  const disponibles = conferencias.filter((conferencia) => !elegidas.includes(conferencia.id))
  const seleccionadas = elegidas
    .map((id) => conferencias.find((conferencia) => conferencia.id === id))
    .filter((conferencia): conferencia is Conferencia => conferencia !== undefined)

  const opcionesDePersona: readonly OpcionDeSelector<string>[] = perfiles.map((perfil) => ({
    valor: perfil.id,
    etiqueta: perfil.nombre === '' ? perfil.correo : perfil.nombre,
  }))

  function alternar(idConferencia: string): void {
    setError(null)
    setElegidas((anteriores) =>
      anteriores.includes(idConferencia)
        ? anteriores.filter((id) => id !== idConferencia)
        : [...anteriores, idConferencia],
    )
  }

  async function enviar(): Promise<void> {
    if (enviando || idInvitado === '' || seleccionadas.length === 0) {
      return
    }

    setEnviando(true)
    setError(null)

    /*
      Se envían de una en una y se cuenta lo que llegó. Un fallo a mitad no
      deshace lo anterior: compartir no es una transacción, y decirle a alguien
      que no se envió nada cuando tres sí salieron sería mentirle.
    */
    let logradas = 0
    let ultimoFallo: string | null = null

    for (const conferencia of seleccionadas) {
      const resultado = await invitar(conferencia, idInvitado, true, privacidad)

      if (resultado.ok) {
        logradas += 1
      } else {
        ultimoFallo = resultado.mensaje
      }
    }

    setEnviando(false)
    setEnviadas(logradas)

    if (logradas === seleccionadas.length) {
      alCerrar()
      return
    }

    setElegidas(seleccionadas.slice(logradas).map((conferencia) => conferencia.id))
    setError(ultimoFallo)
  }

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Compartir conferencias"
      ancho="normal"
      {...(anclaEn === undefined ? {} : { anclaje: 'disparador' as const, anclaEn })}
      {...(limites === undefined ? {} : { limites })}
    >
      <div className="flex flex-col gap-2">
        <p className="px-1 text-sm font-medium text-texto-tenue">Con quién</p>
        <SelectorDeOpciones
          etiquetaAccesible="Destinatario"
          icono="person"
          vacio={perfiles.length === 0 ? 'No hay nadie más en el grupo' : 'Elige a una persona'}
          deshabilitado={perfiles.length === 0}
          valor={idInvitado}
          opciones={opcionesDePersona}
          alCambiar={setIdInvitado}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Columna titulo="Tus conferencias" conteo={disponibles.length}>
          <AnimatePresence initial={false}>
            {disponibles.length === 0 ? (
              <p className="px-3 py-4 text-sm text-texto-tenue">Están todas al otro lado.</p>
            ) : (
              disponibles.map((conferencia) => (
                <Tarjeta
                  key={conferencia.id}
                  conferencia={conferencia}
                  enviada={false}
                  animada={!reducirMovimiento}
                  alPulsar={() => alternar(conferencia.id)}
                />
              ))
            )}
          </AnimatePresence>
        </Columna>

        <Columna titulo="Se enviarán" conteo={seleccionadas.length}>
          <AnimatePresence initial={false}>
            {seleccionadas.length === 0 ? (
              <p className="px-3 py-4 text-sm text-texto-tenue">
                Pulsa una conferencia de la izquierda para ponerla aquí.
              </p>
            ) : (
              seleccionadas.map((conferencia) => (
                <Tarjeta
                  key={conferencia.id}
                  conferencia={conferencia}
                  enviada
                  animada={!reducirMovimiento}
                  alPulsar={() => alternar(conferencia.id)}
                />
              ))
            )}
          </AnimatePresence>
        </Columna>
      </div>

      <div className="flex flex-col gap-2">
        {PERMISOS.map((permiso) => (
          <label
            key={permiso.clave}
            className="flex cursor-pointer items-start gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-acento-tenue"
          >
            <input
              type="checkbox"
              checked={privacidad[permiso.clave]}
              onChange={(cambio) =>
                setPrivacidad((anterior) => ({ ...anterior, [permiso.clave]: cambio.target.checked }))
              }
              className="mt-1 size-4 shrink-0 accent-[var(--bitacora-acento)]"
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-base text-texto">{permiso.etiqueta}</span>
              <span className="text-sm text-texto-tenue">{permiso.explicacion}</span>
            </span>
          </label>
        ))}
      </div>

      {error === null ? null : (
        <p role="alert" className="px-1 text-sm text-error">
          {enviadas > 0 ? `Se enviaron ${enviadas} y luego falló: ${error}` : error}
        </p>
      )}

      <button
        type="button"
        disabled={enviando || idInvitado === '' || seleccionadas.length === 0}
        onClick={() => {
          void enviar()
        }}
        className="h-12 cursor-pointer rounded-full bg-acento text-base font-medium text-acento-contraste transition-opacity disabled:cursor-default disabled:opacity-40"
      >
        {enviando
          ? 'Enviando…'
          : seleccionadas.length === 0
            ? 'Elige qué compartir'
            : `Compartir ${seleccionadas.length} ${seleccionadas.length === 1 ? 'conferencia' : 'conferencias'}`}
      </button>
    </Modal>
  )
}
