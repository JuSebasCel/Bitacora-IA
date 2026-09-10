import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell'
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useDirectorio } from '@/features/conferencias/directorio'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { normalizarTexto, privacidadEfectiva } from '@/features/conferencias/query'
import { useTaxonomia } from '@/features/taxonomia'
import { MensajeDeFormulario, Popover } from '@/shared/ui'
import { PESO_DE_ICONO, TAMANO_DE_ICONO } from './navegacion'

/*
  Reemplaza a la pantalla dedicada de Taxonomía (F9): nadie va a administrar
  vocabulario como una tarea aparte, así que lo pendiente de revisar (temas
  propuestos, fichas por validar) se anuncia donde se nota — una campana en la
  barra superior, visible desde cualquier pantalla — en vez de vivir en una
  sección de navegación propia que nadie sabía para qué era.

  Aprobar o rechazar un tema se resuelve aquí mismo, en el desplegable: es una
  decisión de una línea (¿este nombre es un tema nuevo de verdad?) y no
  necesita una pantalla propia. Validar una ficha sí necesita ver el fragmento
  completo, así que ese enlace lleva al detalle de la conferencia, donde ya
  existe el botón «Marcar como validada».

  La cuenta de fichas pendientes se recalcula cada vez que se abre el panel
  (`tick`), no en cada render: abrir la campana vuelve a montar el panel y sus datos, que es el momento
  natural para reflejar una ficha que se acaba de validar en otra pantalla.
*/

type PendienteDeValidar = {
  readonly idConferencia: string
  readonly titulo: string
  readonly cantidad: number
}

const CLASES_DE_ACCION =
  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors'

export function NotificacionesDropdown({ idUsuario }: { idUsuario: string }): ReactElement {
  const { visibles, fichas } = useConferenciasVisibles(idUsuario)
  const { eventos } = useDirectorio()
  const { taxonomia, aprobar, rechazar } = useTaxonomia()
  const [tick, setTick] = useState(0)
  const [aviso, setAviso] = useState<{ idPropuesta: string; mensaje: string } | null>(null)

  const pendientesDeValidar = useMemo<readonly PendienteDeValidar[]>(() => {
    void tick

    return visibles.flatMap((visible) => {
      const puedeValidar =
        visible.procedencia === 'propia' || privacidadEfectiva(visible).permitirValidarFichas

      if (!puedeValidar) {
        return []
      }

      const cantidad = fichas.filter(
        (ficha) => ficha.idConferencia === visible.conferencia.id && ficha.estadoDeValidacion !== 'validada',
      ).length

      return cantidad === 0
        ? []
        : [{ idConferencia: visible.conferencia.id, titulo: visible.conferencia.titulo, cantidad }]
    })
  }, [visibles, fichas, tick])

  const totalAvisos = taxonomia.propuestas.length + pendientesDeValidar.length

  function nombreDeEvento(idEvento: string): string {
    return eventos.find((evento) => evento.id === idEvento)?.nombre ?? 'Evento retirado'
  }

  function temaQueChoca(nombre: string): string | null {
    const comparable = normalizarTexto(nombre)

    return taxonomia.temas.find((tema) => normalizarTexto(tema.nombre) === comparable)?.nombre ?? null
  }

  function manejarAprobar(idPropuesta: string): void {
    const resultado = aprobar(idPropuesta)

    setAviso(resultado.ok ? null : { idPropuesta, mensaje: resultado.mensaje })
  }

  function manejarRechazar(idPropuesta: string): void {
    const resultado = rechazar(idPropuesta)

    setAviso(resultado.ok ? null : { idPropuesta, mensaje: resultado.mensaje })
  }

  return (
    <Popover
      alinear="derecha"
      etiquetaAccesible={totalAvisos === 0 ? 'Notificaciones' : `Notificaciones, ${totalAvisos} pendientes`}
      alAbrir={() => setTick((anterior) => anterior + 1)}
      boton={
        <span className="relative inline-flex">
          <BellIcon size={TAMANO_DE_ICONO} weight={PESO_DE_ICONO} aria-hidden="true" />
          {totalAvisos === 0 ? null : (
            <span
              aria-hidden="true"
              className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pendiente px-1 text-[10px] font-semibold text-panel"
            >
              {totalAvisos}
            </span>
          )}
        </span>
      }
    >
      {(cerrar) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-texto">Notificaciones</p>

          {totalAvisos === 0 ? (
            <p className="text-xs text-texto-tenue">Nada pendiente por ahora.</p>
          ) : (
            <div className="flex max-h-96 flex-col gap-4 overflow-y-auto">
              {taxonomia.propuestas.length === 0 ? null : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-texto-tenue">Temas propuestos</p>
                  {taxonomia.propuestas.map((propuesta) => {
                    const choque = temaQueChoca(propuesta.nombre)
                    const avisoDeLaPropuesta =
                      aviso !== null && aviso.idPropuesta === propuesta.id ? aviso.mensaje : null

                    return (
                      <div key={propuesta.id} className="rounded-md border border-filete bg-fondo p-2.5">
                        <p className="text-sm font-medium text-texto">{propuesta.nombre}</p>
                        <p className="text-xs text-texto-tenue">{nombreDeEvento(propuesta.idEvento)}</p>

                        {choque === null ? null : (
                          <p className="mt-1 text-xs leading-relaxed text-texto">
                            Parecido a «{choque}», que ya está en el pool.
                          </p>
                        )}

                        {avisoDeLaPropuesta === null ? null : (
                          <MensajeDeFormulario id={`notif-propuesta-${propuesta.id}`}>
                            {avisoDeLaPropuesta}
                          </MensajeDeFormulario>
                        )}

                        <div className="mt-2 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => manejarRechazar(propuesta.id)}
                            aria-label={`Rechazar la propuesta «${propuesta.nombre}»`}
                            className={`${CLASES_DE_ACCION} border-transparent text-texto-tenue hover:border-error-borde hover:text-error`}
                          >
                            <XIcon size={12} weight="bold" aria-hidden="true" />
                            Rechazar
                          </button>
                          <button
                            type="button"
                            onClick={() => manejarAprobar(propuesta.id)}
                            aria-label={`Aprobar la propuesta «${propuesta.nombre}»`}
                            className={`${CLASES_DE_ACCION} border-filete-fuerte bg-panel text-texto hover:border-acento hover:text-acento`}
                          >
                            <CheckIcon size={12} weight="bold" aria-hidden="true" />
                            Aprobar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {pendientesDeValidar.length === 0 ? null : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-texto-tenue">Fichas por validar</p>
                  {pendientesDeValidar.map((pendiente) => (
                    <Link
                      key={pendiente.idConferencia}
                      to={`/conferencias/${pendiente.idConferencia}`}
                      onClick={cerrar}
                      className="flex items-center justify-between gap-2 rounded-md border border-filete bg-fondo p-2.5 text-sm text-texto transition-colors hover:border-acento"
                    >
                      <span className="min-w-0 truncate">{pendiente.titulo}</span>
                      <span className="shrink-0 text-xs text-texto-tenue">
                        {pendiente.cantidad === 1 ? '1 ficha' : `${pendiente.cantidad} fichas`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Popover>
  )
}
