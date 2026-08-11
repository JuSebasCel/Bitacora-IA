import type { Etiqueta } from '../data'
import type { CriteriosDeListado, FiltroDeEstado, OrdenDeListado, Segmento } from '../query'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'
import { BarraDeBusqueda } from './BarraDeBusqueda'
import { PopoverDeFiltros } from './PopoverDeFiltros'
import { SegmentacionDeOrigen } from './SegmentacionDeOrigen'
import { SelectorDeOrden } from './SelectorDeOrden'

/*
  Los controles del listado, como una sola superficie elevada (`bg-panel`) en
  vez de un renglón de widgets con su propio borde cada uno: el origen y la
  búsqueda son lo que se usa en cada visita y quedan siempre a la vista; el
  orden y los filtros menos frecuentes (estado, etiquetas) se agrupan detrás de
  un botón cada uno.

  Dentro de la barra, ningún control dibuja su propio borde. El vocabulario de
  superficies es el mismo en todo el panel: `bg-fondo` marca lo "hundido"
  (la pista del segmentado, la búsqueda, un botón fantasma al pasar el mouse o
  al abrirse) y `bg-acento-tenue` marca lo seleccionado. La jerarquía sale del
  contraste entre esas dos superficies, no de trazos.

  Los cambios se emiten como parche y no como criterios completos: quien los
  recibe los aplica sobre lo que la URL tenga en ese momento, de modo que dos
  cambios seguidos no se pisen entre sí.
*/
type PropiedadesControles = {
  criterios: CriteriosDeListado
  etiquetas: readonly Etiqueta[]
  alCambiar: (cambio: Partial<CriteriosDeListado>) => void
  alBuscar: (busqueda: string) => void
  alAlternarEtiqueta: (idEtiqueta: string) => void
  alCrearEtiqueta: (nombre: string) => ResultadoCreacion
}

export function ControlesDelListado({
  criterios,
  etiquetas,
  alCambiar,
  alBuscar,
  alAlternarEtiqueta,
  alCrearEtiqueta,
}: PropiedadesControles) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-panel p-1.5 shadow-sm">
      <SegmentacionDeOrigen
        segmento={criterios.segmento}
        alCambiar={(segmento: Segmento) => alCambiar({ segmento })}
      />

      <div className="min-w-48 flex-1 basis-48">
        <BarraDeBusqueda valor={criterios.busqueda} alCambiar={alBuscar} />
      </div>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-filete" aria-hidden="true" />

      <SelectorDeOrden
        orden={criterios.orden}
        alCambiar={(orden: OrdenDeListado) => alCambiar({ orden })}
      />

      <PopoverDeFiltros
        estado={criterios.estado}
        etiquetas={etiquetas}
        etiquetasSeleccionadas={criterios.etiquetas}
        alCambiarEstado={(estado: FiltroDeEstado) => alCambiar({ estado })}
        alAlternarEtiqueta={alAlternarEtiqueta}
        alCrearEtiqueta={alCrearEtiqueta}
      />
    </div>
  )
}
