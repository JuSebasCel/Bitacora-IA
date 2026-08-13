import { useCallback, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { guardarTaxonomia, leerTaxonomia } from './almacenamiento'
import type { Taxonomia } from './data/tipos'
import { aprobarPropuesta, rechazarPropuesta } from './taxonomia'
import type { ResultadoDeTaxonomia } from './taxonomia'

/*
  Envoltorio fino sobre las operaciones puras y el almacenamiento.

  Solo aprobar/rechazar: nadie crea, renombra ni elimina un tema a mano. El
  pool crece únicamente por curaduría de lo que el análisis de discurso
  propuso (`PLAN.md` sección 3.1).

  Cada acción devuelve el mensaje ya traducido en el momento de intentarla,
  no un estado que llegue en un render posterior: así quien la disparó puede
  decidir por sí solo si cierra su diálogo (éxito) o se queda abierto con el
  error (fallo), sin que la pantalla tenga que sostener ese estado. Mismo
  criterio que `alCrearEtiqueta` en el dashboard de F2.
*/

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeTaxonomia = {
  readonly taxonomia: Taxonomia
  readonly aprobar: (idPropuesta: string) => ResultadoDeAccion
  readonly rechazar: (idPropuesta: string) => ResultadoDeAccion
}

export function useTaxonomia(): ValorDeTaxonomia {
  const [taxonomia, setTaxonomia] = useState<Taxonomia>(() => leerTaxonomia())

  const aplicar = useCallback((resultado: ResultadoDeTaxonomia): ResultadoDeAccion => {
    if (!resultado.ok) {
      return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    }

    setTaxonomia(guardarTaxonomia(resultado.taxonomia))

    return { ok: true }
  }, [])

  return {
    taxonomia,
    aprobar: (idPropuesta) => aplicar(aprobarPropuesta(taxonomia, idPropuesta)),
    rechazar: (idPropuesta) => aplicar(rechazarPropuesta(taxonomia, idPropuesta)),
  }
}
