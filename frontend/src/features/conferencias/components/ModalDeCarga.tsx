import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement, RefObject } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useApiKey } from '@/features/configuracion/useApiKey'
import { mensajeDeError } from '@/shared/errors'
import { Modal, SelectorDeFecha, SelectorDeOpciones } from '@/shared/ui'
import type { OpcionDeSelector } from '@/shared/ui'
import {
  EXTENSIONES_POR_FUENTE,
  duracionDeArchivo,
  fichasPedidas,
  maximoDeFichasPara,
  fuenteDeArchivo,
  tituloSugerido,
  validarArchivo,
} from '../carga'
import type { Densidad } from '../carga'
import type { Conferencia, Etiqueta, FuenteDeConferencia } from '../data'
import { formatearTimestamp } from '../data'
import { useDirectorio } from '../directorio'
import { crearConferencia, eliminarConferencia, solicitarProcesamiento } from '../repositorio'
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

/* Las dos familias juntas: la extensión decide cuál es, no un control aparte. */
const EXTENSIONES_ADMITIDAS = [
  ...EXTENSIONES_POR_FUENTE.audio,
  ...EXTENSIONES_POR_FUENTE.transcripcion,
].join(',')

const DENSIDADES: readonly { valor: Densidad; etiqueta: string }[] = [
  { valor: 'pocas', etiqueta: 'Pocas' },
  { valor: 'equilibrado', etiqueta: 'Equilibrado' },
  { valor: 'muchas', etiqueta: 'Muchas' },
  { valor: 'libre', etiqueta: 'Sin límite' },
]

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

export type PropsModalDeCarga = {
  abierto: boolean
  alCerrar: () => void
  /** El botón desde el que crece. Sin esto el modal solo se funde, sin FLIP. */
  anclaEn?: RefObject<HTMLElement | null>
  /** Región dentro de la cual debe caber, para no montarse sobre la navegación. */
  limites?: RefObject<HTMLElement | null>
  /** La conferencia ya guardada, y las etiquetas que se le eligieron al crearla. */
  alCargar: (conferencia: Conferencia, idsDeEtiqueta: readonly string[]) => void
  etiquetas: readonly Etiqueta[]
  alCrearEtiqueta: (nombre: string) => Promise<ResultadoCreacion>
  alEliminarEtiqueta?: (idEtiqueta: string) => void
}

