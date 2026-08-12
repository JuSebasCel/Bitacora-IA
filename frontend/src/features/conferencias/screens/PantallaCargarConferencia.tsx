import { useState, type FormEvent, type ReactElement } from 'react'
import { Link } from 'react-router'
import { cargarConferencia, EXTENSIONES_POR_FUENTE } from '../carga'
import type { DatosDeCarga } from '../carga'
import { SegmentacionDeFuente } from '../components'
import type { FuenteDeConferencia } from '../data'
import { mensajeDeError } from '@/shared/errors'
import { Button, EncabezadoDeSeccion, Field, Input, InputDeArchivo, MensajeDeFormulario } from '@/shared/ui'

/*
  Formulario de carga (F3): registra una conferencia nueva y simula su
  procesamiento, sin backend real todavía. Es una pantalla aislada — lo
  cargado no se persiste ni aparece en el dashboard de F2, ver PRD.md
  sección 6 y PLAN.md sección 7 para la decisión completa.
*/

const DESCRIPCION =
  'Recibe el audio o la transcripción de una sesión, la registra con su evento y fecha, y sigue su procesamiento hasta que las fichas quedan disponibles.'

const ID_ERROR = 'carga-error'

const CAMPOS_VACIOS: DatosDeCarga = {
  titulo: '',
  ponente: '',
  evento: '',
  fechaDelEvento: '',
  fuente: 'audio',
}

export function PantallaCargarConferencia(): ReactElement {
  const [datos, setDatos] = useState<DatosDeCarga>(CAMPOS_VACIOS)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmada, setConfirmada] = useState<{ titulo: string } | null>(null)

  function actualizar(cambio: Partial<DatosDeCarga>): void {
    setDatos((anteriores) => ({ ...anteriores, ...cambio }))
  }

  function cambiarFuente(fuente: FuenteDeConferencia): void {
    actualizar({ fuente })
    setArchivo(null)
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (enviando) return

    setEnviando(true)
    setError(null)

    try {
      const resultado = await cargarConferencia(datos, archivo)

      if (!resultado.ok) {
        setError(mensajeDeError(resultado.codigo))
        setEnviando(false)
        return
      }

      setConfirmada({ titulo: datos.titulo })
      setEnviando(false)
    } catch {
      /*
        Hoy `cargarConferencia` no hace red, pero en B3 sí. Sin este camino, un
        rechazo dejaría el botón deshabilitado para siempre y sin explicación.
      */
      setError(mensajeDeError('CARGA_FALLO_INESPERADO'))
      setEnviando(false)
    }
  }

  function cargarOtra(): void {
    setDatos(CAMPOS_VACIOS)
    setArchivo(null)
    setError(null)
    setConfirmada(null)
  }

  return (
    <>
      <EncabezadoDeSeccion titulo="Cargar conferencia" descripcion={DESCRIPCION} />

      <div className="mt-6">
        {confirmada === null ? (
          <form
            noValidate
            onSubmit={(evento) => {
              void alEnviar(evento)
            }}
            aria-describedby={error === null ? undefined : ID_ERROR}
            className="flex max-w-xl flex-col gap-4 rounded-md bg-panel p-6 shadow-sm"
          >
            <Field id="carga-titulo" etiqueta="Título">
              <Input
                value={datos.titulo}
                onChange={(evento) => actualizar({ titulo: evento.target.value })}
              />
            </Field>

            <Field id="carga-ponente" etiqueta="Ponente">
              <Input
                value={datos.ponente}
                onChange={(evento) => actualizar({ ponente: evento.target.value })}
              />
            </Field>

            <Field id="carga-evento" etiqueta="Evento">
              <Input
                value={datos.evento}
                onChange={(evento) => actualizar({ evento: evento.target.value })}
              />
            </Field>

            <Field id="carga-fecha" etiqueta="Fecha del evento" ayuda="Formato AAAA-MM-DD">
              <Input
                value={datos.fechaDelEvento}
                onChange={(evento) => actualizar({ fechaDelEvento: evento.target.value })}
                placeholder="2026-05-14"
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-texto">Fuente</span>
              <SegmentacionDeFuente fuente={datos.fuente} alCambiar={cambiarFuente} />
            </div>

            <Field id="carga-archivo" etiqueta="Archivo">
              <InputDeArchivo
                accept={EXTENSIONES_POR_FUENTE[datos.fuente].join(',')}
                archivo={archivo}
                alSeleccionar={setArchivo}
              />
            </Field>

            {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

            <Button type="submit" variante="primario" cargando={enviando} className="mt-1 w-full">
              Cargar conferencia
            </Button>
          </form>
        ) : (
          <div className="flex max-w-xl flex-col items-start gap-3 rounded-md bg-panel p-6 shadow-sm">
            <p className="text-sm font-medium text-texto">Recibimos «{confirmada.titulo}»</p>
            <p className="max-w-prose text-sm leading-relaxed text-texto-tenue">
              Entrará a la cola de procesamiento, y sus fichas quedarán disponibles cuando termine.
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Button type="button" variante="secundario" onClick={cargarOtra}>
                Cargar otra conferencia
              </Button>
              <Link to="/conferencias" className="text-sm text-acento hover:underline">
                Ver mis conferencias
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
