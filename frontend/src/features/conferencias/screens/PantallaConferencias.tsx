import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { useSearchParams } from 'react-router'
import { PARAMETRO_DE_CREACION } from '@/app/layout/navegacion'
import { useSession } from '@/features/auth/session'
import { useTemas } from '@/features/taxonomia'
import { mensajeDeError } from '@/shared/errors'
import { ModalDeCarga, useConferenciasVisibles } from '../components'
import type { ResultadoCreacion } from '../components'
import { escribirCriterios, leerCriterios, listarConferencias } from '../query'
import type { CriteriosDeListado } from '../query'
import { actualizarEstadoDeValidacion } from '../repositorio/repositorio'
import { useEtiquetas } from '../tags'
import { PantallaArchivo } from './PantallaArchivo'

/*
  Conferencias y fichas en una sola sección.

  Esta pantalla no lista nada por su cuenta: eso lo hace `PantallaArchivo`,
  con el modelo de columnas de la referencia. Aquí queda lo que rodea a ese
  recorrido — los criterios, las etiquetas, el panel de carga y el parámetro
  `?nuevo=1` con el que el dock pide abrirlo.

  **Los criterios viven en la URL y no en estado de React.** Así una vista
  filtrada se comparte como enlace, sobrevive a un recargado y se conserva al
  volver de otra pantalla. La consecuencia es que la entrada es texto que
  cualquiera puede escribir a mano, y de eso ya se encarga `leerCriterios`:
  nada lanza, lo que no se reconoce cae al valor por defecto.

  El orden dejó de ser un control —el archivo se lee por fecha, de lo último a
  lo primero— pero sigue en los criterios porque sin él el listado cambiaría
  solo entre recargas.
*/
export function PantallaConferencias(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { carga, visibles, fichas, error, recargar } = useConferenciasVisibles(idUsuario)
  const { temas } = useTemas()
  const { espacio, visiblesDe, crear, asignar, quitar, eliminar } = useEtiquetas(idUsuario)
  const [params, setParams] = useSearchParams()
  const [panelDeCargaAbierto, setPanelDeCargaAbierto] = useState(false)

  /*
    El modal de carga crece desde el botón de la cabecera. También cuando lo
    abre el dock con `?nuevo=1`: el botón sigue en pantalla, así que el gesto
    se lee igual de bien venga de donde venga.
  */
  const botonDeCarga = useRef<HTMLElement>(null)
  const marco = useRef<HTMLDivElement>(null)

  const idsDeEtiqueta = useMemo(() => espacio.etiquetas.map((etiqueta) => etiqueta.id), [espacio.etiquetas])

  const criterios = useMemo(() => leerCriterios(params, idsDeEtiqueta), [params, idsDeEtiqueta])

  const listadas = useMemo(
    () =>
      listarConferencias({
        visibles,
        criterios,
        asignaciones: espacio.asignaciones,
        fichas,
      }),
    [visibles, criterios, espacio.asignaciones, fichas],
  )

  /*
    "Cargar conferencia" vive en el dock y llega como `?nuevo=1`. Va en un
    efecto y no en el valor inicial porque quien pulsa la acción puede estar
    ya en esta pantalla: entonces la ruta no se remonta, solo cambia la
    consulta. El parámetro se borra al abrir para que recargar no lo reabra,
    y se conserva el resto de la consulta para no tirar los filtros puestos.
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

  /*
    Los cambios se aplican sobre los criterios que la URL tenga en ese
    momento, no sobre los del render actual. Con la forma directa, dos cambios
    seguidos antes de un re-render se pisaban entre sí: elegir una procedencia
    y marcar una etiqueta a continuación descartaba la procedencia recién
    elegida.
  */
  function aplicar(cambio: Partial<CriteriosDeListado>): void {
    setParams((anteriores) => escribirCriterios({ ...leerCriterios(anteriores, idsDeEtiqueta), ...cambio }))
  }

  function alternarEtiquetaDelFiltro(idEtiqueta: string): void {
    setParams((anteriores) => {
      const previos = leerCriterios(anteriores, idsDeEtiqueta)
      const etiquetas = previos.etiquetas.includes(idEtiqueta)
        ? previos.etiquetas.filter((id) => id !== idEtiqueta)
        : [...previos.etiquetas, idEtiqueta]

      return escribirCriterios({ ...previos, etiquetas })
    })
  }

  /*
    Devuelve el mensaje ya traducido en el momento de intentar crear, y no un
    estado que llegue en un render posterior: así quien abrió el campo decide
    por sí solo si se limpia (éxito) o muestra el error, sin que esta pantalla
    tenga que mantener ese estado por él.
  */
  async function alCrearEtiqueta(nombre: string): Promise<ResultadoCreacion> {
    const resultado = await crear(nombre)

    return resultado.ok
      ? { ok: true, etiqueta: resultado.etiqueta }
      : { ok: false, mensaje: mensajeDeError(resultado.codigo) }
  }

  /** Poner o quitar una etiqueta propia sobre la conferencia elegida. */
  function alAlternarAsignacion(idEtiqueta: string, idConferencia: string): void {
    const yaAsignada = espacio.asignaciones.some(
      (asignacion) => asignacion.idEtiqueta === idEtiqueta && asignacion.idConferencia === idConferencia,
    )

    void (yaAsignada ? quitar(idEtiqueta, idConferencia) : asignar(idEtiqueta, idConferencia))
  }

  return (
    <div ref={marco} className="flex min-h-0 flex-1 flex-col">
      {/* El título y los controles viven dentro del archivo, en el mismo renglón. */}
      <PantallaArchivo
        visibles={listadas}
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
        criterios={criterios}
        etiquetas={espacio.etiquetas}
        etiquetasDe={visiblesDe}
        hayConferenciasSinFiltrar={visibles.length > 0}
        alCambiarCriterios={aplicar}
        alAlternarEtiquetaDelFiltro={alternarEtiquetaDelFiltro}
        alCrearEtiqueta={alCrearEtiqueta}
        alAlternarAsignacion={alAlternarAsignacion}
        alEliminarEtiqueta={(idEtiqueta) => void eliminar(idEtiqueta)}
        refDelBotonDeCarga={botonDeCarga}
      />

      <ModalDeCarga
        abierto={panelDeCargaAbierto}
        alCerrar={() => setPanelDeCargaAbierto(false)}
        etiquetas={espacio.etiquetas}
        alCrearEtiqueta={alCrearEtiqueta}
        alEliminarEtiqueta={(idEtiqueta) => void eliminar(idEtiqueta)}
        anclaEn={botonDeCarga}
        limites={marco}
        /*
          Las etiquetas elegidas al cargar se asignan aquí y no dentro del
          modal: antes de guardar no hay conferencia a la que pegarlas, así
          que solo pueden ponerse cuando la fila ya existe.
        */
        alCargar={(conferencia, idsDeEtiqueta) => {
          setPanelDeCargaAbierto(false)

          void Promise.all(idsDeEtiqueta.map((idEtiqueta) => asignar(idEtiqueta, conferencia.id))).then(
            recargar,
          )
        }}
      />
    </div>
  )
}
