import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { TagIcon } from '@phosphor-icons/react/dist/csr/Tag'
import { useState } from 'react'
import { Popover } from '@/shared/ui'
import type { Etiqueta } from '../data'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'
import { CreadorDeEtiqueta } from './CreadorDeEtiqueta'

/*
  Poner o quitar etiquetas propias sobre una conferencia, desde su propia fila.

  Este control no existía: los chips del panel de Filtros solo eligen por qué
  etiqueta filtrar, nunca deciden qué etiqueta lleva una conferencia. Sin esto,
  las etiquetas creadas quedaban huérfanas, sin ninguna conferencia asignada.

  `idConferencia` no es un prop de este componente a propósito: quien lo monta
  (`FilaDeConferencia`) ya cierra `alAlternar` y `alCrear` sobre el id de su
  propia conferencia, así que este archivo no necesita saber cuál es.
*/

type PropiedadesAsignador = {
  misEtiquetas: readonly Etiqueta[]
  idsAsignadas: readonly string[]
  alAlternar: (idEtiqueta: string) => void
  alCrear: (nombre: string) => ResultadoCreacion | Promise<ResultadoCreacion>
}

export function AsignadorDeEtiquetas({
  misEtiquetas,
  idsAsignadas,
  alAlternar,
  alCrear,
}: PropiedadesAsignador) {
  const [creadorAbierto, setCreadorAbierto] = useState(false)

  return (
    <>
      {/*
        z-10 relativo: el enlace del título se extiende sobre toda la fila con
        un `::after` absoluto (el "stretched link"), y un elemento absoluto sin
        posición propia pinta por encima de cualquier hermano estático, sin
        importar el orden en el HTML. Sin este nivel de apilamiento, el botón
        quedaría tapado por ese enlace invisible y el clic nunca le llegaría.
      */}
      <Popover
        className="relative z-10"
        etiquetaAccesible="Etiquetar esta conferencia"
        boton={<TagIcon size={13} weight="regular" aria-hidden="true" />}
      >
        {(cerrar) => (
          <div className="flex w-56 flex-col gap-2">
            <p className="text-xs font-medium text-texto-tenue">Tus etiquetas</p>

            {misEtiquetas.length === 0 ? (
              <p className="text-xs text-texto-tenue">
                Todavía no tienes ninguna. Crea la primera abajo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {misEtiquetas.map((etiqueta) => {
                  const marcada = idsAsignadas.includes(etiqueta.id)

                  return (
                    <button
                      key={etiqueta.id}
                      type="button"
                      onClick={() => alAlternar(etiqueta.id)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                        marcada
                          ? 'bg-acento-tenue font-medium text-acento'
                          : 'bg-fondo text-texto-tenue hover:text-texto'
                      }`}
                    >
                      {marcada ? <CheckIcon size={11} weight="bold" aria-hidden="true" /> : null}
                      {etiqueta.nombre}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                cerrar()
                setCreadorAbierto(true)
              }}
              className="inline-flex items-center gap-1 self-start rounded-md px-2 py-1 text-xs text-texto-tenue transition-colors hover:bg-fondo hover:text-acento"
            >
              <PlusIcon size={12} weight="bold" aria-hidden="true" />
              Nueva etiqueta
            </button>
          </div>
        )}
      </Popover>

      <CreadorDeEtiqueta
        abierto={creadorAbierto}
        alCerrar={() => setCreadorAbierto(false)}
        alCrear={alCrear}
      />
    </>
  )
}
