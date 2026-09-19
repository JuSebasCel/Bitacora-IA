import type { ReactElement } from 'react'
import { M3_NAV_ACTIVO, M3_TEXTO_TENUE } from '../paleta'

/*
  APROBADO — navegación lateral. Listo para reutilizar.

  Medidas tomadas del DOM de la referencia, no estimadas de una captura:

  - Ancho 280px, padding 16px.
  - Cada ítem: caja de 40px de alto, padding 8px, `line-height` fijo en 24px.
  - Inactivo: 24px / peso 400 / gris tenue.  Activo: 28px / peso 600 / blanco.
  - Los ítems van pegados, sin separación: 40 + 40 + 40…
  - Cada grupo con rótulo abre con 24px de aire; el rótulo es de 16px.

  Las tres decisiones que lo hacen funcionar, y que conviene no tocar:

  1. **Sin iconos.** Es tipografía pura. La referencia sí los trae en el
     marcado, pero en `display: none`.
  2. **El `line-height` se queda en 24px** aunque el ítem activo suba a 28px.
     Por eso la fila sigue midiendo 40px y el ritmo vertical de la columna no
     salta al cambiar de sección.
  3. **El activo no lleva fondo, ni pastilla, ni color de acento**: solo crece
     y pesa más. Toda la jerarquía sale de la tipografía.

  El movimiento (rebote al crecer, `scale(1.2)` en hover) vive en
  `.item-de-dock`, en `styles/index.css`, no aquí.

  La sección activa llega por props a propósito: el cambio suele disparar
  también la animación de entrada del contenido, así que quien manda sobre eso
  es la pantalla que lo usa, no el dock.
*/

export type GrupoDelDock = {
  /** Rótulo del grupo. El primero suele ir sin uno. */
  rotulo?: string
  items: readonly string[]
  /** Si sus ítems pueden quedar marcados como activos. Las acciones sueltas no. */
  navegable?: boolean
}

export type PropsDock = {
  grupos: readonly GrupoDelDock[]
  activo: string
  alCambiar: (item: string) => void
  /** Iniciales del avatar. Sin esto, no se dibuja el avatar. */
  iniciales?: string
  /** Enlace anclado al fondo de la columna. */
  pie?: string
}

/* 40px de alto, 8px de padding y line-height clavado en 24px, como la referencia. */
const FILA = 'item-de-dock flex h-10 items-center px-2 text-left leading-6'

export function Dock({ grupos, activo, alCambiar, iniciales, pie }: PropsDock): ReactElement {
  return (
    <div className="flex w-70 flex-col p-4">
      {iniciales === undefined ? null : (
        <div className="flex h-14 items-center px-2">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--m3-surface-container-highest)]">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#1f5c4d] text-sm font-medium text-white">
              {iniciales}
            </span>
          </span>
        </div>
      )}

      {grupos.map((grupo, indice) => (
        <div key={grupo.rotulo ?? indice} className="flex flex-col">
          {grupo.rotulo === undefined ? null : (
            <p className={`mt-6 flex h-10 items-center px-2 text-base leading-6 ${M3_TEXTO_TENUE}`}>{grupo.rotulo}</p>
          )}

          {grupo.items.map((item) => {
            const esActivo = grupo.navegable === true && item === activo

            return (
              <button
                key={item}
                type="button"
                onClick={() => alCambiar(item)}
                aria-current={esActivo ? 'page' : undefined}
                className={`${FILA} ${
                  esActivo ? `text-[28px] font-semibold ${M3_NAV_ACTIVO}` : `text-2xl font-normal ${M3_TEXTO_TENUE}`
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>
      ))}

      {pie === undefined ? null : (
        <button type="button" className={`${FILA} mt-auto text-2xl font-normal ${M3_TEXTO_TENUE}`}>
          {pie}
        </button>
      )}
    </div>
  )
}
