import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { Button, EncabezadoDeSeccion, Esqueleto, EstadoVacio } from '@/shared/ui'
import { ControlesDelCatalogo, FichaDeCatalogo, ResumenDelCatalogo } from '../components'
import type { CriteriosDeCatalogo } from '../filtros'
import { useCatalogo } from '../useCatalogo'

/*
  Catálogo (F6): las fichas de todas las conferencias visibles para esa
  persona, filtrables por tema, tipo de unidad, evento, estado de validación
  y palabra clave — a diferencia del listado dentro del detalle de una
  conferencia, que solo muestra las de esa una.

  Sustituye al marcador de posición que dejó F1 en `/catalogo`.
*/

const DESCRIPCION =
  'Filtra las fichas por tema, tipo de unidad, evento y estado de validación, y abre cada una en su coordenada dentro de la conferencia de origen.'

function hayFiltrosAplicados(criterios: CriteriosDeCatalogo): boolean {
  return (
    criterios.busqueda.trim().length > 0 ||
    criterios.tema !== null ||
    criterios.tipoDeUnidad !== null ||
    criterios.evento !== null ||
    criterios.estado !== 'todos'
  )
}

export function PantallaCatalogo(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const [params] = useSearchParams()

  const { carga, entradas, criterios, temasDisponibles, eventosDisponibles, alCambiar, alQuitarFiltros } =
    useCatalogo(idUsuario)

  /* Viaja con cada resultado para que volver desde el detalle recupere esta misma vista filtrada. */
  const busqueda = params.toString() === '' ? '' : `?${params.toString()}`

  return (
    <>
      <EncabezadoDeSeccion titulo="Catálogo" descripcion={DESCRIPCION} />

      <div className="mt-6 flex flex-col gap-6">
        <ControlesDelCatalogo
          criterios={criterios}
          temasDisponibles={temasDisponibles}
          eventosDisponibles={eventosDisponibles}
          alCambiar={alCambiar}
        />

        {carga === 'cargando' ? (
          <Esqueleto filas={4} etiqueta="Cargando el catálogo" />
        ) : entradas.length === 0 ? (
          hayFiltrosAplicados(criterios) ? (
            <EstadoVacio
              titulo="Ningún resultado con estos filtros"
              descripcion="Ninguna de las fichas que puedes ver cumple todo lo que pediste a la vez. Prueba a soltar alguno de los filtros."
            >
              <Button variante="secundario" onClick={alQuitarFiltros}>
                Quitar filtros
              </Button>
            </EstadoVacio>
          ) : (
            <EstadoVacio
              titulo="Todavía no hay fichas a la vista"
              descripcion="Cuando tengas o te compartan una conferencia procesada, sus fichas aparecerán aquí."
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <ResumenDelCatalogo entradas={entradas} />

            {/*
              Mosaico por columnas CSS, no rejilla: los fragmentos varían
              muchísimo de largo (una cita textual son dos renglones, un
              método puede ser un párrafo entero), y una rejilla de filas
              iguales dejaría huecos enormes bajo las tarjetas cortas. Con
              `columns` cada tarjeta ocupa solo lo que necesita y la columna
              siguiente arranca donde quedó la anterior.

              Se queda en dos columnas como máximo: a tres, la medida de
              línea cae por debajo de lo cómodo para leer una cita.
            */}
            <ul aria-label="Catálogo" className="columns-1 gap-4 lg:columns-2">
              {entradas.map((entrada) => (
                <li key={entrada.ficha.id} className="mb-4 break-inside-avoid">
                  <FichaDeCatalogo entrada={entrada} busqueda={busqueda} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
