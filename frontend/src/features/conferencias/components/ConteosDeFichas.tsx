import type { ResumenDeFichas } from '../query'
import {
  TIPOS_EN_ORDEN,
  TIPO_EN_PLURAL,
  VALIDACIONES_EN_ORDEN,
  VALIDACION_EN_PLURAL,
} from './vocabulario'

/*
  Distribución de las fichas de una conferencia, por estado de validación y por
  tipo de unidad.

  Los seis tipos aparecen siempre, incluso en cero: que en una charla no se
  defendiera ninguna postura es información sobre la charla, no un hueco que
  convenga esconder.

  Los conteos se calculan sobre lo que esa persona ve, así que en una
  conferencia compartida sin fichas pendientes no delatan cuántas hay ocultas.
*/

type PropiedadesConteos = {
  resumen: ResumenDeFichas
}

function Cifra({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-texto-tenue">{rotulo}</span>
      <span className="coordenada text-sm text-texto">{valor}</span>
    </div>
  )
}

export function ConteosDeFichas({ resumen }: PropiedadesConteos) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
      <div className="flex flex-col">
        <h3 className="pb-1 text-xs tracking-[0.14em] text-texto-tenue uppercase">
          Estado de validación
        </h3>
        <div className="divide-y divide-filete border-t border-filete">
          {VALIDACIONES_EN_ORDEN.map((estado) => (
            <Cifra
              key={estado}
              rotulo={VALIDACION_EN_PLURAL[estado]}
              valor={resumen.porEstado[estado]}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        <h3 className="pb-1 text-xs tracking-[0.14em] text-texto-tenue uppercase">
          Tipo de unidad
        </h3>
        <div className="divide-y divide-filete border-t border-filete">
          {TIPOS_EN_ORDEN.map((tipo) => (
            <Cifra key={tipo} rotulo={TIPO_EN_PLURAL[tipo]} valor={resumen.porTipo[tipo]} />
          ))}
        </div>
      </div>
    </div>
  )
}
