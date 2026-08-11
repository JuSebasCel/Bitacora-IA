import { useMemo } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Link, useLocation, useParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { mensajeDeError } from '@/shared/errors'
import { PanelDeError } from '@/shared/ui'
import {
  AsignadorDeEtiquetas,
  ConteosDeFichas,
  EditorDeEtiquetas,
  ListadoDeFichas,
  ResumenDeConferencia,
} from '../components'
import type { ResultadoCreacion } from '../components'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '../data'
import { fichasVisibles, obtenerConferencia, privacidadEfectiva, resumirFichas } from '../query'
import { espacioDe, etiquetasVisibles, useEtiquetas } from '../tags'

/*
  Detalle de una conferencia: su resumen, la distribución de sus fichas y las
  fichas una a una.

  El caso sin acceso y el caso inexistente se pintan exactamente igual, porque
  `obtenerConferencia` devuelve el mismo código para los dos. Si esta pantalla
  los distinguiera, devolvería por la interfaz la información que la capa de
  acceso se cuida de no dar.
*/

function EnlaceDeRegreso({ busqueda }: { busqueda: string }) {
  return (
    <Link
      to={{ pathname: '/conferencias', search: busqueda }}
      className="inline-flex items-center gap-1.5 text-sm text-texto-tenue transition-colors hover:text-acento"
    >
      <ArrowLeftIcon size={14} weight="regular" aria-hidden="true" />
      Volver al listado
    </Link>
  )
}

export function PantallaDetalleConferencia() {
  const { idConferencia = '' } = useParams()
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const ubicacion = useLocation()

  const { espacio, crear, asignar, quitar } = useEtiquetas(idUsuario)

  const resultado = useMemo(
    () => obtenerConferencia(CONFERENCIAS_DE_EJEMPLO, idUsuario, idConferencia),
    [idUsuario, idConferencia],
  )

  const fichas = useMemo(
    () => (resultado.ok ? fichasVisibles(FICHAS_DE_EJEMPLO, resultado.visible) : []),
    [resultado],
  )

  const etiquetas = useMemo(() => {
    if (!resultado.ok) {
      return []
    }

    const { visible } = resultado

    return etiquetasVisibles({
      espacioPropio: espacio,
      espacioDelDueno:
        visible.procedencia === 'compartida' ? espacioDe(visible.conferencia.idDueno) : null,
      idConferencia: visible.conferencia.id,
      compartirEtiquetas: privacidadEfectiva(visible).compartirEtiquetas,
    })
  }, [resultado, espacio])

  const idsPropiasAsignadas = etiquetas
    .filter((visible) => visible.propia)
    .map((visible) => visible.etiqueta.id)

  /** Poner o quitar una etiqueta propia sobre esta conferencia. */
  function alAlternarAsignacion(idEtiqueta: string): void {
    const yaAsignada = espacio.asignaciones.some(
      (asignacion) =>
        asignacion.idEtiqueta === idEtiqueta && asignacion.idConferencia === idConferencia,
    )

    if (yaAsignada) {
      quitar(idEtiqueta, idConferencia)
    } else {
      asignar(idEtiqueta, idConferencia)
    }
  }

  /** Crear una etiqueta nueva y asignarla de una vez a esta conferencia. */
  function alCrearYAsignar(nombre: string): ResultadoCreacion {
    const resultado = crear(nombre)

    if (!resultado.ok) {
      return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    }

    asignar(resultado.etiqueta.id, idConferencia)

    return { ok: true, etiqueta: resultado.etiqueta }
  }

  if (!resultado.ok) {
    return (
      <div className="flex flex-col gap-5 border-t border-filete-fuerte pt-5">
        <PanelDeError mensaje={mensajeDeError(resultado.codigo)} />
        <EnlaceDeRegreso busqueda={ubicacion.search} />
      </div>
    )
  }

  const { visible } = resultado
  const { conferencia } = visible
  const ocultaPendientes =
    visible.procedencia === 'compartida' && !privacidadEfectiva(visible).compartirFichasPendientes

  return (
    <div className="flex flex-col gap-8 border-t border-filete-fuerte pt-5">
      <EnlaceDeRegreso busqueda={ubicacion.search} />

      <ResumenDeConferencia visible={visible} />

      <div className="flex flex-wrap items-center gap-1.5">
        <EditorDeEtiquetas
          etiquetas={etiquetas}
          alQuitar={(idEtiqueta) => quitar(idEtiqueta, conferencia.id)}
        />
        <AsignadorDeEtiquetas
          misEtiquetas={espacio.etiquetas}
          idsAsignadas={idsPropiasAsignadas}
          alAlternar={alAlternarAsignacion}
          alCrear={alCrearYAsignar}
        />
      </div>

      {conferencia.estado === 'fallida' ? (
        <PanelDeError mensaje={mensajeDeError('CONF_PROCESAMIENTO_FALLIDO')} />
      ) : null}

      {/*
        En cola y procesando no son errores: la conferencia está donde debe, solo
        que todavía no ha producido fichas. Tratarlo como fallo enseñaría a
        ignorar las alertas que sí importan.
      */}
      {conferencia.estado === 'en-cola' || conferencia.estado === 'procesando' ? (
        <p className="max-w-prose text-sm leading-relaxed text-texto-tenue">
          Esta conferencia todavía se está procesando. Cuando termine, sus fichas aparecerán aquí
          con su coordenada y su estado de validación.
        </p>
      ) : null}

      {conferencia.estado === 'procesada' ? (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-texto">
              {fichas.length === 1 ? '1 ficha' : `${fichas.length} fichas`}
            </h2>

            <ConteosDeFichas resumen={resumirFichas(fichas)} />

            {ocultaPendientes ? (
              <p className="max-w-prose text-xs leading-relaxed text-texto-tenue">
                Quien compartió esta conferencia eligió mostrar solo las fichas ya validadas, así
                que aquí no aparecen las que siguen en revisión.
              </p>
            ) : null}
          </section>

          <ListadoDeFichas fichas={fichas} />
        </>
      ) : null}
    </div>
  )
}
