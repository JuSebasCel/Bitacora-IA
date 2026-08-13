import { useCallback, useState } from 'react'
import { mensajeDeError } from '@/shared/errors'
import { guardarTaxonomia, leerTaxonomia } from './almacenamiento'
import type { Taxonomia } from './data/tipos'
import {
  activarEnEvento,
  aprobarPropuesta,
  crearTema,
  desactivarEnEvento,
  eliminarTema,
  rechazarPropuesta,
  renombrarTema,
} from './taxonomia'
import type { ResultadoDeTaxonomia } from './taxonomia'

/*
  Envoltorio fino sobre las operaciones puras y el almacenamiento.

  Cada acción devuelve el mensaje ya traducido en el momento de intentarla,
  no un estado que llegue en un render posterior: así quien la disparó puede
  decidir por sí solo si cierra su diálogo (éxito) o se queda abierto con el
  error (fallo), sin que la pantalla tenga que sostener ese estado. Mismo
  criterio que `alCrearEtiqueta` en el dashboard de F2.
*/

export type ResultadoDeAccion = { readonly ok: true } | { readonly ok: false; readonly mensaje: string }

export type ValorDeTaxonomia = {
  readonly taxonomia: Taxonomia
  readonly crear: (nombre: string) => ResultadoDeAccion
  readonly renombrar: (idTema: string, nombre: string) => ResultadoDeAccion
  readonly eliminar: (idTema: string, idsTemasEnUso: readonly string[]) => ResultadoDeAccion
  readonly activar: (idEvento: string, idTema: string) => ResultadoDeAccion
  readonly desactivar: (idEvento: string, idTema: string) => ResultadoDeAccion
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
    crear: (nombre) => aplicar(crearTema(taxonomia, nombre)),
    renombrar: (idTema, nombre) => aplicar(renombrarTema(taxonomia, idTema, nombre)),
    eliminar: (idTema, idsTemasEnUso) => aplicar(eliminarTema(taxonomia, idTema, idsTemasEnUso)),
    activar: (idEvento, idTema) => aplicar(activarEnEvento(taxonomia, idEvento, idTema)),
    desactivar: (idEvento, idTema) => aplicar(desactivarEnEvento(taxonomia, idEvento, idTema)),
    aprobar: (idPropuesta) => aplicar(aprobarPropuesta(taxonomia, idPropuesta)),
    rechazar: (idPropuesta) => aplicar(rechazarPropuesta(taxonomia, idPropuesta)),
  }
}
