import { useCallback, useEffect, useState } from 'react'
import { ESPACIO_DE_ETIQUETAS_VACIO } from '../data'
import type { EspacioDeEtiquetas } from '../data'
import {
  asignarEtiqueta,
  crearEtiqueta,
  etiquetasDeConferencia,
  quitarEtiqueta,
} from './etiquetas'
import type { EtiquetaVisible, ResultadoEspacio, ResultadoEtiqueta } from './etiquetas'
import {
  asignarEtiquetaRemota,
  crearEtiquetaRemota,
  leerEtiquetasVisiblesPorConferencia,
  leerMiEspacio,
  quitarAsignacionRemota,
} from './repositorio'

/*
  Estado de las etiquetas personales de quien tiene la sesión abierta (B10).

  Antes vivía en sessionStorage y todo era síncrono. Ahora el espacio propio se
  carga de Supabase, y crear/asignar/quitar escriben la fila y actualizan el
  estado local de inmediato — sin recargar: una relectura de fondo solo
  serviría para hacer parpadear lo que ya se sabe correcto.

  Las reglas puras de `etiquetas.ts` no se tiran: validan antes de gastar el
  viaje —nombre vacío, muy largo, repetido, etiqueta ajena— para dar el
  mensaje con nombre propio de inmediato. Postgres vuelve a comprobarlo: la
  restricción `unique` sobre (propietario, nombre) es la que atrapa de verdad
  el choque si dos pestañas crean a la vez.

  `visiblesDe` compone dos cosas: las etiquetas propias asignadas a esa
  conferencia (derivadas del espacio, así que un cambio optimista se refleja
  al instante) y las del dueño de una conferencia compartida. Estas últimas
  llegan de `mis_etiquetas_visibles`, porque RLS no deja al invitado leer el
  espacio ajeno directamente; no cambian por ninguna acción de esta persona,
  así que se guardan una vez y no se vuelven a tocar.
*/

export type ValorDeEtiquetas = {
  readonly espacio: EspacioDeEtiquetas
  readonly cargando: boolean
  readonly visiblesDe: (idConferencia: string) => readonly EtiquetaVisible[]
  readonly crear: (nombre: string) => Promise<ResultadoEtiqueta>
  readonly asignar: (idEtiqueta: string, idConferencia: string) => Promise<ResultadoEspacio>
  readonly quitar: (idEtiqueta: string, idConferencia: string) => Promise<ResultadoEspacio>
}

const MAPA_VACIO: ReadonlyMap<string, readonly EtiquetaVisible[]> = new Map()

export function useEtiquetas(idUsuario: string): ValorDeEtiquetas {
  const [espacio, setEspacio] = useState<EspacioDeEtiquetas>(ESPACIO_DE_ETIQUETAS_VACIO)
  const [ajenasPorConferencia, setAjenasPorConferencia] = useState(MAPA_VACIO)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let cancelado = false

    if (idUsuario === '') {
      setEspacio(ESPACIO_DE_ETIQUETAS_VACIO)
      setAjenasPorConferencia(MAPA_VACIO)
      setCargando(false)
      return
    }

    setCargando(true)

    Promise.all([leerMiEspacio(), leerEtiquetasVisiblesPorConferencia()]).then(
      ([miEspacio, mapa]) => {
        if (cancelado) return
        if (miEspacio.ok) setEspacio(miEspacio.datos)
        if (mapa.ok) {
          const soloAjenas = new Map<string, readonly EtiquetaVisible[]>()
          for (const [idConferencia, visibles] of mapa.datos) {
            const ajenas = visibles.filter((visible) => !visible.propia)
            if (ajenas.length > 0) soloAjenas.set(idConferencia, ajenas)
          }
          setAjenasPorConferencia(soloAjenas)
        }
        setCargando(false)
      },
    )

    return () => {
      cancelado = true
    }
  }, [idUsuario])

  const visiblesDe = useCallback(
    (idConferencia: string): readonly EtiquetaVisible[] => {
      const propias: readonly EtiquetaVisible[] = etiquetasDeConferencia(
        espacio,
        idConferencia,
      ).map((etiqueta) => ({ etiqueta, propia: true }))

      return [...propias, ...(ajenasPorConferencia.get(idConferencia) ?? [])]
    },
    [espacio, ajenasPorConferencia],
  )

  const crear = useCallback(
    async (nombre: string): Promise<ResultadoEtiqueta> => {
      const previo = crearEtiqueta(espacio, idUsuario, nombre)
      if (!previo.ok) {
        return previo
      }

      const remoto = await crearEtiquetaRemota(nombre, idUsuario)
      if (!remoto.ok) {
        return { ok: false, codigo: remoto.codigo }
      }

      const espacioNuevo: EspacioDeEtiquetas = {
        etiquetas: [...espacio.etiquetas, remoto.datos],
        asignaciones: espacio.asignaciones,
      }
      setEspacio(espacioNuevo)

      return { ok: true, etiqueta: remoto.datos, espacio: espacioNuevo }
    },
    [espacio, idUsuario],
  )

  const asignar = useCallback(
    async (idEtiqueta: string, idConferencia: string): Promise<ResultadoEspacio> => {
      const previo = asignarEtiqueta(espacio, idEtiqueta, idConferencia)
      if (!previo.ok) {
        return previo
      }

      const remoto = await asignarEtiquetaRemota(idEtiqueta, idConferencia)
      if (!remoto.ok) {
        return { ok: false, codigo: remoto.codigo }
      }

      setEspacio(previo.espacio)
      return previo
    },
    [espacio],
  )

  const quitar = useCallback(
    async (idEtiqueta: string, idConferencia: string): Promise<ResultadoEspacio> => {
      const previo = quitarEtiqueta(espacio, idEtiqueta, idConferencia)
      if (!previo.ok) {
        return previo
      }

      const remoto = await quitarAsignacionRemota(idEtiqueta, idConferencia)
      if (!remoto.ok) {
        return { ok: false, codigo: remoto.codigo }
      }

      setEspacio(previo.espacio)
      return previo
    },
    [espacio],
  )

  return { espacio, cargando, visiblesDe, crear, asignar, quitar }
}
