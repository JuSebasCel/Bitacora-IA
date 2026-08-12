import { useEffect, useState, type FormEvent, type ReactElement } from 'react'
import { Link } from 'react-router'
import { cargarConferencia, EXTENSIONES_POR_FUENTE, RETRASO_SIMULADO_MS } from '../carga'
import type { DatosDeCarga } from '../carga'
import { SegmentacionDeFuente, VistaPreviaDeCarga } from '../components'
import type { FuenteDeConferencia } from '../data'
import { useDirectorio } from '../directorio'
import { mensajeDeError } from '@/shared/errors'
import {
  Button,
  DialogoDeCreacion,
  EncabezadoDeSeccion,
  Field,
  Input,
  InputDeArchivo,
  MensajeDeFormulario,
  Select,
} from '@/shared/ui'
import type { OpcionDeSelect } from '@/shared/ui'

/*
  Formulario de carga (F3): registra una conferencia nueva y simula su
  procesamiento, sin backend real todavía. Es una pantalla aislada — lo
  cargado no se persiste ni aparece en el dashboard de F2, ver PRD.md
  sección 6 y PLAN.md sección 7 para la decisión completa.

  El evento y el ponente se eligen del directorio compartido (`../directorio`)
  en vez de escribirse libres, para no fragmentar el mismo evento real por un
  typo. La última opción de cada selector es "crear uno nuevo": elegirla abre
  un diálogo en vez de cambiar el valor del campo.
*/

const DESCRIPCION =
  'Recibe el audio o la transcripción de una sesión, la registra con su evento y fecha, y sigue su procesamiento hasta que las fichas quedan disponibles.'

const ID_ERROR = 'carga-error'
const CREAR_EVENTO = '__crear_evento__'
const CREAR_PONENTE = '__crear_ponente__'

const CAMPOS_VACIOS: DatosDeCarga = {
  titulo: '',
  idEvento: '',
  idPonente: '',
  fechaDelEvento: '',
  fuente: 'audio',
}

type ErroresDeCampo = {
  titulo?: string
  idEvento?: string
  idPonente?: string
  fechaDelEvento?: string
  archivo?: string
}

function validarCamposLocalmente(datos: DatosDeCarga, archivo: File | null): ErroresDeCampo {
  const errores: ErroresDeCampo = {}

  if (datos.titulo.trim() === '') {
    errores.titulo = 'Escribe un título para la conferencia.'
  }
  if (datos.idEvento === '') {
    errores.idEvento = 'Elige el evento al que pertenece esta charla.'
  }
  if (datos.idPonente === '') {
    errores.idPonente = 'Elige quién dio la charla.'
  }
  if (datos.fechaDelEvento === '') {
    errores.fechaDelEvento = 'Elige la fecha del evento.'
  }
  if (archivo === null) {
    errores.archivo = 'Elige el archivo de audio o transcripción.'
  }

  return errores
}

