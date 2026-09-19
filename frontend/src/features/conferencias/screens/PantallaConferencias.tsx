import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router'
import { PARAMETRO_DE_CREACION } from '@/app/layout/navegacion'
import { useSession } from '@/features/auth/session'
import { useTemas } from '@/features/taxonomia'
import { PanelDeCarga, useConferenciasVisibles } from '../components'
import { actualizarEstadoDeValidacion } from '../repositorio/repositorio'
import { PantallaArchivo } from './PantallaArchivo'

/*
  Conferencias y fichas en una sola sección.

  Esta pantalla ya no lista nada por su cuenta: eso lo hace `PantallaArchivo`,
  con el modelo de columnas de la referencia. Aquí queda lo que rodea a ese
  recorrido — el título, el panel de carga y el parámetro `?nuevo=1` con el
  que el dock pide abrirlo.
*/
export function PantallaConferencias(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { carga, visibles, fichas, error, recargar } = useConferenciasVisibles(idUsuario)
  const { temas } = useTemas()
  const [params, setParams] = useSearchParams()
  const [panelDeCargaAbierto, setPanelDeCargaAbierto] = useState(false)

  /*
    "Cargar conferencia" vive en el dock y llega como `?nuevo=1`. Va en un
    efecto y no en el valor inicial porque quien pulsa la acción puede estar
    ya en esta pantalla: entonces la ruta no se remonta, solo cambia la
    consulta. El parámetro se borra al abrir para que recargar no lo reabra.
  */
  useEffect(() => {
    if (params.get(PARAMETRO_DE_CREACION) === null) {
      return
    }

    setPanelDeCargaAbierto(true)

    const siguiente = new URLSearchParams(params)
    siguiente.delete(PARAMETRO_DE_CREACION)
    setParams(siguiente, { replace: true })
  }, [params, setParams])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* El título y los controles viven dentro del archivo, en el mismo renglón. */}
      <PantallaArchivo
        visibles={visibles}
        fichas={fichas}
        temas={temas}
        cargando={carga === 'cargando'}
        error={error}
        alCargarConferencia={() => setPanelDeCargaAbierto(true)}
        /*
          Quién puede validar lo decide la política de RLS; si la rechaza, la
          ficha se queda como estaba. Cuando la acepta, se vuelven a pedir.
        */
        alValidar={(idFicha) => {
          void actualizarEstadoDeValidacion(idFicha, 'validada').then((respuesta) => {
            if (respuesta.ok) recargar()
          })
        }}
      />

      <PanelDeCarga
        abierto={panelDeCargaAbierto}
        alCerrar={() => setPanelDeCargaAbierto(false)}
        alCargar={() => {
          setPanelDeCargaAbierto(false)
          recargar()
        }}
      />
    </div>
  )
}
