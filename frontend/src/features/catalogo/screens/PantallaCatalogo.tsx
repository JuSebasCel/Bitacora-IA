import type { ReactElement } from 'react'
import { useSession } from '@/features/auth/session'
import { resumirFichas } from '@/features/conferencias/query'
import { Button, EncabezadoDeSeccion, EstadoVacio } from '@/shared/ui'
import { ConteosDeFichas } from '@/features/conferencias/components'
import { ControlesDelCatalogo, FichaDeCatalogo } from '../components'
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

function textoDeConteo(total: number): string {
  return total === 1 ? '1 ficha a la vista' : `${total} fichas a la vista`
}

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

  const { entradas, criterios, temasDisponibles, eventosDisponibles, alCambiar, alQuitarFiltros } =
    useCatalogo(idUsuario)

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

        {entradas.length === 0 ? (
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
            <p className="coordenada text-xs text-texto-tenue">{textoDeConteo(entradas.length)}</p>

            <section className="rounded-md bg-panel p-4 shadow-sm">
              <ConteosDeFichas resumen={resumirFichas(entradas.map((entrada) => entrada.ficha))} />
            </section>

            <ul aria-label="Catálogo" className="flex flex-col gap-3">
              {entradas.map((entrada) => (
                <li key={entrada.ficha.id}>
                  <FichaDeCatalogo entrada={entrada} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
