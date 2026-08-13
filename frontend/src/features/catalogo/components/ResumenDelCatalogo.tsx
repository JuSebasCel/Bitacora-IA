import type { ReactElement } from 'react'
import {
  TIPOS_EN_ORDEN,
  TIPO_EN_PLURAL,
  VALIDACIONES_EN_ORDEN,
  VALIDACION_EN_PLURAL,
} from '@/features/conferencias/components/vocabulario'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { resumirFichas } from '@/features/conferencias/query'

/*
  Resumen de lo que hay a la vista, en una tira compacta.

  El catálogo usaba aquí el mismo `ConteosDeFichas` del detalle de una
  conferencia: dos paneles altos, uno de tres filas y otro de seis. Ocupaba
  el primer pantallazo entero, así que había que desplazarse para ver la
  primera ficha, y el desnivel entre las dos columnas dejaba un hueco muerto
  a la izquierda. En el detalle de una conferencia ese bloque tiene sentido
  (es el retrato de esa charla); aquí el contenido son las fichas, no sus
  cuentas.

  A diferencia de aquel, los tipos con cero se omiten: allá el cero es
  información sobre la charla ("en esta no se defendió ninguna postura"),
  pero aquí es solo el resultado de los filtros vigentes y llenaría la tira
  de ruido.
*/

export type PropsResumenDelCatalogo = {
  entradas: readonly FichaDelCatalogo[]
}

function Cuenta({ rotulo, valor }: { rotulo: string; valor: number }): ReactElement {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-md bg-panel px-2 py-1">
      <span className="coordenada text-xs font-semibold text-texto">{valor}</span>
      <span className="text-xs text-texto-tenue">{rotulo.toLowerCase()}</span>
    </span>
  )
}

export function ResumenDelCatalogo({ entradas }: PropsResumenDelCatalogo): ReactElement {
  const resumen = resumirFichas(entradas.map((entrada) => entrada.ficha))

  return (
    <div className="flex flex-col gap-2">
      <p className="coordenada text-xs text-texto-tenue">
        {resumen.total === 1 ? '1 ficha a la vista' : `${resumen.total} fichas a la vista`}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        {VALIDACIONES_EN_ORDEN.filter((estado) => resumen.porEstado[estado] > 0).map((estado) => (
          <Cuenta key={estado} rotulo={VALIDACION_EN_PLURAL[estado]} valor={resumen.porEstado[estado]} />
        ))}

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-filete" />

        {TIPOS_EN_ORDEN.filter((tipo) => resumen.porTipo[tipo] > 0).map((tipo) => (
          <Cuenta key={tipo} rotulo={TIPO_EN_PLURAL[tipo]} valor={resumen.porTipo[tipo]} />
        ))}
      </div>
    </div>
  )
}
