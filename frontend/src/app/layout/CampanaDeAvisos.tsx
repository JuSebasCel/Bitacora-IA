import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { invitacionesPendientes, respuestasSinVer } from '@/features/conferencias/query'
import { marcarRespuestaVista, responderComparticion } from '@/features/configuracion/comparticiones/repositorio'
import { Modal } from '@/shared/ui'

/*
  La campana del dock.

  Enseña dos cosas, y solo dos: lo que te compartieron y está esperando tu
  respuesta, y lo que contestaron a lo que compartiste tú. Nada más.

  Antes llevaba también los temas propuestos por el análisis y las fichas
  pendientes de validar. Las dos se fueron: la validación salió de la interfaz
  por decisión del usuario, y la curaduría de temas dejó de tener sentido
  cuando el análisis pasó a crear los temas que necesita en vez de proponerlos
  para que alguien los aprobara. Un aviso sobre algo que ya no se puede hacer
  es peor que no tener aviso.

  El panel es el modal anclado del sistema: crece desde la propia campana, con
  el velo y el desenfoque, en vez del flotante suelto de antes.

  Descartar una respuesta con la ✕ se guarda en la base
  (`comparticiones.respuesta_vista_por_dueno`). Antes se guardaba solo en la
  memoria de la página, y al recargar —o al volver a montarse la campana—
  reaparecían avisos que ya se habían quitado. Abrir la campana, en cambio,
  solo la calla (se recuerda en el navegador): mirar no es descartar.
*/

/* Cada cuánto vuelve a sonar mientras haya algo sin mirar: lo bastante espaciado para no volverse ruido. */
const INTERVALO_DE_TIMBRE_MS = 6_000

const CLAVE_DE_MIRADAS = 'menti-vault:avisos-mirados'

function leerMiradas(idUsuario: string): ReadonlySet<string> {
  try {
    const crudo = localStorage.getItem(`${CLAVE_DE_MIRADAS}:${idUsuario}`)
    const lista: unknown = crudo === null ? [] : JSON.parse(crudo)
    return new Set(Array.isArray(lista) ? lista.filter((clave): clave is string => typeof clave === 'string') : [])
  } catch {
    return new Set()
  }
}

function guardarMiradas(idUsuario: string, miradas: ReadonlySet<string>): void {
  try {
    localStorage.setItem(`${CLAVE_DE_MIRADAS}:${idUsuario}`, JSON.stringify([...miradas]))
  } catch {
    /* Sin almacenamiento la campana vuelve a sonar al recargar; nada más depende de esto. */
  }
}

