import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { EncabezadoDeSeccion } from '@/shared/ui'
import { ControlesDelListado, ListadoDeConferencias, useConferenciasVisibles } from '../components'
import type { DatosDeFila, EstadoDelListado } from '../components'
import { FICHAS_DE_EJEMPLO } from '../data'
import {
  CRITERIOS_POR_DEFECTO,
  escribirCriterios,
  fichasVisibles,
  leerCriterios,
  listarConferencias,
  privacidadEfectiva,
} from '../query'
import type { CriteriosDeListado } from '../query'
import { espacioDe, etiquetasVisibles, useEtiquetas } from '../tags'

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
  const { espacio, crear } = useEtiquetas(idUsuario)
  const { carga, visibles } = useConferenciasVisibles(idUsuario)
  const [errorDeEtiqueta, setErrorDeEtiqueta] = useState<string | null>(null)

  const idsDeEtiqueta = useMemo(
    () => espacio.etiquetas.map((etiqueta) => etiqueta.id),
    [espacio.etiquetas],
  )

  const criterios = useMemo(() => leerCriterios(params, idsDeEtiqueta), [params, idsDeEtiqueta])

  const listadas = useMemo(
    () =>
      listarConferencias({
        visibles,
        criterios,
        asignaciones: espacio.asignaciones,
        fichas: FICHAS_DE_EJEMPLO,
      }),
    [visibles, criterios, espacio.asignaciones],
  )

  const filas: readonly DatosDeFila[] = useMemo(
    () =>
      listadas.map((visible) => ({
        visible,
        numeroDeFichas: fichasVisibles(FICHAS_DE_EJEMPLO, visible).length,
        etiquetas: etiquetasVisibles({
          espacioPropio: espacio,
          espacioDelDueno:
            visible.procedencia === 'compartida' ? espacioDe(visible.conferencia.idDueno) : null,
          idConferencia: visible.conferencia.id,
          compartirEtiquetas: privacidadEfectiva(visible).compartirEtiquetas,
        }),
      })),
    [listadas, espacio],
  )

  /*
    La búsqueda reemplaza la entrada del historial en vez de apilar una nueva:
    si no, volver atrás obligaría a deshacer el texto letra por letra.
  */
  function aplicar(nuevos: CriteriosDeListado, reemplazar = false): void {
    setParams(escribirCriterios(nuevos), { replace: reemplazar })
  }

  function alCrearEtiqueta(nombre: string): void {
    const resultado = crear(nombre)

    setErrorDeEtiqueta(resultado.ok ? null : mensajeDeError(resultado.codigo))
  }

  const hayConferencias = visibles.length > 0

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
        <ControlesDelListado
          criterios={criterios}
          etiquetas={espacio.etiquetas}
          mensajeDeEtiqueta={errorDeEtiqueta}
          alCambiar={(nuevos) => aplicar(nuevos)}
          alBuscar={(busqueda) => aplicar({ ...criterios, busqueda }, true)}
          alCrearEtiqueta={alCrearEtiqueta}
        />

        <ListadoDeConferencias
          estado={estadoDelListado}
          filas={filas}
          segmento={criterios.segmento}
          busqueda={params.toString() === '' ? '' : `?${params.toString()}`}
          alQuitarFiltros={() => aplicar(CRITERIOS_POR_DEFECTO)}
        />
      </div>
    </>
  )
}
