import type { ReactElement } from 'react'
import { useState } from 'react'

/*
  Calendario de un mes, calcado de la app de referencia.

  Medidas tomadas de ella: rejilla de 7 columnas con 2px de separación, celda
  cuadrada de radio 16, rótulos de día en 11px/500 y el mes en 16px/500. La
  semana empieza en domingo, como allí.

  Lo que hace el gesto es `.dia-de-calendario` (ver `styles/index.css`): el
  número **crece** de 14px/400 a 20px/800 al elegirlo. No es decoración; es el
  mismo recurso que usa el dock con la sección activa, y es lo que hace que la
  fecha elegida se lea de un vistazo sin necesitar un recuadro fuerte.

  Cuatro estados, y cada uno dice algo distinto:

      fuera     día de otro mes: se ve, no se pulsa
      pasado    día ya ocurrido: atenuado, pero elegible
      hoy       fondo tenue y color de acento, sin ser una elección
      elegido   el número grande

  Fechas como texto ISO (`2026-09-19`) de principio a fin. Construir un `Date`
  para luego volver a texto es por dónde se cuela el desfase de zona horaria:
  `new Date('2026-09-19')` es medianoche UTC, que en Bogotá es el día 18.
*/

const DIAS_DE_LA_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'] as const

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

type Mes = { readonly anio: number; readonly mes: number }

function aIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Hoy, como texto ISO en la zona horaria de quien mira. */
export function hoyEnIso(): string {
  const ahora = new Date()
  return aIso(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
}

function mesDe(iso: string | null): Mes {
  const ahora = new Date()
  const partes = iso === null ? null : iso.split('-')

  if (partes === null || partes.length !== 3) {
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() }
  }

  return { anio: Number(partes[0]), mes: Number(partes[1]) - 1 }
}

function desplazar({ anio, mes }: Mes, meses: number): Mes {
  const total = anio * 12 + mes + meses
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 }
}

/** Celdas del mes, con las de relleno del mes anterior y el siguiente. */
function celdasDe({ anio, mes }: Mes): readonly { iso: string; dia: number; fuera: boolean }[] {
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasDelMes = new Date(anio, mes + 1, 0).getDate()
  /* Solo las filas que hagan falta: un mes de cinco semanas no dibuja una sexta vacía. */
  const filas = Math.ceil((primerDia + diasDelMes) / 7)

  return Array.from({ length: filas * 7 }, (_, indice) => {
    const desplazamiento = indice - primerDia
    const fecha = new Date(anio, mes, 1 + desplazamiento)

    return {
      iso: aIso(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
      dia: fecha.getDate(),
      fuera: desplazamiento < 0 || desplazamiento >= diasDelMes,
    }
  })
}

export type PropsCalendario = {
  /** Fecha elegida en ISO (`2026-09-19`), o `null`. */
  valor: string | null
  alElegir: (iso: string) => void
  /** Fecha mínima en ISO. Lo anterior queda tachado y no se puede pulsar. */
  minimo?: string
  /** Fecha máxima en ISO. */
  maximo?: string
}

const NAVEGACION =
  'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-texto'

export function Calendario({ valor, alElegir, minimo, maximo }: PropsCalendario): ReactElement {
  const [mesVisible, setMesVisible] = useState<Mes>(() => mesDe(valor))
  const hoy = hoyEnIso()

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between p-2">
        <p className="px-1 text-base font-medium text-texto">
          {MESES[mesVisible.mes]} {mesVisible.anio}
        </p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mes anterior"
            onClick={() => setMesVisible((actual) => desplazar(actual, -1))}
            className={NAVEGACION}
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => setMesVisible((actual) => desplazar(actual, 1))}
            className={NAVEGACION}
          >
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DIAS_DE_LA_SEMANA.map((dia) => (
          <p key={dia} className="py-1 text-[11px] font-medium text-texto-tenue">
            {dia}
          </p>
        ))}

        {celdasDe(mesVisible).map(({ iso, dia, fuera }) => {
          const elegido = iso === valor
          const bloqueado =
            (minimo !== undefined && iso < minimo) || (maximo !== undefined && iso > maximo)

          if (fuera) {
            return (
              <span
                key={iso}
                aria-hidden="true"
                className="flex aspect-square items-center justify-center text-sm text-texto-tenue opacity-40"
              >
                {dia}
              </span>
            )
          }

          return (
            <button
              key={iso}
              type="button"
              disabled={bloqueado}
              aria-pressed={elegido}
              aria-label={iso}
              onClick={() => alElegir(iso)}
              className={`dia-de-calendario flex aspect-square items-center justify-center rounded-2xl ${
                bloqueado
                  ? 'cursor-not-allowed text-texto-tenue line-through opacity-35'
                  : 'cursor-pointer'
              } ${
                elegido
                  ? 'bg-acento text-[20px] font-extrabold text-acento-contraste'
                  : iso === hoy
                    ? 'bg-acento-tenue text-sm font-semibold text-acento'
                    : `text-sm text-texto-tenue ${
                        bloqueado ? '' : 'hover:bg-acento-tenue hover:font-bold hover:text-texto'
                      } ${iso < hoy ? 'opacity-60' : ''}`
              }`}
            >
              {dia}
            </button>
          )
        })}
      </div>
    </div>
  )
}
