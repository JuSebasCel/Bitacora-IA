/*
  Formato de fechas y coordenadas de tiempo.

  Nada de aquí usa `Date` ni `Intl`, y es una decisión, no un descuido:

  - `new Date('2026-04-14')` interpreta la cadena como UTC, así que en zona
    horaria de Colombia `getDate()` devuelve 13. Una fecha de conferencia que se
    corre un día rompe la trazabilidad que el producto promete.
  - `toLocaleDateString` cambia de salida según la versión de ICU del entorno,
    de modo que la misma prueba pasaría en una máquina y fallaría en otra.

  Las fechas se guardan como cadenas ISO precisamente para poder ordenarlas y
  formatearlas sin construir un Date en ningún momento.
*/

const MESES = [
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

const FECHA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function dosCifras(valor: number): string {
  return valor.toString().padStart(2, '0')
}

/* Un valor negativo o fraccionario solo puede venir de un dato corrupto. */
function segundosEnteros(segundos: number): number {
  if (!Number.isFinite(segundos) || segundos < 0) {
    return 0
  }

  return Math.floor(segundos)
}

function partir(segundos: number): { horas: number; minutos: number; restantes: number } {
  const total = segundosEnteros(segundos)

  return {
    horas: Math.floor(total / 3600),
    minutos: Math.floor((total % 3600) / 60),
    restantes: total % 60,
  }
}

/**
 * Coordenada de una ficha dentro de la charla, siempre con el mismo ancho para
 * que la columna monoespaciada quede alineada.
 */
export function formatearTimestamp(segundos: number): string {
  const { horas, minutos, restantes } = partir(segundos)

  return `${dosCifras(horas)}:${dosCifras(minutos)}:${dosCifras(restantes)}`
}

/**
 * Duración de una charla. Omite las horas cuando no las hay, porque la mayoría
 * dura menos de una y un `00:` al principio solo añade ruido.
 */
export function formatearDuracion(segundos: number): string {
  const { horas, minutos, restantes } = partir(segundos)

  if (horas === 0) {
    return `${dosCifras(minutos)}:${dosCifras(restantes)}`
  }

  return `${horas}:${dosCifras(minutos)}:${dosCifras(restantes)}`
}

/**
 * Fecha ISO en forma legible. Devuelve la cadena original si no reconoce el
 * formato, en vez de inventar una fecha o mostrar un valor inválido.
 */
export function formatearFecha(iso: string): string {
  const partes = FECHA_ISO.exec(iso)

  if (partes === null) {
    return iso
  }

  const anio = partes[1]
  const mes = partes[2]
  const dia = partes[3]

  if (anio === undefined || mes === undefined || dia === undefined) {
    return iso
  }

  const nombreDelMes = MESES[Number(mes) - 1]

  if (nombreDelMes === undefined) {
    return iso
  }

  return `${Number(dia)} ${nombreDelMes} ${anio}`
}
