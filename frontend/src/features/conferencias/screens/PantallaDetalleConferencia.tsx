import { useMemo, useState } from 'react'
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/csr/ShareNetwork'
import { Link, useLocation, useParams } from 'react-router'
import { useSession } from '@/features/auth/session'
import { DialogoDeCompartir } from '@/features/configuracion/components'
import { useTemas } from '@/features/taxonomia'
import { mensajeDeError } from '@/shared/errors'
import { Esqueleto, PanelDeError } from '@/shared/ui'
import {
  AsignadorDeEtiquetas,
  ConteosDeFichas,
  EditorDeEtiquetas,
  ListadoDeFichas,
  ResumenDeConferencia,
} from '../components'
import type { ResultadoCreacion } from '../components'
import { actualizarEstadoDeValidacion } from '../repositorio'
import { useDetalleConferencia } from './useDetalleConferencia'
import { fichasVisibles, privacidadEfectiva, resumirFichas } from '../query'
import { espacioDe, etiquetasVisibles, useEtiquetas } from '../tags'

/*
  Detalle de una conferencia: su resumen, la distribución de sus fichas y las
  fichas una a una.

  El caso sin acceso y el caso inexistente se pintan exactamente igual, porque
  el repositorio devuelve el mismo código para los dos. Si esta pantalla
  los distinguiera, devolvería por la interfaz la información que la capa de
  acceso se cuida de no dar.
*/

/*
  A este detalle se llega desde dos sitios: el dashboard (F2) y el catálogo
  (F6). Antes el enlace de regreso mandaba siempre a `/conferencias`, así que
  quien venía del catálogo aterrizaba en otra pantalla y perdía sus filtros.

  El catálogo marca su origen con `origen=catalogo` al enlazar. La marca se
  quita antes de devolver los parámetros, para no reinyectarla en la vista de
  destino ni dejarla pegada en la URL del listado.
*/
function EnlaceDeRegreso({ busqueda }: { busqueda: string }) {
  const parametros = new URLSearchParams(busqueda)
  const vieneDelCatalogo = parametros.get('origen') === 'catalogo'

  parametros.delete('origen')
  const consulta = parametros.toString()

  return (
    <Link
      to={{
        pathname: vieneDelCatalogo ? '/catalogo' : '/conferencias',
        search: consulta === '' ? '' : `?${consulta}`,
      }}
      className="inline-flex items-center gap-1.5 text-sm text-texto-tenue transition-colors hover:text-acento"
    >
      <ArrowLeftIcon size={14} weight="regular" aria-hidden="true" />
      {vieneDelCatalogo ? 'Volver al catálogo' : 'Volver al listado'}
    </Link>
  )
}

export function PantallaDetalleConferencia() {
  const { idConferencia = '' } = useParams()
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const ubicacion = useLocation()

  const { espacio, crear, asignar, quitar } = useEtiquetas(idUsuario)

  const { carga, resultado, fichas: fichasDeLaConferencia, recargarFichas } = useDetalleConferencia(
    idConferencia,
    idUsuario,
  )

  const [dialogoCompartirAbierto, setDialogoCompartirAbierto] = useState(false)

  const fichas = useMemo(
    () => (resultado.ok ? fichasVisibles(fichasDeLaConferencia, resultado.visible) : []),
    [resultado, fichasDeLaConferencia],
  )

  /*
    Quién puede validar lo decide la política de RLS; si la rechaza, la ficha
    se queda como estaba y no hay recarga. Cuando la acepta, se vuelven a pedir
    solo las fichas — la conferencia no cambió.
  */
  function alValidar(idFicha: string): void {
    void actualizarEstadoDeValidacion(idFicha, 'validada').then((respuesta) => {
      if (respuesta.ok) {
        recargarFichas()
      }
    })
  }

  /*
    El pool de temas se lee una vez por montaje: la ficha guarda el id y el
    listado necesita el nombre. Es vocabulario del grupo, así que no cambia
    mientras alguien lee el detalle de una conferencia.
  */
  const { temas } = useTemas()

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

  if (carga === 'cargando') {
    return (
      <div className="flex flex-col gap-6 border-t border-filete-fuerte pt-6">
        <Esqueleto filas={4} etiqueta="Cargando la conferencia" />
      </div>
    )
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
  /* El dueño siempre puede validar lo suyo; un invitado solo si quien compartió lo permitió explícitamente. */
  const puedeValidar = visible.procedencia === 'propia' || privacidadEfectiva(visible).permitirValidarFichas
  /* Mismo criterio que validar: propia siempre, ajena solo con permiso explícito de recompartir. */
  const puedeCompartir = visible.procedencia === 'propia' || privacidadEfectiva(visible).permitirRecompartir

  return (
    <div className="flex flex-col gap-6 border-t border-filete-fuerte pt-6">
      <EnlaceDeRegreso busqueda={ubicacion.search} />

      <section className="flex flex-col gap-5 rounded-md bg-panel p-6 shadow-sm">
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

          {puedeCompartir ? (
            <button
              type="button"
              onClick={() => setDialogoCompartirAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-texto-tenue transition-colors hover:bg-fondo hover:text-texto"
            >
              <ShareNetworkIcon size={14} weight="regular" aria-hidden="true" />
              Compartir
            </button>
          ) : null}
        </div>
      </section>

      {puedeCompartir ? (
        <DialogoDeCompartir
          abierto={dialogoCompartirAbierto}
          conferencia={conferencia}
          idUsuario={idUsuario}
          puedeCompartir={puedeCompartir}
          alCerrar={() => setDialogoCompartirAbierto(false)}
        />
      ) : null}

      {conferencia.estado === 'fallida' ? (
        <PanelDeError mensaje={mensajeDeError('CONF_PROCESAMIENTO_FALLIDO')} />
      ) : null}

      {/*
        En cola y procesando no son errores: la conferencia está donde debe, solo
        que todavía no ha producido fichas. Tratarlo como fallo enseñaría a
        ignorar las alertas que sí importan.
      */}
      {conferencia.estado === 'en-cola' || conferencia.estado === 'procesando' ? (
        <p className="max-w-prose rounded-md bg-panel p-5 text-sm leading-relaxed text-texto-tenue shadow-sm">
          Esta conferencia todavía se está procesando. Cuando termine, sus fichas aparecerán aquí
          con su coordenada y su estado de validación.
        </p>
      ) : null}

      {conferencia.estado === 'procesada' ? (
        <>
          <section className="flex flex-col gap-4 rounded-md bg-panel p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-texto">
                {fichas.length === 1 ? '1 ficha' : `${fichas.length} fichas`}
              </h2>

              <Link
                to={`/memorias?conferencia=${conferencia.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-acento hover:underline"
              >
                <FileTextIcon size={14} weight="bold" aria-hidden="true" />
                Generar memoria
              </Link>
            </div>

            <ConteosDeFichas resumen={resumirFichas(fichas)} />

            {ocultaPendientes ? (
              <p className="max-w-prose text-xs leading-relaxed text-texto-tenue">
                Quien compartió esta conferencia eligió mostrar solo las fichas ya validadas, así
                que aquí no aparecen las que siguen en revisión.
              </p>
            ) : null}
          </section>

          <section className="rounded-md bg-panel p-6 shadow-sm">
            <ListadoDeFichas
              fichas={fichas}
              temas={temas}
              ocultaPendientes={ocultaPendientes}
              puedeValidar={puedeValidar}
              alValidar={alValidar}
            />
          </section>
        </>
      ) : null}
    </div>
  )
}
