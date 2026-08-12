import { FunnelSimpleIcon } from '@phosphor-icons/react/dist/csr/FunnelSimple'
import { useState } from 'react'
import { Popover } from '@/shared/ui'
import type { Etiqueta } from '../data'
import type { FiltroDeEstado } from '../query'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'
import { CreadorDeEtiqueta } from './CreadorDeEtiqueta'
import { FiltroDeEtiquetas } from './FiltroDeEtiquetas'

/*
  Estado y etiquetas agrupados detrás de un único botón "Filtros", en vez de
  quedar siempre desplegados en la barra de controles. El contador sobre el
  botón dice cuántos filtros están activos sin tener que abrir el panel para
  averiguarlo.
*/

type PropiedadesPopoverDeFiltros = {
  estado: FiltroDeEstado
  etiquetas: readonly Etiqueta[]
  etiquetasSeleccionadas: readonly string[]
  alCambiarEstado: (estado: FiltroDeEstado) => void
  alAlternarEtiqueta: (idEtiqueta: string) => void
  alQuitarTodasLasEtiquetas: () => void
  alCrearEtiqueta: (nombre: string) => ResultadoCreacion
}

const ESTADOS: readonly { valor: FiltroDeEstado; texto: string }[] = [
  { valor: 'todos', texto: 'Cualquier estado' },
  { valor: 'procesada', texto: 'Procesada' },
  { valor: 'procesando', texto: 'Procesando' },
  { valor: 'en-cola', texto: 'En cola' },
  { valor: 'fallida', texto: 'Procesamiento interrumpido' },
]

export function PopoverDeFiltros({
  estado,
  etiquetas,
  etiquetasSeleccionadas,
  alCambiarEstado,
  alAlternarEtiqueta,
  alQuitarTodasLasEtiquetas,
  alCrearEtiqueta,
}: PropiedadesPopoverDeFiltros) {
  const [creadorAbierto, setCreadorAbierto] = useState(false)
  const filtrosActivos = (estado === 'todos' ? 0 : 1) + etiquetasSeleccionadas.length

  return (
    <>
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
        {(cerrar) => (
          <div className="flex w-72 flex-col gap-4">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-medium text-texto-tenue">
                Estado de procesamiento
              </legend>

              <div className="flex flex-wrap gap-1">
                {ESTADOS.map((opcion) => {
                  const activa = opcion.valor === estado

                  return (
                    <label
                      key={opcion.valor}
                      className={`relative cursor-pointer rounded-md px-2 py-1 text-xs transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                        activa
                          ? 'bg-acento-tenue font-medium text-acento'
                          : 'bg-fondo text-texto-tenue hover:text-texto'
                      }`}
                    >
                      <input
                        type="radio"
                        name="estado-filtro"
                        value={opcion.valor}
                        checked={activa}
                        onChange={() => alCambiarEstado(opcion.valor)}
                        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                      />
                      {opcion.texto}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <FiltroDeEtiquetas
              etiquetas={etiquetas}
              seleccionadas={etiquetasSeleccionadas}
              alAlternar={alAlternarEtiqueta}
              alQuitarTodas={alQuitarTodasLasEtiquetas}
              alAbrirCreador={() => {
                cerrar()
                setCreadorAbierto(true)
              }}
            />
          </div>
        )}
      </Popover>

      <CreadorDeEtiqueta
        abierto={creadorAbierto}
        alCerrar={() => setCreadorAbierto(false)}
        alCrear={alCrearEtiqueta}
      />
    </>
  )
}