export function CampanaDeAvisos({ idUsuario }: { idUsuario: string }): ReactElement {
  const { todas, recargar } = useConferenciasVisibles(idUsuario)
  const [abierta, setAbierta] = useState(false)
  const [vistas, setVistas] = useState<ReadonlySet<string>>(new Set())
  const [respondiendo, setRespondiendo] = useState<ReadonlySet<string>>(new Set())
  const boton = useRef<HTMLButtonElement>(null)

  /*
    Se vuelve a preguntar al abrir y cada treinta segundos.

    Sin esto habia que cambiar de pantalla para que una invitacion recien
    enviada apareciera: la consulta esta cacheada y nadie la invalidaba, asi
    que la campana mostraba lo que hubiera en la cache desde que se cargo la
    pantalla. Treinta segundos es un compromiso: una invitacion no es urgente,
    pero enterarse al dia siguiente tampoco sirve.
  */
  useEffect(() => {
    const intervalo = setInterval(recargar, 30_000)

    /*
      Y al volver a la pestana, sin esperar el turno del intervalo.

      Es el gesto real: se comparte desde una cuenta, se cambia a la otra, y lo
      primero que se hace es mirar la campana. Con solo el intervalo eso caia
      en cualquier punto de los treinta segundos, que es de donde salia la
      sensacion de que compartir "tardaba en llegar".
    */
    function alVolver(): void {
      if (document.visibilityState === 'visible') {
        recargar()
      }
    }

    document.addEventListener('visibilitychange', alVolver)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [recargar])

  const invitaciones = useMemo(() => invitacionesPendientes(todas, idUsuario), [todas, idUsuario])

  const respuestas = useMemo(
    () => respuestasSinVer(todas, idUsuario, (conf, inv) => vistas.has(`${conf}:${inv}`)),
    [todas, idUsuario, vistas],
  )

  const total = invitaciones.length + respuestas.length

  /*
    Mientras haya avisos sin mirar, la campana suena cada tanto: se balancea
    como colgada de su argolla y suelta una onda en el azul de acento. Abrirla
    es mirarlos, y ahí se calla hasta que llegue otro.

    Antes sonaba una sola vez, cuando subía el número: si en ese momento no
    se estaba mirando el dock, el aviso pasaba sin que nadie se enterara, y
    la campana quieta no se distinguía de una sin nada nuevo.

    Lo mirado se recuerda por aviso —cada invitación y cada respuesta— y en
    el navegador de quien mira: al recargar no vuelve a sonar por lo que ya
    se vio, pero un aviso nuevo sí.
  */
  const icono = useRef<HTMLSpanElement>(null)
  const onda = useRef<HTMLSpanElement>(null)

  const claves = useMemo(
    () => [
      ...invitaciones.map((conferencia) => `invitacion:${conferencia.id}`),
      ...respuestas.map((respuesta) => `respuesta:${respuesta.conferencia.id}:${respuesta.idInvitado}`),
    ],
    [invitaciones, respuestas],
  )
  const [miradas, setMiradas] = useState<ReadonlySet<string>>(() => leerMiradas(idUsuario))
  const sinMirar = claves.some((clave) => !miradas.has(clave))

  function marcarComoMiradas(): void {
    const todas = new Set([...miradas, ...claves])
    setMiradas(todas)
    guardarMiradas(idUsuario, todas)
  }

  useEffect(() => {
    const sinMovimiento =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!sinMirar || sinMovimiento || typeof icono.current?.animate !== 'function') {
      return
    }

    function sonar(): void {
      icono.current?.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(16deg)', offset: 0.15 },
          { transform: 'rotate(-13deg)', offset: 0.32 },
          { transform: 'rotate(9deg)', offset: 0.5 },
          { transform: 'rotate(-5deg)', offset: 0.68 },
          { transform: 'rotate(2deg)', offset: 0.84 },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 700, easing: 'ease-out' },
      )

      onda.current?.animate(
        [
          { transform: 'scale(0.7)', opacity: 0.55 },
          { transform: 'scale(1.9)', opacity: 0 },
        ],
        { duration: 750, easing: 'cubic-bezier(0.2, 0.6, 0.3, 1)' },
      )
    }

    sonar()
    const intervalo = setInterval(sonar, INTERVALO_DE_TIMBRE_MS)
    return () => clearInterval(intervalo)
  }, [sinMirar])

  async function responder(idConferencia: string, aceptar: boolean): Promise<void> {
    if (respondiendo.has(idConferencia)) {
      return
    }

    setRespondiendo((antes) => new Set(antes).add(idConferencia))
    await responderComparticion(idConferencia, idUsuario, aceptar ? 'aceptada' : 'rechazada')
    setRespondiendo((antes) => {
      const siguiente = new Set(antes)
      siguiente.delete(idConferencia)
      return siguiente
    })
    recargar()
  }

  return (
    <>
      {/*
        Cuadrado de 40px con el icono centrado, igual que el botón de plegar
        que tiene al lado: antes heredaba el disparador por defecto del
        popover, con su relleno horizontal, y quedaba descuadrada respecto a
        él.
      */}
      <button
        ref={boton}
        type="button"
        onClick={() => {
          recargar()
          marcarComoMiradas()
          setAbierta(true)
        }}
        aria-label={total === 0 ? 'Notificaciones' : `Notificaciones, ${total} sin leer`}
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-texto"
      >
        {/* La onda, quieta e invisible hasta que suena: `opacity-0` es su estado de reposo. */}
        <span
          ref={onda}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-[color:var(--bitacora-ilustracion-texto)] opacity-0"
        />

        {/* El eje del balanceo, arriba: una campana se mueve desde la argolla, no desde el centro. */}
        <span
          ref={icono}
          aria-hidden="true"
          className="material-symbols-rounded icono-contorno origin-top text-xl"
        >
          notifications
        </span>

        {total === 0 ? null : (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 size-2 rounded-full bg-acento ring-2 ring-fondo"
          />
        )}
      </button>

      <Modal
        abierto={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Novedades"
        ancho="angosto"
        anclaje="disparador"
        anclaEn={boton}
        /* Desde el dock se abre hacia la derecha: ver la nota en `MenuDeCuenta`. */
        crecerHacia="derecha"
      >
        {total === 0 ? (
          <p className="pb-2 text-base text-texto-tenue">Nada nuevo por ahora.</p>
        ) : null}

        {/*
          Cada aviso sobre el fondo de la página, más hondo que el del panel,
          con un filete: sobre el mismo gris tenue del panel se fundían con él
          y todo el contenido se leía como una sola mancha blanda.
        */}
        {invitaciones.length === 0 ? null : (
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-sm font-medium text-texto-tenue">Te compartieron</h3>

            {invitaciones.map((conferencia) => (
              <div key={conferencia.id} className="flex flex-col gap-3 rounded-[20px] bg-fondo p-4 shadow-[inset_0_0_0_1px_var(--bitacora-filete)]">
                <div className="flex min-w-0 flex-col">
                  <p className="text-base leading-snug text-texto">{conferencia.titulo}</p>
                  <p className="truncate text-sm text-texto-tenue">
                    {conferencia.ponente} · {conferencia.evento}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={respondiendo.has(conferencia.id)}
                    onClick={() => void responder(conferencia.id, true)}
                    className="h-10 flex-1 cursor-pointer rounded-full bg-acento text-sm font-medium text-acento-contraste transition-opacity disabled:opacity-50"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    disabled={respondiendo.has(conferencia.id)}
                    onClick={() => void responder(conferencia.id, false)}
                    className="h-10 flex-1 cursor-pointer rounded-full bg-acento-tenue text-sm text-texto transition-colors hover:bg-ilustracion disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {respuestas.length === 0 ? null : (
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-sm font-medium text-texto-tenue">Respondieron</h3>

            {respuestas.map((respuesta) => (
              <div
                key={`${respuesta.conferencia.id}:${respuesta.idInvitado}`}
                className="flex items-center gap-3 rounded-[20px] bg-fondo p-4 shadow-[inset_0_0_0_1px_var(--bitacora-filete)]"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-rounded icono-relleno shrink-0 text-xl text-texto-tenue"
                >
                  {respuesta.aceptada ? 'check_circle' : 'cancel'}
                </span>

                <p className="min-w-0 flex-1 text-sm text-texto">
                  <span className="font-medium">{respuesta.quien}</span>{' '}
                  {respuesta.aceptada ? 'aceptó' : 'rechazó'}{' '}
                  <span className="text-texto-tenue">«{respuesta.conferencia.titulo}»</span>
                </p>

                <button
                  type="button"
                  aria-label="Descartar el aviso"
                  onClick={() => {
                    setVistas((antes) =>
                      new Set(antes).add(`${respuesta.conferencia.id}:${respuesta.idInvitado}`),
                    )
                    void marcarRespuestaVista(respuesta.conferencia.id, respuesta.idInvitado).then(recargar)
                  }}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-ilustracion hover:text-texto"
                >
                  <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-lg">
                    close
                  </span>
                </button>
              </div>
            ))}
          </section>
        )}
      </Modal>
    </>
  )
}
