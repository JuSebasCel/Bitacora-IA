import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash'
import type { FormEvent, ReactElement } from 'react'
import { useId, useState } from 'react'
import type { Evento } from '@/features/conferencias/data'
import { Button, EstadoVacio, Field, Input, Insignia, MensajeDeFormulario, Select } from '@/shared/ui'
import type { Tema } from '../data'
import type { ResultadoDeAccion } from '../useTaxonomia'

/*
  El pool general de temas, con la activación por evento incorporada como una
  columna de casillas.

  El plan del módulo preveía `ListaDeTemas` y `SelectorDeTemasPorEvento` por
  separado; se unieron aquí porque, separados, el pool completo se dibujaba dos
  veces en la misma pantalla y quien mirara no tenía forma de saber que las dos
  listas eran la misma cosa. Estar activo en un evento no es otra entidad: es un
  atributo del tema visto desde ese evento, y una sola lista con un selector de
  evento arriba lo dice sin explicarlo.

  Lo que sí hay que dejar claro es el alcance de cada acción, porque en la misma
  fila conviven una acción global (renombrar, eliminar: afectan a todos los
  eventos) y una acotada al evento elegido (la casilla). Por eso la casilla vive
  pegada al selector de evento visualmente, en el borde izquierdo, y las
  acciones globales se van al borde opuesto.
*/

/** Cuántas fichas y conferencias referencian un tema. Explica por qué no se puede eliminar. */
export type UsoDeTema = {
  readonly fichas: number
  readonly conferencias: number
}

export type PropsListaDeTemas = {
  temas: readonly Tema[]
  eventos: readonly Evento[]
  /** Evento cuya activación se está editando. Null solo si el directorio no tiene ninguno. */
  idEvento: string | null
  idsActivos: ReadonlySet<string>
  usoPorTema: ReadonlyMap<string, UsoDeTema>
  alElegirEvento: (idEvento: string) => void
  alAlternar: (idTema: string, activarlo: boolean) => ResultadoDeAccion
  alRenombrar: (idTema: string, nombre: string) => ResultadoDeAccion
  alEliminar: (idTema: string) => ResultadoDeAccion
  alPedirTemaNuevo: () => void
}

type Aviso = {
  readonly idTema: string
  readonly mensaje: string
}

const CLASES_DE_ACCION =
  'rounded-md p-1.5 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento'

/*
  El uso se muestra siempre, no solo cuando falla el borrado: quien administra
  necesita saber qué cuesta tocar un tema antes de intentarlo, no después.
*/
function textoDeUso(uso: UsoDeTema | undefined): string {
  if (uso === undefined) {
    return 'Sin fichas ni conferencias que lo usen'
  }

  const partes: string[] = []

  if (uso.fichas > 0) {
    partes.push(uso.fichas === 1 ? '1 ficha' : `${uso.fichas} fichas`)
  }

  if (uso.conferencias > 0) {
    partes.push(uso.conferencias === 1 ? '1 conferencia' : `${uso.conferencias} conferencias`)
  }

  return `En uso por ${partes.join(' y ')}`
}

