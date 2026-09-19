import type { ReactElement } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PARAMETRO_DE_CREACION } from '@/app/layout/navegacion'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components/useConferenciasVisibles'
import { usePlantillas } from '@/features/plantillas/usePlantillas'
import { mensajeDeError } from '@/shared/errors'
import { BotonPildora, EstadoVacioIlustrado, Esqueleto, PanelDeError, SelectorDeVista } from '@/shared/ui'
import type { OpcionDeVista } from '@/shared/ui'
import { BarraDeBusquedaDeMemorias, PanelDeGenerarMemoria, TarjetaDeMemoria } from '../components'
import { CRITERIOS_POR_DEFECTO, listarMemorias } from '../filtros'
import type { EntradaDeMemoria } from '../filtros'
import { escribirCriteriosDeMemorias, leerCriteriosDeMemorias } from '../parametros'
import { useMemorias } from '../useMemorias'

/*
  Listado de memorias (F5): las ya generadas, más el flujo para generar una
  nueva sobre una conferencia procesada y una plantilla guardada. Una memoria
  no se edita — solo se ve (`/memorias/:idMemoria`, donde se regenera al
  vuelo) o se elimina.

  `?conferencia=<id>` preselecciona y abre el panel automáticamente: es el
  punto de entrada desde el botón "Generar memoria" del detalle de una
  conferencia específica. `escribirCriteriosDeMemorias` conserva ese
  parámetro al escribir la búsqueda (ver `parametros.ts`), así que los dos
  conviven sin pisarse.
*/

type Vista = 'grilla' | 'lista'

const VISTAS: readonly [OpcionDeVista<Vista>, OpcionDeVista<Vista>] = [
  { valor: 'grilla', icono: 'grid_view', etiqueta: 'Ver en grilla' },
  { valor: 'lista', icono: 'view_agenda', etiqueta: 'Ver en lista' },
]

function nombreDeConferencia(visibles: readonly { conferencia: { id: string; titulo: string } }[], id: string): string {
  return visibles.find((visible) => visible.conferencia.id === id)?.conferencia.titulo ?? 'Conferencia no disponible'
}

function nombreDePlantilla(plantillas: readonly { id: string; nombre: string }[], id: string): string {
  return plantillas.find((plantilla) => plantilla.id === id)?.nombre ?? 'Plantilla no disponible'
}

