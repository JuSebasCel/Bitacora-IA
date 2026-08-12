import { useCallback, useState } from 'react'
import type { Evento, Ponente } from '../data'
import { agregarEvento, agregarPonente, todosLosEventos, todosLosPonentes } from './almacenamiento'
import { crearEvento, crearPonente } from './directorio'
import type { ResultadoEvento, ResultadoPonente } from './directorio'

/*
  Envoltorio fino sobre `directorio.ts`, mismo criterio que `useEtiquetas`.

  No hay `idUsuario` aquí: el directorio es del grupo, no de una persona, así
  que no hace falta ajustar el estado al cambiar de sesión.
*/

export type ValorDeDirectorio = {
  readonly eventos: readonly Evento[]
  readonly ponentes: readonly Ponente[]
  readonly crearEvento: (nombre: string) => ResultadoEvento
  readonly crearPonente: (idEvento: string, nombre: string) => ResultadoPonente
}

export function useDirectorio(): ValorDeDirectorio {
  const [estado, setEstado] = useState(() => ({
    eventos: todosLosEventos(),
    ponentes: todosLosPonentes(),
  }))

  const crear = useCallback(
    (nombre: string): ResultadoEvento => {
      const resultado = crearEvento(estado.eventos, nombre)

      if (resultado.ok) {
        agregarEvento(resultado.evento)
        setEstado((anterior) => ({ ...anterior, eventos: [...anterior.eventos, resultado.evento] }))
      }

      return resultado
    },
    [estado.eventos],
  )

  const crearDePonente = useCallback(
    (idEvento: string, nombre: string): ResultadoPonente => {
      const resultado = crearPonente(estado.ponentes, idEvento, nombre)

      if (resultado.ok) {
        agregarPonente(resultado.ponente)
        setEstado((anterior) => ({
          ...anterior,
          ponentes: [...anterior.ponentes, resultado.ponente],
        }))
      }

      return resultado
    },
    [estado.ponentes],
  )

  return {
    eventos: estado.eventos,
    ponentes: estado.ponentes,
    crearEvento: crear,
    crearPonente: crearDePonente,
  }
}