export function ModalDeCarga({
  abierto,
  alCerrar,
  anclaEn,
  limites,
  alCargar,
  etiquetas,
  alCrearEtiqueta,
  alEliminarEtiqueta,
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
  const [densidad, setDensidad] = useState<Densidad>('equilibrado')
  const [etiquetasElegidas, setEtiquetasElegidas] = useState<readonly string[]>([])
  const [errores, setErrores] = useState<ErroresDeCampo>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  /*
    Cancelar no aborta la subida: `supabase.storage.upload` no acepta un
    `AbortSignal` en esta version del SDK, asi que los bytes siguen viajando.
    Lo que si se garantiza es el resultado: cuando la carga termina se deshace,
    y no queda ninguna conferencia a medias ni ningun audio huerfano.

    Es una `ref` y no estado porque `alEnviar` la lee despues de un `await`, y
    una variable de estado le llegaria con el valor que tenia al empezar.
  */
  const cancelada = useRef(false)

  /* Cada apertura empieza en blanco: es una conferencia nueva, no la anterior a medias. */
  useEffect(() => {
    if (!abierto) {
      return
    }

    setCampos(CAMPOS_VACIOS)
    setArchivo(null)
    setDuracion(0)
    setDensidad('equilibrado')
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

  /* Devuelven el id creado: el selector lo deja elegido sin un segundo viaje. */
  async function alCrearEvento(
    nombre: string,
  ): Promise<{ ok: true; valor: string } | { ok: false; mensaje: string }> {
    const resultado = await crearEvento(nombre)

    return resultado.ok
      ? { ok: true, valor: resultado.evento.id }
      : { ok: false, mensaje: mensajeDeError(resultado.codigo) }
  }

  async function alCrearPonente(
    nombre: string,
  ): Promise<{ ok: true; valor: string } | { ok: false; mensaje: string }> {
    const resultado = await crearPonente(campos.idEvento, nombre)

    return resultado.ok
      ? { ok: true, valor: resultado.ponente.id }
      : { ok: false, mensaje: mensajeDeError(resultado.codigo) }
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
    cancelada.current = false

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
        maximoDeFichas: fichasPedidas(densidad, duracion),
      },
      archivo,
    )

    if (!resultado.ok) {
      setEnviando(false)
      setError(mensajeDeError(resultado.codigo))
      return
    }

    /* Se cancelo mientras subia: se deshace lo creado y el analisis ni se pide. */
    if (cancelada.current) {
      void eliminarConferencia(resultado.datos.id, idUsuario)
      setEnviando(false)
      alCerrar()
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

  /*
    La opción de crear va como una más al final de la lista, no como un botón
    aparte: crear un evento es otra forma de elegirlo, y separarla obligaría a
    buscar en dos sitios lo que es la misma decisión.
  */
  const opcionesDeEvento: readonly OpcionDeSelector<string>[] = [
    ...eventos.map((evento) => ({ valor: evento.id, etiqueta: evento.nombre })),
  ]

  const opcionesDePonente: readonly OpcionDeSelector<string>[] = [
    ...ponentes
      .filter((ponente) => ponente.idEvento === campos.idEvento)
      .map((ponente) => ({ valor: ponente.id, etiqueta: ponente.nombre })),
  ]

  const sinClave = !cargandoApiKey && apiKey === null

  return (
    <>
      <Modal
        abierto={abierto}
        alCerrar={alCerrar}
        titulo="Cargar conferencia"
        ancho="normal"
        {...(anclaEn === undefined ? {} : { anclaje: 'disparador' as const, anclaEn })}
        {...(limites === undefined ? {} : { limites })}
      >
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

          {/*
            El título es el único campo de escritura libre, y por eso es el
            único que se ve como campo. No lleva rótulo encima: el marcador de
            posición ya dice qué va ahí, y un rótulo sería decir lo mismo dos
            veces en un formulario que cabe de un vistazo.
          */}
          <div className="flex flex-col gap-1.5">
            <input
              id="carga-titulo"
              value={campos.titulo}
              onChange={(cambio) => actualizar({ titulo: cambio.target.value })}
              placeholder="Título de la conferencia"
              aria-label="Título de la conferencia"
              className="h-12 w-full rounded-2xl bg-acento-tenue px-4 text-base text-texto placeholder:text-texto-tenue focus:outline-2 focus:outline-offset-2 focus:outline-acento"
            />
            {errores.titulo === undefined ? null : (
              <p role="alert" className="px-1 text-sm text-error">
                {errores.titulo}
              </p>
            )}
          </div>

          {/*
            Lo demás son pastillas que llevan puesto su propio valor, como en
            la app de referencia: cerradas dicen lo que vale el campo, no cómo
            se llama. El icono es el que dice de qué va, y cuando están vacías
            piden lo que les falta ("Elige un evento").
          */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <SelectorDeOpciones
                etiquetaAccesible="Evento"
                icono="folder"
                vacio="Elige un evento"
                valor={campos.idEvento}
                opciones={opcionesDeEvento}
                textoDeCreacion="Nombre del evento nuevo"
                alCrear={alCrearEvento}
                alCambiar={(valor) => {
                  /* Cambiar de evento invalida el ponente: los ponentes cuelgan del evento. */
                  actualizar({ idEvento: valor, idPonente: '' })
                }}
              />

              <SelectorDeOpciones
                etiquetaAccesible="Ponente"
                icono="mic"
                vacio={campos.idEvento === '' ? 'Elige primero el evento' : 'Elige un ponente'}
                deshabilitado={campos.idEvento === ''}
                valor={campos.idPonente}
                opciones={opcionesDePonente}
                textoDeCreacion="Nombre del ponente nuevo"
                alCrear={alCrearPonente}
                alCambiar={(valor) => actualizar({ idPonente: valor })}
              />

              <SelectorDeFecha
                etiquetaAccesible="Fecha del evento"
                vacio="Fecha del evento"
                valor={campos.fechaDelEvento === '' ? null : campos.fechaDelEvento}
                alElegir={(iso) => actualizar({ fechaDelEvento: iso })}
              />
            </div>

            {[errores.idEvento, errores.idPonente, errores.fechaDelEvento]
              .filter((mensaje): mensaje is string => mensaje !== undefined)
              .map((mensaje) => (
                <p key={mensaje} role="alert" className="px-1 text-sm text-error">
                  {mensaje}
                </p>
              ))}
          </div>

          {/*
            Cuantas fichas se quieren.

            Las opciones son fracciones del techo que impone la duracion, no
            numeros fijos: "pocas" no significa lo mismo en una charla de diez
            minutos que en una de dos horas. El techo solo se puede calcular
            con un audio, que es de donde sale la duracion; con una
            transcripcion el backend lo recorta cuando la transcribe y sabe
            cuanto dura de verdad.
          */}
          <div className="flex flex-col gap-2">
            <p className="px-1 text-sm font-medium text-texto-tenue">
              Cuántas fichas
              {duracion > 0 ? (
                <span className="font-normal"> · hasta {maximoDeFichasPara(duracion)} en esta charla</span>
              ) : null}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {DENSIDADES.map((opcion) => {
                const activa = opcion.valor === densidad
                const cuantas = duracion > 0 ? fichasPedidas(opcion.valor, duracion) : null

                return (
                  <label
                    key={opcion.valor}
                    className={`relative cursor-pointer rounded-full px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-acento ${
                      activa
                        ? 'bg-acento text-acento-contraste'
                        : 'bg-acento-tenue text-texto-tenue hover:text-texto'
                    }`}
                  >
                    <input
                      type="radio"
                      name="densidad-de-fichas"
                      checked={activa}
                      onChange={() => setDensidad(opcion.valor)}
                      className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                    />
                    {opcion.etiqueta}
                    {cuantas === null ? null : <span className="opacity-70"> · {cuantas}</span>}
                  </label>
                )
              })}
            </div>
          </div>

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
              {...(alEliminarEtiqueta === undefined ? {} : { alEliminar: alEliminarEtiqueta })}
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

          {enviando ? (
            <div className="flex gap-2">
              <span className="flex h-12 flex-1 items-center justify-center rounded-full bg-acento-tenue text-base text-texto-tenue">
                Cargando…
              </span>
              <button
                type="button"
                onClick={() => {
                  cancelada.current = true
                }}
                className="h-12 cursor-pointer rounded-full px-6 text-base text-texto transition-colors hover:bg-acento-tenue"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="submit"
              className="h-12 cursor-pointer rounded-full bg-acento text-base font-medium text-acento-contraste transition-opacity"
            >
              Cargar conferencia
            </button>
          )}
        </form>
      </Modal>

    </>
  )
}
