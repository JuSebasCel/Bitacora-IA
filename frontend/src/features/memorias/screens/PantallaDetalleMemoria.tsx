import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { fichasVisibles } from '@/features/conferencias/query'
import { usePlantillas } from '@/features/plantillas/usePlantillas'
import type { CodigoError } from '@/shared/errors'
import { mensajeDeError } from '@/shared/errors'
import { PanelDeError } from '@/shared/ui'
import { VistaPreviaDeMemoria } from '../components'
import type { ResultadoDeMemoria } from '../generarMemoria'
import { generarMemoria } from '../generarMemoria'
import { useMemorias } from '../useMemorias'

/*
  Vista de una memoria ya generada. Nunca muestra un documento congelado: la
  memoria guardada es solo la referencia (`idConferencia`/`idPlantilla`), así
  que aquí se resuelve esa conferencia y esa plantilla de nuevo y se vuelve a
  correr `generarMemoria` — si cualquiera de las dos ya no existe, se avisa en
  vez de mostrar un documento a medias.
*/

function EnlaceDeRegreso(): ReactElement {
  return (
    <Link to="/memorias" className="inline-flex w-fit items-center text-sm text-texto-tenue hover:text-acento">
      Volver a memorias
    </Link>
  )
}

export function PantallaDetalleMemoria(): ReactElement {
  const { idMemoria = '' } = useParams()
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { memorias } = useMemorias()
  const { visibles } = useConferenciasVisibles(idUsuario)
  const { plantillas } = usePlantillas()

  const memoria = memorias.find((candidata) => candidata.id === idMemoria)
  const conferenciaVisible = visibles.find((visible) => visible.conferencia.id === memoria?.idConferencia)
  const plantilla = plantillas.find((candidata) => candidata.id === memoria?.idPlantilla)

  const [resultado, setResultado] = useState<ResultadoDeMemoria | null>(null)
  const [error, setError] = useState<CodigoError | null>(null)

  useEffect(() => {
    if (memoria === undefined) {
      return
    }

    if (conferenciaVisible === undefined) {
      setError('CONF_NO_ENCONTRADA')
      return
    }

    if (plantilla === undefined) {
      setError('PLANT_NO_ENCONTRADA')
      return
    }

    let cancelado = false
    setError(null)
    setResultado(null)

    const fichas = fichasVisibles(FICHAS_DE_EJEMPLO, conferenciaVisible)

    generarMemoria(plantilla, conferenciaVisible.conferencia, fichas)
      .then((valor) => {
        if (!cancelado) {
          setResultado(valor)
        }
      })
      .catch(() => {
        if (!cancelado) {
          setError('MEM_FALLO_GENERACION')
        }
      })

    return () => {
      cancelado = true
    }
  }, [memoria, conferenciaVisible, plantilla])

  if (memoria === undefined) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <PanelDeError mensaje={mensajeDeError('MEM_NO_ENCONTRADA')} />
        <EnlaceDeRegreso />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 border-t border-filete-fuerte pt-6">
      <h1 className="text-lg font-semibold tracking-tight text-texto">{memoria.nombre}</h1>
      <EnlaceDeRegreso />

      {error !== null ? (
        <PanelDeError mensaje={mensajeDeError(error)} />
      ) : resultado === null ? (
        <p className="text-sm text-texto-tenue">Generando la memoria…</p>
      ) : (
        <VistaPreviaDeMemoria resultado={resultado} nombre={memoria.nombre} />
      )}
    </div>
  )
}