export function PantallaCargarConferencia(): ReactElement {
  const { eventos, ponentes, crearEvento, crearPonente } = useDirectorio()

  const [datos, setDatos] = useState<DatosDeCarga>(CAMPOS_VACIOS)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [erroresDeCampo, setErroresDeCampo] = useState<ErroresDeCampo>({})
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [confirmada, setConfirmada] = useState<{
    titulo: string
    nombreEvento: string
    nombrePonente: string
  } | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState<'evento' | 'ponente' | null>(null)

  /* La barra avanza de 0 a 100 en el mismo tiempo que dura la subida simulada. */
  useEffect(() => {
    if (!enviando) {
      setProgreso(0)
      return
    }

    setProgreso(0)
    const cuadro = requestAnimationFrame(() => setProgreso(100))
    return () => cancelAnimationFrame(cuadro)
  }, [enviando])

  function actualizar(cambio: Partial<DatosDeCarga>): void {
    setDatos((anteriores) => ({ ...anteriores, ...cambio }))
    setErroresDeCampo((anteriores) => {
      const siguientes = { ...anteriores }
      for (const clave of Object.keys(cambio)) {
        delete siguientes[clave as keyof ErroresDeCampo]
      }
      return siguientes
    })
  }

  function cambiarFuente(fuente: FuenteDeConferencia): void {
    actualizar({ fuente })
    setArchivo(null)
  }

  function cambiarEvento(valor: string): void {
    if (valor === CREAR_EVENTO) {
      setDialogoAbierto('evento')
      return
    }

    /* Un ponente elegido bajo otro evento ya no tiene sentido aquí. */
    actualizar({ idEvento: valor, idPonente: '' })
  }

  function cambiarPonente(valor: string): void {
    if (valor === CREAR_PONENTE) {
      setDialogoAbierto('ponente')
      return
    }

    actualizar({ idPonente: valor })
  }

  function elegirArchivo(elegido: File | null): void {
    setArchivo(elegido)
    setErroresDeCampo((anteriores) => {
      if (anteriores.archivo === undefined) {
        return anteriores
      }
      const siguientes = { ...anteriores }
      delete siguientes.archivo
      return siguientes
    })
  }

  function alCrearEvento(nombre: string): { ok: true } | { ok: false; mensaje: string } {
    const resultado = crearEvento(nombre)

    if (!resultado.ok) {
      return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    }

    actualizar({ idEvento: resultado.evento.id, idPonente: '' })
    return { ok: true }
  }

  function alCrearPonente(nombre: string): { ok: true } | { ok: false; mensaje: string } {
    const resultado = crearPonente(datos.idEvento, nombre)

    if (!resultado.ok) {
      return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    }

    actualizar({ idPonente: resultado.ponente.id })
    return { ok: true }
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    if (enviando) return

    const erroresLocales = validarCamposLocalmente(datos, archivo)
    setErroresDeCampo(erroresLocales)
    if (Object.keys(erroresLocales).length > 0) {
      return
    }

    setEnviando(true)
    setError(null)

    try {
      const resultado = await cargarConferencia(datos, archivo)

      if (!resultado.ok) {
        const mensaje = mensajeDeError(resultado.codigo)

        if (resultado.codigo.startsWith('CARGA_ARCHIVO')) {
          setErroresDeCampo((anteriores) => ({ ...anteriores, archivo: mensaje }))
        } else {
          setError(mensaje)
        }

        setEnviando(false)
        return
      }

      setConfirmada({
        titulo: datos.titulo,
        nombreEvento: eventos.find((candidato) => candidato.id === datos.idEvento)?.nombre ?? '',
        nombrePonente: ponentes.find((candidato) => candidato.id === datos.idPonente)?.nombre ?? '',
      })
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
    setErroresDeCampo({})
    setConfirmada(null)
  }

  const opcionesDeEvento: readonly OpcionDeSelect[] = [
    { valor: '', texto: 'Elige un evento' },
    ...eventos.map((evento) => ({ valor: evento.id, texto: evento.nombre })),
    { valor: CREAR_EVENTO, texto: '+ Crear evento nuevo…' },
  ]

  const ponentesDelEvento = ponentes.filter((ponente) => ponente.idEvento === datos.idEvento)
  const opcionesDePonente: readonly OpcionDeSelect[] = [
    { valor: '', texto: datos.idEvento === '' ? 'Elige primero el evento' : 'Elige un ponente' },
    ...ponentesDelEvento.map((ponente) => ({ valor: ponente.id, texto: ponente.nombre })),
    { valor: CREAR_PONENTE, texto: '+ Crear ponente nuevo…' },
  ]

  return (
    <>
      <EncabezadoDeSeccion titulo="Cargar conferencia" descripcion={DESCRIPCION} />

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_20rem]">
        {confirmada === null ? (
          <form
            noValidate
            onSubmit={(evento) => {
              void alEnviar(evento)
            }}
            aria-describedby={error === null ? undefined : ID_ERROR}
            className="flex flex-col gap-5 rounded-md bg-panel p-6 shadow-sm"
          >
            <Field id="carga-titulo" etiqueta="Título" {...(erroresDeCampo.titulo ? { error: erroresDeCampo.titulo } : {})}>
              <Input
                value={datos.titulo}
                onChange={(evento) => actualizar({ titulo: evento.target.value })}
              />
            </Field>

            <div className="flex flex-col gap-4 rounded-md bg-fondo p-4">
              <h2 className="text-sm font-medium text-texto">Evento y ponente</h2>

              <Field id="carga-evento" etiqueta="Evento" {...(erroresDeCampo.idEvento ? { error: erroresDeCampo.idEvento } : {})}>
                <Select
                  opciones={opcionesDeEvento}
                  value={datos.idEvento}
                  onChange={(evento) => cambiarEvento(evento.target.value)}
                />
              </Field>

              <Field id="carga-ponente" etiqueta="Ponente" {...(erroresDeCampo.idPonente ? { error: erroresDeCampo.idPonente } : {})}>
                <Select
                  opciones={opcionesDePonente}
                  value={datos.idPonente}
                  disabled={datos.idEvento === ''}
                  onChange={(evento) => cambiarPonente(evento.target.value)}
                />
              </Field>
            </div>

            <Field id="carga-fecha" etiqueta="Fecha del evento" {...(erroresDeCampo.fechaDelEvento ? { error: erroresDeCampo.fechaDelEvento } : {})}>
              <Input
                type="date"
                value={datos.fechaDelEvento}
                onChange={(evento) => actualizar({ fechaDelEvento: evento.target.value })}
              />
            </Field>

            <div className="flex flex-col gap-4 rounded-md bg-fondo p-4">
              <h2 className="text-sm font-medium text-texto">Fuente y archivo</h2>

              <SegmentacionDeFuente fuente={datos.fuente} alCambiar={cambiarFuente} />

              <Field id="carga-archivo" etiqueta="Archivo" {...(erroresDeCampo.archivo ? { error: erroresDeCampo.archivo } : {})}>
                <InputDeArchivo
                  accept={EXTENSIONES_POR_FUENTE[datos.fuente].join(',')}
                  archivo={archivo}
                  alSeleccionar={elegirArchivo}
                />
              </Field>
            </div>

            {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

            {enviando ? (
              <div
                role="progressbar"
                aria-label="Subiendo la conferencia"
                aria-valuenow={progreso}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1.5 w-full overflow-hidden rounded-full bg-fondo"
              >
                <div
                  className="h-full rounded-full bg-acento"
                  style={{ width: `${progreso}%`, transition: `width ${RETRASO_SIMULADO_MS}ms linear` }}
                />
              </div>
            ) : null}

            <Button type="submit" variante="primario" cargando={enviando} className="mt-1 w-full">
              Cargar conferencia
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-md bg-panel p-6 shadow-sm">
            <p className="text-sm font-medium text-texto">Recibimos «{confirmada.titulo}»</p>
            <p className="max-w-prose text-sm leading-relaxed text-texto-tenue">
              Entrará a la cola de procesamiento, y sus fichas quedarán disponibles cuando termine.
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-texto-tenue">
              <span>{confirmada.nombreEvento}</span>
              <span aria-hidden="true">·</span>
              <span>{confirmada.nombrePonente}</span>
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

        {confirmada === null ? (
          <VistaPreviaDeCarga datos={datos} archivo={archivo} eventos={eventos} ponentes={ponentes} />
        ) : null}
      </div>

      <DialogoDeCreacion
        abierto={dialogoAbierto === 'evento'}
        titulo="Nuevo evento"
        etiquetaCampo="Nombre"
        placeholder="Simposio Andino de Investigación Aplicada"
        alCerrar={() => setDialogoAbierto(null)}
        alCrear={alCrearEvento}
      />

      <DialogoDeCreacion
        abierto={dialogoAbierto === 'ponente'}
        titulo="Nuevo ponente"
        etiquetaCampo="Nombre"
        placeholder="Mariana Escobar Vallejo"
        alCerrar={() => setDialogoAbierto(null)}
        alCrear={alCrearPonente}
      />
    </>
  )
}
