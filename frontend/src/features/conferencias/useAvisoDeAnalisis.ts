import { useEffect } from 'react'
import { usePreferencias } from '@/features/configuracion/preferencias'
import { avisarTermino } from '@/shared/avisos/avisoDeTermino'
import { listarEstadosDeAnalisis } from './repositorio'

/*
  Avisa cuando termina un análisis, esté donde esté la persona dentro de la
  app. Vive en el armazón y no en la pantalla de conferencias porque quien
  lanza un análisis largo se va a otra sección a esperar, y ahí la pantalla
  que lo sabía ya no está montada.

  Pregunta a la base cada quince segundos, y avisa de una conferencia cuando
  pasa de `en-cola`/`procesando` a `procesada`. La primera lectura solo
  aprende qué había: sin eso, entrar a la app avisaría de análisis que
  terminaron ayer.
*/
const INTERVALO_MS = 15_000

export function useAvisoDeAnalisis(idUsuario: string): void {
  const { avisarAlTerminar } = usePreferencias()

  useEffect(() => {
    if (idUsuario === '' || !avisarAlTerminar) {
      return
    }

    let anteriores: Map<string, string> | null = null
    let vivo = true

    async function revisar(): Promise<void> {
      const resultado = await listarEstadosDeAnalisis(idUsuario)

      if (!vivo || !resultado.ok) {
        return
      }

      const actuales = new Map(resultado.datos.map((fila) => [fila.id, fila.estado]))

      if (anteriores !== null) {
        const terminadas = resultado.datos.filter((fila) => {
          const antes = anteriores?.get(fila.id)
          return fila.estado === 'procesada' && (antes === 'en-cola' || antes === 'procesando')
        })

        const primera = terminadas[0]

        if (primera !== undefined) {
          avisarTermino(terminadas.length === 1 ? `«${primera.titulo}» analizada` : `${terminadas.length} análisis listos`)
        }
      }

      anteriores = actuales
    }

    void revisar()
    const intervalo = setInterval(() => void revisar(), INTERVALO_MS)

    return () => {
      vivo = false
      clearInterval(intervalo)
    }
  }, [idUsuario, avisarAlTerminar])
}
