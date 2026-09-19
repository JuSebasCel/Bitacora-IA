import type { ReactElement } from 'react'
import { Calendario } from './Calendario'
import { Popover } from './Popover'

/*
  La fecha como pastilla que lleva su propio valor, igual que en la app de
  referencia: cerrada dice "Fecha" si no hay nada y la fecha escrita si la
  hay, y al pulsarla sale el calendario.

  Sustituye al `<input type="date">` nativo, que traía tres problemas que no
  se arreglan con CSS: se ve distinto en cada navegador, su icono no se puede
  tocar, y en Chrome el campo vacío muestra `mm/dd/yyyy` —en inglés y en
  orden estadounidense— dentro de una interfaz que está en español.
*/

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

/** `2026-09-19` → `19 sep 2026`. Sin construir un `Date`, que desplazaría el día por zona horaria. */
export function fechaLegible(iso: string): string {
  const [anio, mes, dia] = iso.split('-')

  if (anio === undefined || mes === undefined || dia === undefined) {
    return iso
  }

  return `${Number(dia)} ${MESES_CORTOS[Number(mes) - 1] ?? mes} ${anio}`
}

export type PropsSelectorDeFecha = {
  valor: string | null
  alElegir: (iso: string) => void
  /** Qué dice la pastilla cuando todavía no hay fecha. */
  vacio?: string
  minimo?: string
  maximo?: string
  alinear?: 'izquierda' | 'derecha'
  etiquetaAccesible: string
}

export function SelectorDeFecha({
  valor,
  alElegir,
  vacio = 'Fecha',
  minimo,
  maximo,
  alinear = 'izquierda',
  etiquetaAccesible,
}: PropsSelectorDeFecha): ReactElement {
  return (
    <Popover
      alinear={alinear}
      etiquetaAccesible={`${etiquetaAccesible}: ${valor === null ? vacio : fechaLegible(valor)}`}
      claseDelBoton="cursor-pointer"
      claseDelPanel="w-[336px] p-3"
      boton={
        <span
          className={`flex h-11 items-center gap-2 rounded-full px-4 text-base transition-colors ${
            valor === null
              ? 'bg-acento-tenue text-texto-tenue hover:text-texto'
              : 'bg-acento text-acento-contraste'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-lg">
            calendar_today
          </span>
          {valor === null ? vacio : fechaLegible(valor)}
        </span>
      }
    >
      {(cerrar) => (
        <div>
          <Calendario
            valor={valor}
            {...(minimo === undefined ? {} : { minimo })}
            {...(maximo === undefined ? {} : { maximo })}
            alElegir={(iso) => {
              alElegir(iso)
              cerrar()
            }}
          />
        </div>
      )}
    </Popover>
  )
}
