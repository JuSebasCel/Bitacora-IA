import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useApiKey } from '@/features/configuracion/useApiKey'
import { mensajeDeError } from '@/shared/errors'
import { DialogoDeCreacion, Modal } from '@/shared/ui'
import {
  EXTENSIONES_POR_FUENTE,
  duracionDeArchivo,
  fuenteDeArchivo,
  tituloSugerido,
  validarArchivo,
} from '../carga'
import type { Conferencia, Etiqueta, FuenteDeConferencia } from '../data'
import { formatearTimestamp } from '../data'
import { useDirectorio } from '../directorio'
import { crearConferencia, solicitarProcesamiento } from '../repositorio'
import type { ResultadoCreacion } from './CreadorDeEtiqueta'
import { SelectorDeEtiquetas } from './SelectorDeEtiquetas'

/*
  Cargar una conferencia.

  **El formulario solo pregunta lo que nadie más puede saber.** El reparto es
  el que impone el dominio:

      del archivo      la fuente (por extensión) y la duración (leyendo el audio)
      de quien carga   título, evento, ponente y fecha
      de la IA         el tema principal, el resumen y todas las fichas

  De ahí que el archivo vaya primero y no al final: en cuanto está, dos de los
  campos que antes se pedían dejan de preguntarse y el título llega sugerido
  con el nombre del fichero. La fuente era además una pregunta que se podía
  contestar mal —elegir "audio", subir un .docx— y enterarse solo al enviar.

  Lo que la IA hará se dice, no se calla: sin esa línea, quien carga no tiene
  forma de saber que el tema y el resumen no son campos que se le olvidó
  llenar.

  Es un modal centrado y no anclado porque se abre desde tres sitios —el dock,
  la cabecera y el pie de la columna— y anclarlo lo haría nacer en un lugar
  distinto cada vez, una vez pegado al borde izquierdo de la pantalla.
*/

const CREAR_EVENTO = '__crear_evento__'
const CREAR_PONENTE = '__crear_ponente__'

/* Las dos familias juntas: la extensión decide cuál es, no un control aparte. */
const EXTENSIONES_ADMITIDAS = [
  ...EXTENSIONES_POR_FUENTE.audio,
  ...EXTENSIONES_POR_FUENTE.transcripcion,
].join(',')

const NOMBRE_DE_FUENTE: Record<FuenteDeConferencia, string> = {
  audio: 'Audio',
  transcripcion: 'Transcripción',
}

type Campos = {
  titulo: string
  idEvento: string
  idPonente: string
  fechaDelEvento: string
}

const CAMPOS_VACIOS: Campos = { titulo: '', idEvento: '', idPonente: '', fechaDelEvento: '' }

/* `| undefined` explícito: el proyecto usa `exactOptionalPropertyTypes`, y limpiar un error es escribirle `undefined`. */
type ErroresDeCampo = Partial<Record<keyof Campos | 'archivo', string | undefined>>

/*
  Código corto del evento a partir de su nombre: iniciales de las primeras
  palabras. `conferencias` lo guarda denormalizado, no es una llave.
*/
function codigoDeEvento(nombreEvento: string): string {
  const iniciales = nombreEvento
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0)
    .slice(0, 4)
    .map((palabra) => palabra[0]?.toUpperCase() ?? '')
    .join('')

  return iniciales.length > 0 ? iniciales : 'EVT'
}

