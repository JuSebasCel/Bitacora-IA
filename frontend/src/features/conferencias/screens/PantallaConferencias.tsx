import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { Button, EncabezadoDeSeccion } from '@/shared/ui'
import {
  ControlesDelListado,
  ListadoDeConferencias,
  PanelDeCarga,
  useConferenciasVisibles,
} from '../components'
import type { DatosDeFila, EstadoDelListado, ResultadoCreacion } from '../components'
import { useConferenciasOcultas } from '../ocultas'
import {
  CRITERIOS_POR_DEFECTO,
  escribirCriterios,
  fichasVisibles,
  leerCriterios,
  listarConferencias,
} from '../query'
import type { CriteriosDeListado } from '../query'
import { useEtiquetas } from '../tags'

/*
  Dashboard de conferencias (F2).

  Los criterios viven en la URL, así que esta pantalla no guarda estado de
  filtros: los lee de la cadena de consulta en cada render y los escribe de
  vuelta al cambiarlos. Lo único que guarda es el último error de creación de
  etiqueta, que es efímero y no tiene sentido en un enlace compartido.

  Sustituye al marcador de posición que dejó F1 en `/conferencias`.
*/

const DESCRIPCION =
  'Reúne las conferencias propias y las compartidas contigo, con su tema principal, su estado de procesamiento y el número de fichas obtenidas.'

function hayFiltrosAplicados(criterios: CriteriosDeListado): boolean {
  return (
    criterios.busqueda.trim().length > 0 ||
    criterios.estado !== CRITERIOS_POR_DEFECTO.estado ||
    criterios.etiquetas.length > 0
  )
}

