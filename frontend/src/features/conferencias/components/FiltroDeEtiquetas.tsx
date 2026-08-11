import { useState } from 'react'
import { Button, Field, Input } from '@/shared/ui'
import type { Etiqueta } from '../data'

/*
  Filtro por etiqueta personal, con creación al vuelo.

  Crear y filtrar viven en el mismo sitio a propósito: una etiqueta se crea
  justo cuando hace falta agrupar algo, no en una pantalla de configuración
  aparte a la que nadie va.

  Marcar varias exige todas a la vez, no cualquiera: es lo que se quiere al
  cruzar un tema con la intención de uso.
*/

type PropiedadesFiltro = {
  etiquetas: readonly Etiqueta[]
  seleccionadas: readonly string[]
  alAlternar: (idEtiqueta: string) => void
  alCrear: (nombre: string) => void
}

export function FiltroDeEtiquetas({
  etiquetas,
  seleccionadas,
  alAlternar,
  alCrear,
}: PropiedadesFiltro) {
  const [nombre, setNombre] = useState('')

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-texto">Etiquetas</p>

      {etiquetas.length === 0 ? (
        <p className="text-xs text-texto-tenue">
          Todavía no tienes etiquetas. Crea una para agrupar conferencias a tu manera.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {etiquetas.map((etiqueta) => {
            const marcada = seleccionadas.includes(etiqueta.id)

            return (
              <label
                key={etiqueta.id}
                className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  marcada
                    ? 'border-acento bg-acento-tenue font-medium text-acento'
                    : 'border-filete-fuerte text-texto-tenue hover:border-acento hover:text-acento'
                }`}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alAlternar(etiqueta.id)}
                  className="sr-only"
                />
                {etiqueta.nombre}
              </label>
            )
          })}
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(evento) => {
          evento.preventDefault()
          alCrear(nombre)
          setNombre('')
        }}
      >
        <div className="w-44">
          <Field id="nueva-etiqueta" etiqueta="Nueva etiqueta">
            <Input
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="art1"
            />
          </Field>
        </div>
        <Button type="submit" variante="secundario">
          Crear etiqueta
        </Button>
      </form>
    </div>
  )
}
