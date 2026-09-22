import { useEffect } from 'react'
import { cambiarPreferencia, usePreferencias, usePreferenciasLeidas } from '@/features/configuracion/preferencias'
import { iniciarRecorrido } from './recorridoGuiado'

/*
  El recorrido se abre solo la primera vez que alguien entra, y nunca más:
  que lo haya visto se guarda en su cuenta, así que tampoco reaparece en otro
  equipo. Se repite a mano desde Configuración.

  Espera a que lleguen las preferencias de la cuenta (con el valor por
  defecto se abriría a quien ya lo vio) y a que el dock termine de entrar,
  que tarda 0,7 s: resaltar un elemento que todavía se está moviendo deja el
  recorte fuera de sitio. Solo en pantallas donde el dock está a la vista.
*/
const ESPERA_A_QUE_ENTRE_EL_DOCK_MS = 900

export function useRecorridoInicial(): void {
  const leidas = usePreferenciasLeidas()
  const { tutorialVisto } = usePreferencias()

  useEffect(() => {
    if (!leidas || tutorialVisto) {
      return
    }

    if (typeof window.matchMedia !== 'function' || !window.matchMedia('(min-width: 768px)').matches) {
      return
    }

    const espera = setTimeout(() => {
      iniciarRecorrido(() => void cambiarPreferencia('tutorialVisto', true))
    }, ESPERA_A_QUE_ENTRE_EL_DOCK_MS)

    return () => clearTimeout(espera)
  }, [leidas, tutorialVisto])
}
