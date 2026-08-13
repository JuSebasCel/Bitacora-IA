import { FunnelSimpleIcon } from '@phosphor-icons/react/dist/csr/FunnelSimple'
import type { ReactElement } from 'react'
import {
  TIPO_EN_SINGULAR,
  TIPOS_EN_ORDEN,
  VALIDACION_EN_SINGULAR,
  VALIDACIONES_EN_ORDEN,
} from '@/features/conferencias/components/vocabulario'
import type { TipoDeUnidad } from '@/features/conferencias/data'
import { Popover } from '@/shared/ui'
import type { CriteriosDeCatalogo, FiltroDeEstadoDeValidacion } from '../filtros'

/*
  Cuatro filtros de "acotar a este uno" detrás de un único botón, mismo
  patrón que `conferencias/components/PopoverDeFiltros.tsx`: cada uno es un
  `fieldset` de chips con un input de radio oculto debajo, y el contador
  sobre el botón dice cuántos están activos sin abrir el panel.

  Tema y evento son texto libre (vienen de `temasDisponibles`/
  `eventosDisponibles`, ya acotados a lo que esa persona puede ver);
  tipo de unidad y estado son enumeraciones fijas del dominio.
*/

const TODOS = '__todos__'

export type PropsPopoverDeFiltrosDeCatalogo = {
  criterios: CriteriosDeCatalogo
  temasDisponibles: readonly string[]
  eventosDisponibles: readonly string[]
  alCambiar: (parche: Partial<CriteriosDeCatalogo>) => void
}

type OpcionDeFiltro = { readonly valor: string; readonly texto: string }

function GrupoDeRadios({
  etiqueta,
  nombre,
  opciones,
  valorActivo,
  alCambiar,
}: {
  etiqueta: string
  nombre: string
  opciones: readonly OpcionDeFiltro[]
  valorActivo: string
  alCambiar: (valor: string) => void
}): ReactElement {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-medium text-texto-tenue">{etiqueta}</legend>

      <div className="flex flex-wrap gap-1">
        {opciones.map((opcion) => {
          const activa = opcion.valor === valorActivo

          return (
            <label
              key={opcion.valor}
              className={`relative cursor-pointer rounded-md px-2 py-1 text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                activa ? 'bg-acento-tenue font-medium text-acento' : 'bg-fondo text-texto-tenue hover:text-texto'
              }`}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.valor}
                checked={activa}
                onChange={() => alCambiar(opcion.valor)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              {opcion.texto}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function PopoverDeFiltrosDeCatalogo({
  criterios,
  temasDisponibles,
  eventosDisponibles,
  alCambiar,
}: PropsPopoverDeFiltrosDeCatalogo): ReactElement {
  const filtrosActivos =
    (criterios.tema === null ? 0 : 1) +
    (criterios.tipoDeUnidad === null ? 0 : 1) +
    (criterios.evento === null ? 0 : 1) +
    (criterios.estado === 'todos' ? 0 : 1)

  return (
    <Popover
      etiquetaAccesible="Filtros"
      alinear="derecha"
      boton={
        <>
          <FunnelSimpleIcon size={14} weight="regular" aria-hidden="true" />
          Filtros
          {filtrosActivos === 0 ? null : (
            <span className="coordenada rounded-md bg-acento px-1.5 text-[0.6875rem] text-acento-contraste">
              {filtrosActivos}
            </span>
          )}
        </>
      }
    >
      {() => (
        <div className="flex w-72 flex-col gap-4">
          <GrupoDeRadios
            etiqueta="Tema"
            nombre="catalogo-tema"
            valorActivo={criterios.tema ?? TODOS}
            alCambiar={(valor) => alCambiar({ tema: valor === TODOS ? null : valor })}
            opciones={[
              { valor: TODOS, texto: 'Todos los temas' },
              ...temasDisponibles.map((tema) => ({ valor: tema, texto: tema })),
            ]}
          />

          <GrupoDeRadios
            etiqueta="Tipo de unidad"
            nombre="catalogo-tipo"
            valorActivo={criterios.tipoDeUnidad ?? TODOS}
            alCambiar={(valor) => alCambiar({ tipoDeUnidad: valor === TODOS ? null : (valor as TipoDeUnidad) })}
            opciones={[
              { valor: TODOS, texto: 'Todos los tipos' },
              ...TIPOS_EN_ORDEN.map((tipo) => ({ valor: tipo, texto: TIPO_EN_SINGULAR[tipo] })),
            ]}
          />

          <GrupoDeRadios
            etiqueta="Evento"
            nombre="catalogo-evento"
            valorActivo={criterios.evento ?? TODOS}
            alCambiar={(valor) => alCambiar({ evento: valor === TODOS ? null : valor })}
            opciones={[
              { valor: TODOS, texto: 'Todos los eventos' },
              ...eventosDisponibles.map((evento) => ({ valor: evento, texto: evento })),
            ]}
          />

          <GrupoDeRadios
            etiqueta="Estado de validación"
            nombre="catalogo-estado"
            valorActivo={criterios.estado}
            alCambiar={(valor) => alCambiar({ estado: valor as FiltroDeEstadoDeValidacion })}
            opciones={[
              { valor: 'todos', texto: 'Cualquier estado' },
              ...VALIDACIONES_EN_ORDEN.map((estado) => ({ valor: estado, texto: VALIDACION_EN_SINGULAR[estado] })),
            ]}
          />
        </div>
      )}
    </Popover>
  )
}