export function PantallaConferencias() {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''

  const [params, setParams] = useSearchParams()
  const { espacio, crear, asignar, quitar, visiblesDe } = useEtiquetas(idUsuario)
  const { carga, visibles, fichas, recargar } = useConferenciasVisibles(idUsuario)
  const { idsOcultos, ocultar, mostrar } = useConferenciasOcultas(idUsuario)
  const [panelDeCargaAbierto, setPanelDeCargaAbierto] = useState(false)

  const idsDeEtiqueta = useMemo(
    () => espacio.etiquetas.map((etiqueta) => etiqueta.id),
    [espacio.etiquetas],
  )

  /*
    Ocultar una conferencia es una preferencia de vista, no una regla de
    acceso: se resuelve aquí, sobre lo que la sesión puede ver, antes de que
    los filtros y la búsqueda entren a jugar. Por eso cuenta igual que
    "visible" para decidir entre los dos vacíos de abajo.
  */
  const visiblesSinOcultas = useMemo(
    () => visibles.filter((visible) => !idsOcultos.includes(visible.conferencia.id)),
    [visibles, idsOcultos],
  )

  const criterios = useMemo(() => leerCriterios(params, idsDeEtiqueta), [params, idsDeEtiqueta])

  const listadas = useMemo(
    () =>
      listarConferencias({
        visibles: visiblesSinOcultas,
        criterios,
        asignaciones: espacio.asignaciones,
        fichas,
      }),
    [visiblesSinOcultas, criterios, espacio.asignaciones, fichas],
  )

  const filas: readonly DatosDeFila[] = useMemo(
    () =>
      listadas.map((visible) => ({
        visible,
        numeroDeFichas: fichasVisibles(fichas, visible).length,
        etiquetas: visiblesDe(visible.conferencia.id),
      })),
    [listadas, fichas, visiblesDe],
  )

  /*
    Los cambios se aplican sobre los criterios que la URL tenga en ese momento,
    no sobre los del render actual. Con la forma directa, dos cambios seguidos
    antes de un re-render se pisaban entre sí: elegir un origen y escribir en la
    búsqueda a continuación descartaba el origen recién elegido.

    La búsqueda además reemplaza la entrada del historial en vez de apilar una
    nueva, o volver atrás obligaría a deshacer el texto letra por letra.
  */
  function aplicar(cambio: Partial<CriteriosDeListado>, reemplazar = false): void {
    setParams(
      (anteriores) => escribirCriterios({ ...leerCriterios(anteriores, idsDeEtiqueta), ...cambio }),
      { replace: reemplazar },
    )
  }

  function alternarEtiqueta(idEtiqueta: string): void {
    setParams((anteriores) => {
      const previos = leerCriterios(anteriores, idsDeEtiqueta)
      const etiquetas = previos.etiquetas.includes(idEtiqueta)
        ? previos.etiquetas.filter((id) => id !== idEtiqueta)
        : [...previos.etiquetas, idEtiqueta]

      return escribirCriterios({ ...previos, etiquetas })
    })
  }

  /*
    El diálogo de creación necesita el mensaje ya traducido en el momento de
    intentar crear, no un estado que le llegue en un render posterior: así
    puede decidir por sí solo si se cierra (éxito) o se queda abierto con el
    error (fallo), sin que la pantalla tenga que mantener ese estado por él.
    También devuelve la etiqueta creada, para que quien la pidió desde una fila
    concreta pueda asignarla ahí mismo sin un segundo viaje.
  */
  async function alCrearEtiqueta(nombre: string): Promise<ResultadoCreacion> {
    const resultado = await crear(nombre)

    return resultado.ok
      ? { ok: true, etiqueta: resultado.etiqueta }
      : { ok: false, mensaje: mensajeDeError(resultado.codigo) }
  }

  /** Poner o quitar una etiqueta propia sobre una conferencia concreta, desde su fila. */
  function alAlternarAsignacion(idEtiqueta: string, idConferencia: string): void {
    const yaAsignada = espacio.asignaciones.some(
      (asignacion) => asignacion.idEtiqueta === idEtiqueta && asignacion.idConferencia === idConferencia,
    )

    void (yaAsignada ? quitar(idEtiqueta, idConferencia) : asignar(idEtiqueta, idConferencia))
  }

  /** Crear una etiqueta nueva y asignarla de una vez a la conferencia desde la que se pidió. */
  async function alCrearYAsignarEtiqueta(
    nombre: string,
    idConferencia: string,
  ): Promise<ResultadoCreacion> {
    const resultado = await alCrearEtiqueta(nombre)

    if (resultado.ok) {
      await asignar(resultado.etiqueta.id, idConferencia)
    }

    return resultado
  }

  const hayConferencias = visiblesSinOcultas.length > 0

  const estadoDelListado: EstadoDelListado =
    carga === 'cargando'
      ? 'cargando'
      : filas.length > 0
        ? 'listo'
        : hayConferencias && hayFiltrosAplicados(criterios)
          ? 'vacio-por-filtros'
          : 'vacio-sin-datos'

  return (
    <>
      <EncabezadoDeSeccion titulo="Conferencias" descripcion={DESCRIPCION} />

      <div className="mt-6 flex flex-col gap-6">
        <div className="flex justify-end">
          <Button variante="secundario" onClick={() => setPanelDeCargaAbierto(true)}>
            <PlusIcon size={14} weight="bold" aria-hidden="true" />
            Cargar conferencia
          </Button>
        </div>

        <ControlesDelListado
          criterios={criterios}
          etiquetas={espacio.etiquetas}
          alCambiar={(cambio) => aplicar(cambio)}
          alBuscar={(busqueda) => aplicar({ busqueda }, true)}
          alAlternarEtiqueta={alternarEtiqueta}
          alCrearEtiqueta={alCrearEtiqueta}
        />

        <ListadoDeConferencias
          estado={estadoDelListado}
          filas={filas}
          segmento={criterios.segmento}
          busqueda={params.toString() === '' ? '' : `?${params.toString()}`}
          alQuitarFiltros={() => aplicar(CRITERIOS_POR_DEFECTO)}
          misEtiquetas={espacio.etiquetas}
          alAlternarAsignacion={alAlternarAsignacion}
          alCrearYAsignar={alCrearYAsignarEtiqueta}
          alOcultar={ocultar}
        />

        {/*
          Quitar una conferencia del listado no borra nada, pero hasta ahora
          tampoco tenía vuelta atrás desde la interfaz: había que conocer la
          URL directa. Esta línea es la salida, y de paso hace visible que lo
          ocultado sigue ahí.
        */}
        {idsOcultos.length === 0 ? null : (
          <p className="text-xs text-texto-tenue">
            {idsOcultos.length === 1
              ? 'Hay 1 conferencia oculta de tu listado.'
              : `Hay ${idsOcultos.length} conferencias ocultas de tu listado.`}{' '}
            <button
              type="button"
              onClick={() => idsOcultos.forEach(mostrar)}
              className="rounded-md text-acento underline underline-offset-2 transition-colors hover:text-texto"
            >
              Volver a mostrarlas
            </button>
          </p>
        )}
      </div>

      <PanelDeCarga
        abierto={panelDeCargaAbierto}
        alCerrar={() => setPanelDeCargaAbierto(false)}
        alCargar={() => {
          setPanelDeCargaAbierto(false)
          recargar()
        }}
      />
    </>
  )
}
