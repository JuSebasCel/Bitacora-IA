import type { ReactElement } from 'react'
import { M3_NAV_ACTIVO, M3_TEXTO, M3_TEXTO_SECUNDARIO, M3_TEXTO_TENUE } from './paleta'

/*
  La escala real de la referencia, medida. Dos cosas que la definen:

  1. **Son dos familias, no una.** Bricolage Grotesque encabeza (títulos de
     página, de tarjeta, mensajes de estado vacío) y DM Sans hace la
     navegación y el texto corrido. El contraste entre las dos es lo que
     separa un título de su contenido sin depender solo del tamaño.
  2. **El salto del nav**: 24px/400 a 28px/600 con el `line-height` clavado en
     24px — cambia tamaño Y peso a la vez, y aun así la fila no cambia de alto.

  (La referencia además mete Inter suelta en su pantalla de tareas, mezclada
  con DM Sans entre tarjetas hermanas. Eso no se copia: es inconsistencia
  suya, no parte del sistema.)
*/
const ESCALONES = [
  { etiqueta: 'Título de página', clase: 'font-titulo text-[32px] leading-none font-semibold', muestra: 'Notas', tono: 'texto' },
  { etiqueta: 'Título destacado', clase: 'font-titulo text-4xl leading-tight font-semibold', muestra: 'Nota rápida', tono: 'texto' },
  { etiqueta: 'Estado vacío', clase: 'font-titulo text-2xl leading-tight font-medium', muestra: 'Selecciona una nota', tono: 'texto' },
  { etiqueta: 'Nav — activo', clase: 'text-[28px] leading-6 font-semibold', muestra: 'Inicio', tono: 'activo' },
  { etiqueta: 'Nav — inactivo', clase: 'text-2xl leading-6 font-normal', muestra: 'Diario', tono: 'tenue' },
  { etiqueta: 'Cuerpo', clase: 'text-base font-normal', muestra: 'Escribe tu nota aquí…', tono: 'secundario' },
  { etiqueta: 'Rótulo / tenue', clase: 'text-base font-normal', muestra: 'Opciones', tono: 'tenue' },
] as const

const TONOS: Record<string, string> = {
  texto: M3_TEXTO,
  activo: M3_NAV_ACTIVO,
  secundario: M3_TEXTO_SECUNDARIO,
  tenue: M3_TEXTO_TENUE,
}

export function EscalaTipografica(): ReactElement {
  return (
    <div className="flex flex-col gap-5">
      {ESCALONES.map(({ etiqueta, clase, muestra, tono }) => (
        <div key={etiqueta} className="flex items-baseline gap-6">
          <span className={`w-44 shrink-0 text-xs ${M3_TEXTO_TENUE}`}>{etiqueta}</span>
          <span className={`${clase} ${TONOS[tono]}`}>{muestra}</span>
        </div>
      ))}
    </div>
  )
}
