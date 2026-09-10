import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { fichasVisibles } from '@/features/conferencias/query'
import { useDocxDePlantilla } from '@/features/plantillas/useDocxDePlantilla'
import { usePlantillas } from '@/features/plantillas/usePlantillas'
import { leerTaxonomia } from '@/features/taxonomia'
import type { CodigoError } from '@/shared/errors'
import { mensajeDeError } from '@/shared/errors'
import { Esqueleto, PanelDeError } from '@/shared/ui'
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

  Desde B6 hay un tercer ingrediente que llega por red: si la plantilla es una
  importada, sus bytes viven en el bucket `plantillas-docx` y se descargan aquí
  (`useDocxDePlantilla`) antes de generar. Por eso la pantalla distingue con
  cuidado "todavía no llegó" de "no existe": mientras cualquiera de las tres
  lecturas sigue en curso, decir "no encontramos esa memoria" sería mentir.
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
  const { memorias, cargando: cargandoMemorias } = useMemorias()
  const { visibles, fichas: fichasVisiblesTodas, carga } = useConferenciasVisibles(idUsuario)
  const { plantillas, cargando: cargandoPlantillas } = usePlantillas()

  const memoria = memorias.find((candidata) => candidata.id === idMemoria)
  const conferenciaVisible = visibles.find((visible) => visible.conferencia.id === memoria?.idConferencia)
  const plantilla = plantillas.find((candidata) => candidata.id === memoria?.idPlantilla)

  const rutaDelDocx = plantilla?.origen === 'docx' ? plantilla.rutaArchivoOriginal : null
  const { archivo, codigoDeError: errorDelDocx } = useDocxDePlantilla(rutaDelDocx)

  /*
    El campo fijo `tema_principal` sale del id que guarda la conferencia, así
    que la generación necesita el pool para escribir el nombre. Se lee una vez
    por montaje y no dentro del efecto, para que un arreglo nuevo en cada
    render no vuelva a disparar la generación en bucle.
  */
  const temas = useMemo(() => leerTaxonomia().temas, [])

  const [resultado, setResultado] = useState<ResultadoDeMemoria | null>(null)
  const [error, setError] = useState<CodigoError | null>(null)

  const cargandoOrigen = cargandoMemorias || cargandoPlantillas || carga === 'cargando'

  useEffect(() => {
    if (cargandoOrigen || memoria === undefined) {
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

    /* Plantilla importada cuyo archivo todavía no llegó: se espera, sin borrar lo que ya se veía. */
    if (rutaDelDocx !== null && archivo === null) {
      if (errorDelDocx !== null) {
        setError(errorDelDocx)
      }
      return
    }

    let cancelado = false
    setError(null)
    setResultado(null)

    const fichas = fichasVisibles(fichasVisiblesTodas, conferenciaVisible)

    const bytes = archivo === null ? Promise.resolve(null) : archivo.arrayBuffer()

    bytes
      .then((datos) => generarMemoria(plantilla, conferenciaVisible.conferencia, fichas, temas, datos))
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
  }, [cargandoOrigen, memoria, conferenciaVisible, plantilla, rutaDelDocx, archivo, errorDelDocx, temas])

  if (cargandoOrigen) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <Esqueleto filas={4} etiqueta="Cargando la memoria" />
      </div>
    )
  }

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