export function PantallaMemorias(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { memorias, cargando: cargandoMemorias, codigoDeError, generar, eliminar } = useMemorias(idUsuario)
  const { carga, visibles } = useConferenciasVisibles(idUsuario)
  const { plantillas } = usePlantillas()
  const [searchParams, setSearchParams] = useSearchParams()

  const idConferenciaPreseleccionada = searchParams.get('conferencia') ?? undefined
  const [panelAbierto, setPanelAbierto] = useState(idConferenciaPreseleccionada !== undefined)
  const [vista, setVista] = useState<Vista>('grilla')

  /*
    "Generar memoria" vive en el dock y llega como `?nuevo=1`. En un efecto y
    no en el valor inicial: quien pulsa la acción puede estar ya aquí, y
    entonces la ruta no se remonta. Se borra el parámetro al abrir para que
    recargar no reabra el panel solo.
  */
  useEffect(() => {
    if (searchParams.get(PARAMETRO_DE_CREACION) === null) {
      return
    }

    setPanelAbierto(true)

    const siguiente = new URLSearchParams(searchParams)
    siguiente.delete(PARAMETRO_DE_CREACION)
    setSearchParams(siguiente, { replace: true })
  }, [searchParams, setSearchParams])

  const criterios = useMemo(() => leerCriteriosDeMemorias(searchParams), [searchParams])

  const entradas: readonly EntradaDeMemoria[] = useMemo(
    () =>
      memorias.map((memoria) => ({
        memoria,
        nombreConferencia: nombreDeConferencia(visibles, memoria.idConferencia),
        nombrePlantilla: nombreDePlantilla(plantillas, memoria.idPlantilla),
      })),
    [memorias, visibles, plantillas],
  )

  const listadas = useMemo(() => listarMemorias({ entradas, criterios }), [entradas, criterios])

  const hayFiltrosAplicados = criterios.busqueda.trim().length > 0

  function alBuscar(busqueda: string): void {
    setSearchParams((anteriores) => escribirCriteriosDeMemorias({ busqueda }, anteriores), { replace: true })
  }

  function alQuitarFiltros(): void {
    setSearchParams((anteriores) => escribirCriteriosDeMemorias(CRITERIOS_POR_DEFECTO, anteriores))
  }

  function cerrarPanel(): void {
    setPanelAbierto(false)
    if (idConferenciaPreseleccionada !== undefined) {
      setSearchParams({}, { replace: true })
    }
  }

  return (
    <>
      {/*
        Título y controles en el mismo renglón, como la referencia. Antes el
        título iba solo y los controles en una fila aparte debajo, lo que
        gastaba una banda vertical entera antes de llegar al contenido.

        Y se fue la descripción: era un párrafo que se lee una vez en la vida
        del usuario y empujaba el contenido hacia abajo en cada visita. La
        referencia no pone texto explicativo bajo ningún título.
      */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-titulo text-[32px] leading-none font-semibold text-texto">Memorias</h1>

        {memorias.length === 0 ? null : (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
            <div className="min-w-48 flex-1 sm:max-w-96">
              <BarraDeBusquedaDeMemorias valor={criterios.busqueda} alCambiar={alBuscar} />
            </div>

            <SelectorDeVista opciones={VISTAS} valor={vista} alCambiar={setVista} />

            <BotonPildora variante="primario" icono="add" onClick={() => setPanelAbierto(true)}>
              Generar memoria
            </BotonPildora>
          </div>
        )}
      </div>

      {/*
        La acción y la búsqueda comparten renglón: son los dos controles de la
        pantalla y separarlos en dos filas dejaba una banda vacía entre el
        título y el listado.
      */}
      {/*
        El contenido vive dentro de un panel, no suelto sobre el fondo: es lo
        que más distancia había con la referencia, donde cada zona de trabajo
        es un contenedor redondeado con su propio aire.

        El panel va con filete y sin relleno, y las tarjetas rellenas dentro.
        Al revés —panel relleno con tarjetas del mismo tono— las tarjetas
        desaparecerían contra él.
      */}
      <div className="mt-8 flex min-h-112 flex-col rounded-[24px] p-6 shadow-[inset_0_0_0_1px_var(--bitacora-filete)]">
        {/*
          Se espera también a las conferencias, y no solo a las memorias: la
          tarjeta muestra el nombre de la conferencia de origen, y pintarla
          antes de que ese listado llegue diría "Conferencia no disponible"
          sobre memorias que están perfectamente bien.
        */}
        {cargandoMemorias || carga === 'cargando' ? (
          <Esqueleto filas={3} etiqueta="Cargando las memorias" />
        ) : codigoDeError !== null ? (
          <PanelDeError mensaje={mensajeDeError(codigoDeError)} />
        ) : listadas.length > 0 ? (
          <ul
            aria-label="Memorias"
            className={
              vista === 'grilla' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'
            }
          >
            {listadas.map(({ memoria, nombreConferencia, nombrePlantilla }) => (
              <li key={memoria.id}>
                <TarjetaDeMemoria
                  memoria={memoria}
                  nombreConferencia={nombreConferencia}
                  nombrePlantilla={nombrePlantilla}
                  alEliminar={() => void eliminar(memoria.id)}
                  variante={vista === 'grilla' ? 'tarjeta' : 'fila'}
                />
              </li>
            ))}
          </ul>
        ) : memorias.length > 0 && hayFiltrosAplicados ? (
          /*
            Los dos vacíos son la pantalla entera, así que van ilustrados, y
            cada uno con su icono: una búsqueda sin resultados y una cuenta
            sin memorias no son la misma situación, y la salida tampoco.
          */
          <EstadoVacioIlustrado
            icono="search_off"
            mensaje="Ninguna de tus memorias cumple lo que buscaste"
          >
            <BotonPildora onClick={alQuitarFiltros}>Quitar filtros</BotonPildora>
          </EstadoVacioIlustrado>
        ) : (
          <EstadoVacioIlustrado
            icono="book_2"
            mensaje="Elige una conferencia procesada y una plantilla guardada para generar tu primera memoria"
          >
            <BotonPildora variante="primario" icono="add" onClick={() => setPanelAbierto(true)}>
              Generar memoria
            </BotonPildora>
          </EstadoVacioIlustrado>
        )}
      </div>

      <PanelDeGenerarMemoria
        abierto={panelAbierto}
        alCerrar={cerrarPanel}
        {...(idConferenciaPreseleccionada === undefined ? {} : { idConferenciaPreseleccionada })}
        generar={generar}
        alGenerar={cerrarPanel}
      />
    </>
  )
}
