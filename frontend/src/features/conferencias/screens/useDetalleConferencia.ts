import { useCallback, useEffect, useState } from 'react'
import { obtenerConferencia as obtenerConferenciaRemota, listarFichasDe } from '../repositorio'
import { conferenciasVisibles } from '../query'
import type { ConferenciaVisible } from '../query'
import type { CodigoError } from '@/shared/errors'
import type { Ficha } from '../data'

/*
  Carga el detalle de una conferencia y sus fichas desde Supabase.

  `obtenerConferencia` del repositorio ya devuelve `CONF_NO_ENCONTRADA` tanto
  para una conferencia inexistente como para una que RLS no deja ver: la
  indistinguibilidad es deliberada y no se rompe aquí. La procedencia (propia
  o compartida) se deriva pasando la única fila por `conferenciasVisibles`,
  que es la misma función que usa el listado — así el detalle y el dashboard
  no pueden discrepar sobre qué es tuyo.

  Las fichas se cargan aparte y se pueden recargar solas: validar una ficha
  cambia una fila sin tocar la conferencia, y volver a pedir todo el detalle
  para reflejar ese cambio sería un viaje de más.
*/

export type ResultadoDetalle =
  | { readonly ok: true; readonly visible: ConferenciaVisible }
  | { readonly ok: false; readonly codigo: CodigoError }

export type ValorDetalleConferencia = {
  readonly carga: 'cargando' | 'listo'
  readonly resultado: ResultadoDetalle
  readonly fichas: readonly Ficha[]
  readonly recargarFichas: () => void
}

const PENDIENTE: ResultadoDetalle = { ok: false, codigo: 'CONF_NO_ENCONTRADA' }

export function useDetalleConferencia(
  idConferencia: string,
  idUsuario: string,
): ValorDetalleConferencia {
  const [carga, setCarga] = useState<'cargando' | 'listo'>('cargando')
  const [resultado, setResultado] = useState<ResultadoDetalle>(PENDIENTE)
  const [fichas, setFichas] = useState<readonly Ficha[]>([])
  const [versionFichas, setVersionFichas] = useState(0)

  useEffect(() => {
    let cancelado = false
    setCarga('cargando')

    obtenerConferenciaRemota(idConferencia).then((respuesta) => {
      if (cancelado) return

      if (!respuesta.ok) {
        setResultado({ ok: false, codigo: respuesta.codigo })
        setCarga('listo')
        return
      }

      const visible = conferenciasVisibles([respuesta.datos], idUsuario)[0]
      setResultado(
        visible === undefined ? { ok: false, codigo: 'CONF_NO_ENCONTRADA' } : { ok: true, visible },
      )
      setCarga('listo')
    })

    return () => {
      cancelado = true
    }
  }, [idConferencia, idUsuario])

  useEffect(() => {
    let cancelado = false

    listarFichasDe(idConferencia).then((respuesta) => {
      if (!cancelado && respuesta.ok) {
        setFichas(respuesta.datos)
      }
    })

    return () => {
      cancelado = true
    }
  }, [idConferencia, versionFichas])

  const recargarFichas = useCallback(() => setVersionFichas((anterior) => anterior + 1), [])

  return { carga, resultado, fichas, recargarFichas }
}
