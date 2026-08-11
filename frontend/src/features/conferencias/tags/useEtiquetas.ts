import { useCallback, useState } from 'react'
import type { EspacioDeEtiquetas } from '../data'
import { espacioDe, guardarEspacio } from './almacenamiento'
import { asignarEtiqueta, crearEtiqueta, quitarEtiqueta } from './etiquetas'
import type { ResultadoEspacio, ResultadoEtiqueta } from './etiquetas'

/*
  Estado de las etiquetas de quien tiene la sesión abierta.

  Es un envoltorio fino sobre las operaciones puras de `etiquetas.ts`: aquí solo
  se guarda el resultado y se persiste. Las reglas (nombre repetido, etiqueta
  ajena, longitud) ya están probadas sin React, así que este hook no las repite.

  Devuelve el resultado tal cual, incluido el fallo, para que la pantalla
  traduzca el código con `mensajeDeError` y no tenga que adivinar qué pasó.
*/

export type ValorDeEtiquetas = {
  readonly espacio: EspacioDeEtiquetas
  readonly crear: (nombre: string) => ResultadoEtiqueta
  readonly asignar: (idEtiqueta: string, idConferencia: string) => ResultadoEspacio
  readonly quitar: (idEtiqueta: string, idConferencia: string) => ResultadoEspacio
}

type EstadoDeEtiquetas = {
  readonly idUsuario: string
  readonly espacio: EspacioDeEtiquetas
}

export function useEtiquetas(idUsuario: string): ValorDeEtiquetas {
  const [estado, setEstado] = useState<EstadoDeEtiquetas>(() => ({
    idUsuario,
    espacio: espacioDe(idUsuario),
  }))

  /*
    Al cambiar de persona hay que releer el espacio. Se ajusta durante el
    render, que es el patrón que React documenta para estado derivado de una
    entrada, en vez de un efecto que dejaría un render intermedio mostrando las
    etiquetas de la sesión anterior.
  */
  if (estado.idUsuario !== idUsuario) {
    setEstado({ idUsuario, espacio: espacioDe(idUsuario) })
  }

  const espacio = estado.idUsuario === idUsuario ? estado.espacio : espacioDe(idUsuario)

  const guardar = useCallback(
    (espacioNuevo: EspacioDeEtiquetas) => {
      guardarEspacio(idUsuario, espacioNuevo)
      setEstado({ idUsuario, espacio: espacioNuevo })
    },
    [idUsuario],
  )

  const crear = useCallback(
    (nombre: string): ResultadoEtiqueta => {
      const resultado = crearEtiqueta(espacio, idUsuario, nombre)

      if (resultado.ok) {
        guardar(resultado.espacio)
      }

      return resultado
    },
    [espacio, guardar, idUsuario],
  )

  const asignar = useCallback(
    (idEtiqueta: string, idConferencia: string): ResultadoEspacio => {
      const resultado = asignarEtiqueta(espacio, idEtiqueta, idConferencia)

      if (resultado.ok) {
        guardar(resultado.espacio)
      }

      return resultado
    },
    [espacio, guardar],
  )

  const quitar = useCallback(
    (idEtiqueta: string, idConferencia: string): ResultadoEspacio => {
      const resultado = quitarEtiqueta(espacio, idEtiqueta, idConferencia)

      if (resultado.ok) {
        guardar(resultado.espacio)
      }

      return resultado
    },
    [espacio, guardar],
  )

  return { espacio, crear, asignar, quitar }
}
