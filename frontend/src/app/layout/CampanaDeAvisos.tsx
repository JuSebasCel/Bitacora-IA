import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { invitacionesPendientes, respuestasSinVer } from '@/features/conferencias/query'
import { responderComparticion } from '@/features/configuracion/comparticiones/repositorio'
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

  Lo ya leído se recuerda en memoria y no en la base: marcar la fila obligaría
  a escribir sobre la compartición cada vez que se abre la campana, y un aviso
  visto no es un hecho del dominio que merezca un viaje.
*/

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
          setAbierta(true)
        }}
        aria-label={total === 0 ? 'Notificaciones' : `Notificaciones, ${total} sin leer`}
        className="relative mt-2 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-texto"
      >
        <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-xl">
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
      >
        {total === 0 ? (
          <p className="pb-2 text-base text-texto-tenue">Nada nuevo por ahora.</p>
        ) : null}

        {invitaciones.length === 0 ? null : (
          <section className="flex flex-col gap-2">
            <h3 className="px-1 text-sm font-medium text-texto-tenue">Te compartieron</h3>

            {invitaciones.map((conferencia) => (
              <div key={conferencia.id} className="flex flex-col gap-3 rounded-[20px] bg-acento-tenue p-4">
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
                    className="h-10 flex-1 cursor-pointer rounded-full text-sm text-texto transition-colors hover:bg-ilustracion disabled:opacity-50"
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
                className="flex items-center gap-3 rounded-[20px] bg-acento-tenue p-4"
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
                  onClick={() =>
                    setVistas((antes) =>
                      new Set(antes).add(`${respuesta.conferencia.id}:${respuesta.idInvitado}`),
                    )
                  }
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