function pesoLegible(bytes: number): string {
  const mega = bytes / (1024 * 1024)

  return mega >= 1 ? `${mega.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function Campo({
  id,
  etiqueta,
  error,
  children,
}: {
  id: string
  etiqueta: string
  error?: string | undefined
  children: ReactNode
}): ReactElement {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="px-1 text-sm font-medium text-texto-tenue">
        {etiqueta}
      </label>
      {children}
      {error === undefined ? null : (
        <p role="alert" className="px-1 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  )
}

const CONTROL =
  'h-11 w-full min-w-0 rounded-full bg-acento-tenue px-4 text-base text-texto placeholder:text-texto-tenue focus:outline-2 focus:outline-offset-2 focus:outline-acento'

export type PropsModalDeCarga = {
  abierto: boolean
  alCerrar: () => void
  /** La conferencia ya guardada, y las etiquetas que se le eligieron al crearla. */
  alCargar: (conferencia: Conferencia, idsDeEtiqueta: readonly string[]) => void
  etiquetas: readonly Etiqueta[]
  alCrearEtiqueta: (nombre: string) => Promise<ResultadoCreacion>
}

export function ModalDeCarga({
  abierto,
  alCerrar,
  alCargar,
  etiquetas,
  alCrearEtiqueta,
}: PropsModalDeCarga): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { eventos, ponentes, crearEvento, crearPonente } = useDirectorio()
  const { clave: apiKey, cargando: cargandoApiKey } = useApiKey()
  const navegar = useNavigate()

  const entradaDeArchivo = useRef<HTMLInputElement>(null)

  const [campos, setCampos] = useState<Campos>(CAMPOS_VACIOS)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [duracion, setDuracion] = useState(0)
  const [etiquetasElegidas, setEtiquetasElegidas] = useState<readonly string[]>([])
  const [errores, setErrores] = useState<ErroresDeCampo>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [dialogoAbierto, setDialogoAbierto] = useState<'evento' | 'ponente' | null>(null)

  /* Cada apertura empieza en blanco: es una conferencia nueva, no la anterior a medias. */
  useEffect(() => {
    if (!abierto) {
      return
    }

    setCampos(CAMPOS_VACIOS)
    setArchivo(null)
    setDuracion(0)
    setEtiquetasElegidas([])
    setErrores({})
    setError(null)
  }, [abierto])

  const fuente = archivo === null ? null : fuenteDeArchivo(archivo)

  function actualizar(cambio: Partial<Campos>): void {
    setCampos((anteriores) => ({ ...anteriores, ...cambio }))
    setErrores((anteriores) => {
      const siguientes = { ...anteriores }
      for (const clave of Object.keys(cambio)) {
        delete siguientes[clave as keyof Campos]
      }
      return siguientes
    })
  }

  async function elegirArchivo(elegido: File | null): Promise<void> {
    setArchivo(elegido)
    setErrores((anteriores) => ({ ...anteriores, archivo: undefined }))

    if (elegido === null) {
      setDuracion(0)
      return
    }

    /* El título solo se sugiere si todavía no hay uno escrito a mano. */
    setCampos((anteriores) =>
      anteriores.titulo.trim() === '' ? { ...anteriores, titulo: tituloSugerido(elegido) } : anteriores,
    )

    setDuracion(await duracionDeArchivo(elegido))
  }

  async function alCrearEvento(nombre: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
    const resultado = await crearEvento(nombre)

    if (!resultado.ok) {
      return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    }

    actualizar({ idEvento: resultado.evento.id, idPonente: '' })
    return { ok: true }
  }

  async function alCrearPonente(nombre: string): Promise<{ ok: true } | { ok: false; mensaje: string }> {
    const resultado = await crearPonente(campos.idEvento, nombre)

    if (!resultado.ok) {
      return { ok: false, mensaje: mensajeDeError(resultado.codigo) }
    }

    actualizar({ idPonente: resultado.ponente.id })
    return { ok: true }
  }

  function revisar(): ErroresDeCampo {
    const encontrados: ErroresDeCampo = {}

    if (archivo === null) {
      encontrados.archivo = 'Elige el audio o la transcripción de la charla.'
    } else if (fuente === null) {
      encontrados.archivo = mensajeDeError('CARGA_ARCHIVO_NO_SOPORTADO')
    } else {
      const valido = validarArchivo(archivo, fuente)
      if (!valido.ok) {
        encontrados.archivo = mensajeDeError(valido.codigo)
      }
    }

    if (campos.titulo.trim() === '') {
      encontrados.titulo = 'Escribe un título para la conferencia.'
    }
    if (campos.idEvento === '') {
      encontrados.idEvento = 'Elige el evento al que pertenece.'
    }
    if (campos.idPonente === '') {
      encontrados.idPonente = 'Elige quién dio la conferencia.'
    }
    if (campos.fechaDelEvento === '') {
      encontrados.fechaDelEvento = 'Elige la fecha del evento.'
    }

    return encontrados
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()

    if (enviando) {
      return
    }

    const encontrados = revisar()
    setErrores(encontrados)

    if (Object.values(encontrados).some((mensaje) => mensaje !== undefined)) {
      return
    }

    setEnviando(true)
    setError(null)

    const nombreEvento = eventos.find((candidato) => candidato.id === campos.idEvento)?.nombre ?? ''
    const nombrePonente = ponentes.find((candidato) => candidato.id === campos.idPonente)?.nombre ?? ''

    const resultado = await crearConferencia(
      {
        titulo: campos.titulo.trim(),
        ponente: nombrePonente,
        evento: nombreEvento,
        codigoDeEvento: codigoDeEvento(nombreEvento),
        fechaDelEvento: campos.fechaDelEvento,
        idDueno: idUsuario,
        fuente: fuente ?? 'transcripcion',
        duracionEnSegundos: duracion,
      },
      archivo,
    )

    if (!resultado.ok) {
      setEnviando(false)
      setError(mensajeDeError(resultado.codigo))
      return
    }

    /*
      Poner en marcha el análisis es lo último y no bloquea la carga: la fila
      ya existe. Si el backend no está o rechaza, la conferencia se queda
      `en-cola` —un estado válido, no un error— y se procesará más tarde.
    */
    await solicitarProcesamiento(resultado.datos.id)

    setEnviando(false)
    alCargar(resultado.datos, etiquetasElegidas)
  }

  const ponentesDelEvento = ponentes.filter((ponente) => ponente.idEvento === campos.idEvento)
  const sinClave = !cargandoApiKey && apiKey === null

  return (
    <>
      <Modal abierto={abierto} alCerrar={alCerrar} titulo="Cargar conferencia" ancho="normal">
        <form
          noValidate
          onSubmit={(evento) => {
            void alEnviar(evento)
          }}
          className="flex flex-col gap-6"
        >
          {/*
            El archivo primero: en cuanto está, la fuente y la duración quedan
            resueltas y el título llega sugerido.
          */}
          <div className="flex flex-col gap-1.5">
            <p className="px-1 text-sm font-medium text-texto-tenue">Audio o transcripción</p>

            <input
              ref={entradaDeArchivo}
              type="file"
              accept={EXTENSIONES_ADMITIDAS}
              aria-label="Audio o transcripción de la charla"
              onChange={(cambio) => {
                void elegirArchivo(cambio.target.files?.[0] ?? null)
              }}
              className="sr-only"
            />

            {archivo === null ? (
              <button
                type="button"
                onClick={() => entradaDeArchivo.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-[24px] bg-acento-tenue px-6 py-8 text-center transition-colors hover:bg-ilustracion"
              >
                <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-3xl text-texto">
                  upload_file
                </span>
                <span className="text-base text-texto">Elige el archivo de la charla</span>
                <span className="text-sm text-texto-tenue">
                  Audio {EXTENSIONES_POR_FUENTE.audio.join(' ')} · Texto{' '}
                  {EXTENSIONES_POR_FUENTE.transcripcion.join(' ')}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-4 rounded-[24px] bg-acento-tenue px-6 py-4">
                <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-2xl text-texto">
                  {fuente === 'audio' ? 'graphic_eq' : 'description'}
                </span>

                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base text-texto">{archivo.name}</span>
                  <span className="text-sm text-texto-tenue">
                    {fuente === null ? 'Formato no admitido' : NOMBRE_DE_FUENTE[fuente]}
                    {duracion > 0 ? ` · ${formatearTimestamp(duracion)}` : ''} ·{' '}
                    {pesoLegible(archivo.size)}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => entradaDeArchivo.current?.click()}
                  className="ml-auto shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm text-texto-tenue transition-colors hover:text-texto"
                >
                  Cambiar
                </button>
              </div>
            )}

            {errores.archivo === undefined ? null : (
              <p role="alert" className="px-1 text-sm text-error">
                {errores.archivo}
              </p>
            )}
          </div>

          <Campo id="carga-titulo" etiqueta="Título" error={errores.titulo}>
            <input
              id="carga-titulo"
              value={campos.titulo}
              onChange={(cambio) => actualizar({ titulo: cambio.target.value })}
              placeholder="Cómo se dijo, no cómo se archiva"
              className={CONTROL}
            />
          </Campo>

          <div className="grid gap-6 sm:grid-cols-2">
            <Campo id="carga-evento" etiqueta="Evento" error={errores.idEvento}>
              <select
                id="carga-evento"
                value={campos.idEvento}
                onChange={(cambio) => {
                  if (cambio.target.value === CREAR_EVENTO) {
                    setDialogoAbierto('evento')
                    return
                  }
                  /* Cambiar de evento invalida el ponente: los ponentes cuelgan del evento. */
                  actualizar({ idEvento: cambio.target.value, idPonente: '' })
                }}
                className={CONTROL}
              >
                <option value="">Elige un evento</option>
                {eventos.map((evento) => (
                  <option key={evento.id} value={evento.id}>
                    {evento.nombre}
                  </option>
                ))}
                <option value={CREAR_EVENTO}>+ Crear evento nuevo…</option>
              </select>
            </Campo>

            <Campo id="carga-ponente" etiqueta="Ponente" error={errores.idPonente}>
              <select
                id="carga-ponente"
                value={campos.idPonente}
                disabled={campos.idEvento === ''}
                onChange={(cambio) => {
                  if (cambio.target.value === CREAR_PONENTE) {
                    setDialogoAbierto('ponente')
                    return
                  }
                  actualizar({ idPonente: cambio.target.value })
                }}
                className={`${CONTROL} disabled:opacity-50`}
              >
                <option value="">
                  {campos.idEvento === '' ? 'Elige primero el evento' : 'Elige un ponente'}
                </option>
                {ponentesDelEvento.map((ponente) => (
                  <option key={ponente.id} value={ponente.id}>
                    {ponente.nombre}
                  </option>
                ))}
                <option value={CREAR_PONENTE}>+ Crear ponente nuevo…</option>
              </select>
            </Campo>
          </div>

          <Campo id="carga-fecha" etiqueta="Fecha del evento" error={errores.fechaDelEvento}>
            <input
              id="carga-fecha"
              type="date"
              value={campos.fechaDelEvento}
              onChange={(cambio) => actualizar({ fechaDelEvento: cambio.target.value })}
              className={`${CONTROL} sm:w-60`}
            />
          </Campo>

          {/*
            Etiquetas al crear, no después: quien sube una charla suele saber
            ya para qué artículo la quiere. Se asignan en cuanto la fila existe.
          */}
          <div className="flex flex-col gap-2">
            <p className="px-1 text-sm font-medium text-texto-tenue">
              Etiquetas <span className="font-normal">· opcional</span>
            </p>
            <SelectorDeEtiquetas
              etiquetas={etiquetas}
              marcadas={etiquetasElegidas}
              alAlternar={(idEtiqueta) =>
                setEtiquetasElegidas((anteriores) =>
                  anteriores.includes(idEtiqueta)
                    ? anteriores.filter((id) => id !== idEtiqueta)
                    : [...anteriores, idEtiqueta],
                )
              }
              alCrear={alCrearEtiqueta}
              vacio="Todavía no tienes etiquetas. Puedes crear una aquí y quedará puesta al cargar."
            />
          </div>

          {/*
            Decir qué se hace solo. Sin esto, el tema y el resumen parecen
            campos que se olvidó pedir.
          */}
          <div className="flex gap-3 rounded-[24px] bg-fondo px-5 py-4 shadow-[inset_0_0_0_1px_var(--bitacora-filete)]">
            <span aria-hidden="true" className="material-symbols-rounded icono-contorno shrink-0 text-xl text-texto-tenue">
              auto_awesome
            </span>
            <p className="text-sm leading-relaxed text-texto-tenue">
              Del contenido se encarga el análisis: saca el tema principal, el resumen y las fichas, cada
              una con su minuto exacto y su tipo. Podrás revisarlas y validarlas cuando termine.
            </p>
          </div>

          {sinClave ? (
            <div className="flex flex-col gap-3 rounded-[24px] bg-fondo px-5 py-4 shadow-[inset_0_0_0_1px_var(--color-error-borde)]">
              <p className="text-sm leading-relaxed text-texto">
                Sin tu API key la conferencia se guarda y queda en cola, pero nadie la analizará todavía.
              </p>
              <button
                type="button"
                onClick={() => {
                  alCerrar()
                  navegar('/configuracion#config-api-key')
                }}
                className="w-fit cursor-pointer rounded-full bg-acento-tenue px-4 py-2 text-sm text-texto transition-colors hover:bg-acento hover:text-acento-contraste"
              >
                Configurar la API key
              </button>
            </div>
          ) : null}

          {error === null ? null : (
            <p role="alert" className="px-1 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="h-12 cursor-pointer rounded-full bg-acento text-base font-medium text-acento-contraste transition-opacity disabled:cursor-default disabled:opacity-60"
          >
            {enviando ? 'Cargando…' : 'Cargar conferencia'}
          </button>
        </form>
      </Modal>

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
