import { Field, Input, PanelDeError, Select } from '@/shared/ui'
import type { Etiqueta } from '../data'
import type { CriteriosDeListado, FiltroDeEstado, OrdenDeListado, Segmento } from '../query'
import { FiltroDeEtiquetas } from './FiltroDeEtiquetas'
import { SegmentacionDeOrigen } from './SegmentacionDeOrigen'

/*
  Los cinco controles del listado. No guardan estado propio salvo el borrador
  del nombre de una etiqueta nueva: los criterios viven en la URL, y este
  componente solo los lee y avisa de los cambios.
*/

type PropiedadesControles = {
  criterios: CriteriosDeListado
  etiquetas: readonly Etiqueta[]
  mensajeDeEtiqueta: string | null
  alCambiar: (criterios: CriteriosDeListado) => void
  alBuscar: (busqueda: string) => void
  alCrearEtiqueta: (nombre: string) => void
}

const ESTADOS = [
  { valor: 'todos', texto: 'Cualquier estado' },
  { valor: 'procesada', texto: 'Procesada' },
  { valor: 'procesando', texto: 'Procesando' },
  { valor: 'en-cola', texto: 'En cola' },
  { valor: 'fallida', texto: 'Procesamiento interrumpido' },
]

const ORDENES = [
  { valor: 'fecha-desc', texto: 'Fecha de la charla, más reciente' },
  { valor: 'fecha-asc', texto: 'Fecha de la charla, más antigua' },
  { valor: 'titulo-asc', texto: 'Título' },
  { valor: 'fichas-desc', texto: 'Número de fichas' },
]

export function ControlesDelListado({
  criterios,
  etiquetas,
  mensajeDeEtiqueta,
  alCambiar,
  alBuscar,
  alCrearEtiqueta,
}: PropiedadesControles) {
  function alternarEtiqueta(idEtiqueta: string): void {
    const marcadas = criterios.etiquetas.includes(idEtiqueta)
      ? criterios.etiquetas.filter((id) => id !== idEtiqueta)
      : [...criterios.etiquetas, idEtiqueta]

    alCambiar({ ...criterios, etiquetas: marcadas })
  }

  return (
    <div className="flex flex-col gap-5 border-t border-filete pt-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end">
        <SegmentacionDeOrigen
          segmento={criterios.segmento}
          alCambiar={(segmento: Segmento) => alCambiar({ ...criterios, segmento })}
        />

        <div className="min-w-56 flex-1">
          <Field id="buscar" etiqueta="Buscar por conferencia, ponente o evento">
            <Input
              type="search"
              value={criterios.busqueda}
              onChange={(evento) => alBuscar(evento.target.value)}
              placeholder="Sesgos algorítmicos"
            />
          </Field>
        </div>

        <div className="w-full sm:w-52">
          <Field id="estado" etiqueta="Estado de procesamiento">
            <Select
              opciones={ESTADOS}
              value={criterios.estado}
              onChange={(evento) =>
                alCambiar({ ...criterios, estado: evento.target.value as FiltroDeEstado })
              }
            />
          </Field>
        </div>

        <div className="w-full sm:w-60">
          <Field id="orden" etiqueta="Ordenar por">
            <Select
              opciones={ORDENES}
              value={criterios.orden}
              onChange={(evento) =>
                alCambiar({ ...criterios, orden: evento.target.value as OrdenDeListado })
              }
            />
          </Field>
        </div>
      </div>

      <FiltroDeEtiquetas
        etiquetas={etiquetas}
        seleccionadas={criterios.etiquetas}
        alAlternar={alternarEtiqueta}
        alCrear={alCrearEtiqueta}
      />

      {mensajeDeEtiqueta === null ? null : <PanelDeError mensaje={mensajeDeEtiqueta} />}
    </div>
  )
}
