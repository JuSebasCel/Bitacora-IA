import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown'
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { Popover } from '@/shared/ui'
import type { OrdenDeListado } from '../query'

/*
  "Ordenar por" como un solo botón que abre una lista de opciones, en vez del
  `<select>` grande con su propia etiqueta encima. El botón ya dice en qué
  orden está el listado, así que no hace falta leer una etiqueta aparte para
  saberlo.

  Las opciones son radios nativos dentro del panel: el teclado (flechas dentro
  del grupo, Tab para salir) ya viene resuelto por el navegador, sin
  reimplementar navegación de menú a mano.
*/

type PropiedadesSelectorDeOrden = {
  orden: OrdenDeListado
  alCambiar: (orden: OrdenDeListado) => void
}

const OPCIONES: readonly { valor: OrdenDeListado; texto: string; textoCorto: string }[] = [
  { valor: 'fecha-desc', texto: 'Fecha de la conferencia, más reciente primero', textoCorto: 'Más reciente' },
  { valor: 'fecha-asc', texto: 'Fecha de la conferencia, más antigua primero', textoCorto: 'Más antigua' },
  { valor: 'titulo-asc', texto: 'Título, de la A a la Z', textoCorto: 'Título' },
  { valor: 'fichas-desc', texto: 'Número de fichas, de más a menos', textoCorto: 'Más fichas' },
]

export function SelectorDeOrden({ orden, alCambiar }: PropiedadesSelectorDeOrden) {
  const actual = OPCIONES.find((opcion) => opcion.valor === orden) ?? OPCIONES[0]

  return (
    <Popover
      etiquetaAccesible={`Ordenar por: ${actual?.texto}`}
      alinear="derecha"
      boton={
        <>
          {actual?.textoCorto}
          <CaretDownIcon size={12} weight="bold" aria-hidden="true" />
        </>
      }
    >
      {(cerrar) => (
        <fieldset className="flex flex-col gap-0.5">
          <legend className="px-2 pb-1.5 text-xs font-medium text-texto-tenue">Ordenar por</legend>

          {OPCIONES.map((opcion) => {
            const seleccionada = opcion.valor === orden

            return (
              <label
                key={opcion.valor}
                className={`relative flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                  seleccionada ? 'bg-acento-tenue font-medium text-acento' : 'text-texto hover:bg-fondo'
                }`}
              >
                <input
                  type="radio"
                  name="orden"
                  value={opcion.valor}
                  checked={seleccionada}
                  onChange={() => {
                    alCambiar(opcion.valor)
                    cerrar()
                  }}
                  className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                />
                {opcion.texto}
                {seleccionada ? (
                  <CheckIcon size={14} weight="bold" aria-hidden="true" className="shrink-0" />
                ) : null}
              </label>
            )
          })}
        </fieldset>
      )}
    </Popover>
  )
}