export function ListaDeTemas({
  temas,
  eventos,
  idEvento,
  idsActivos,
  usoPorTema,
  alElegirEvento,
  alAlternar,
  alRenombrar,
  alEliminar,
  alPedirTemaNuevo,
}: PropsListaDeTemas): ReactElement {
  const idTitulo = useId()
  const idSelector = useId()
  const [idEnEdicion, setIdEnEdicion] = useState<string | null>(null)
  const [borrador, setBorrador] = useState('')
  /*
    Un solo aviso a la vez, y atado a la fila que lo produjo: las acciones se
    disparan de una en una, así que arrastrar el error de una fila mientras se
    trabaja en otra solo confundiría sobre a qué tema se refiere.
  */
  const [aviso, setAviso] = useState<Aviso | null>(null)

  const nombreDelEvento = eventos.find((evento) => evento.id === idEvento)?.nombre ?? ''

  function empezarARenombrar(tema: Tema): void {
    setIdEnEdicion(tema.id)
    setBorrador(tema.nombre)
    setAviso(null)
  }

  function cancelarRenombre(): void {
    setIdEnEdicion(null)
    setAviso(null)
  }

  function confirmarRenombre(tema: Tema, envio: FormEvent<HTMLFormElement>): void {
    envio.preventDefault()

    const resultado = alRenombrar(tema.id, borrador)

    if (resultado.ok) {
      setIdEnEdicion(null)
      setAviso(null)
      return
    }

    setAviso({ idTema: tema.id, mensaje: resultado.mensaje })
  }

  /*
    Sin confirmación previa a propósito: el dominio ya frena el único borrado
    que hace daño (un tema en uso, que devuelve `TAX_TEMA_EN_USO`), y un tema
    sin uso se vuelve a crear con el mismo nombre y el mismo id, porque el id
    se deriva del nombre. Preguntar "¿seguro?" en un caso reversible entrena a
    despachar el aviso sin leerlo, y entonces no protege el caso que sí importa.
  */
  function intentarEliminar(tema: Tema): void {
    const resultado = alEliminar(tema.id)

    setAviso(resultado.ok ? null : { idTema: tema.id, mensaje: resultado.mensaje })
  }

  function alternar(tema: Tema, activarlo: boolean): void {
    const resultado = alAlternar(tema.id, activarlo)

    setAviso(resultado.ok ? null : { idTema: tema.id, mensaje: resultado.mensaje })
  }

  return (
    <section
      aria-labelledby={idTitulo}
      className="flex flex-col overflow-hidden rounded-md border border-filete bg-panel"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={idTitulo} className="text-sm font-semibold text-texto">
              Pool general de temas
            </h2>
            <Insignia tono="neutro">{temas.length === 1 ? '1 tema' : `${temas.length} temas`}</Insignia>
          </div>
          <p className="mt-1.5 max-w-prose text-xs leading-relaxed text-texto-tenue">
            El vocabulario que comparten todos los eventos. Renombrar o eliminar un tema afecta a
            todos; la casilla decide solo si se ofrece en el evento elegido abajo.
          </p>
        </div>

        <Button variante="secundario" onClick={alPedirTemaNuevo}>
          <PlusIcon size={14} weight="bold" aria-hidden="true" />
          Nuevo tema
        </Button>
      </header>

      {/*
        Barra de lente: cambia qué significa la columna de casillas, no qué
        temas se ven. Por eso se separa con el fondo de la aplicación en vez de
        parecer un filtro más del listado.

        Con el pool vacío no se dibuja: no hay ninguna casilla que gobernar, y
        su filete se sumaría al del estado vacío en la misma línea.
      */}
      {idEvento === null || temas.length === 0 ? null : (
        <div className="flex flex-wrap items-end justify-between gap-3 border-y border-filete bg-fondo px-4 py-3">
          <div className="w-full sm:w-80">
            <Field id={idSelector} etiqueta="Temas activos en">
              <Select
                value={idEvento}
                onChange={(cambio) => alElegirEvento(cambio.target.value)}
                opciones={eventos.map((evento) => ({ valor: evento.id, texto: evento.nombre }))}
              />
            </Field>
          </div>

          <p className="coordenada pb-2 text-xs text-texto-tenue">
            {idsActivos.size} de {temas.length} activos
          </p>
        </div>
      )}

      {temas.length === 0 ? (
        <div className="px-4">
          <EstadoVacio
            titulo="El pool de temas está vacío"
            descripcion="Sin vocabulario compartido, cada evento clasifica con sus propias palabras y deja de poder compararse con los demás. Crea el primer tema para volver a tener taxonomía."
          >
            <Button variante="secundario" onClick={alPedirTemaNuevo}>
              Crear el primer tema
            </Button>
          </EstadoVacio>
        </div>
      ) : (
        <ul aria-label="Temas del pool general" className="flex flex-col divide-y divide-filete">
          {temas.map((tema) => {
            const activo = idsActivos.has(tema.id)
            const enEdicion = idEnEdicion === tema.id
            const avisoDeLaFila = aviso !== null && aviso.idTema === tema.id ? aviso.mensaje : null

            return (
              <li key={tema.id} className="flex flex-col gap-2 px-4 py-3">
                {enEdicion ? (
                  <form
                    onSubmit={(envio) => confirmarRenombre(tema, envio)}
                    className="flex flex-col gap-3"
                  >
                    <Field
                      id={`renombrar-${tema.id}`}
                      etiqueta={`Nuevo nombre de «${tema.nombre}»`}
                      ayuda="Las fichas ya clasificadas siguen apuntando a este tema: solo cambia cómo se escribe."
                      {...(avisoDeLaFila === null ? {} : { error: avisoDeLaFila })}
                    >
                      <Input
                        value={borrador}
                        onChange={(cambio) => setBorrador(cambio.target.value)}
                        autoFocus
                      />
                    </Field>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variante="sutil" onClick={cancelarRenombre}>
                        Cancelar
                      </Button>
                      <Button type="submit" variante="primario">
                        Guardar
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      {idEvento === null ? null : (
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={(cambio) => alternar(tema, cambio.target.checked)}
                          aria-label={`Activar «${tema.nombre}» en ${nombreDelEvento}`}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-acento"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${activo ? 'font-medium text-texto' : 'text-texto-tenue'}`}
                        >
                          {tema.nombre}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-texto-tenue">
                          {/* El id viaja en la URL del catálogo al filtrar, así que se muestra tal cual. */}
                          <span className="coordenada hidden sm:inline">{tema.id}</span>
                          <span>{textoDeUso(usoPorTema.get(tema.id))}</span>
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => empezarARenombrar(tema)}
                          aria-label={`Renombrar «${tema.nombre}»`}
                          className={CLASES_DE_ACCION}
                        >
                          <PencilSimpleIcon size={15} weight="regular" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => intentarEliminar(tema)}
                          aria-label={`Eliminar «${tema.nombre}»`}
                          className={`${CLASES_DE_ACCION} hover:text-error`}
                        >
                          <TrashIcon size={15} weight="regular" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {avisoDeLaFila === null ? null : (
                      <MensajeDeFormulario id={`tema-${tema.id}-error`}>
                        {avisoDeLaFila}
                      </MensajeDeFormulario>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
