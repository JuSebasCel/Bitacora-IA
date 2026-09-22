import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement, RefObject } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useApiKey } from '@/features/configuracion/useApiKey'
import { mensajeDeError } from '@/shared/errors'
import { EleccionEnPastillas, hoyEnIso, Modal, SelectorDeFecha, SelectorDeOpciones } from '@/shared/ui'
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
import type { Conferencia, FuenteDeConferencia } from '../data'
import { formatearTimestamp } from '../data'
import { useDirectorio } from '../directorio'
import { crearConferencia } from '../repositorio'
import { subirEnSegundoPlano } from '../carga/segundoPlano'
import { usePreferencias } from '@/features/configuracion/preferencias'

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

  Lo que hará la IA no se explica en un recuadro: el formulario ya no pide
  tema ni resumen, y un párrafo que lo justificara era texto que nadie leía.

  Se abre desde tres sitios —el dock, la cabecera y el pie de la columna—,
  pero siempre crece desde el botón de la cabecera y queda colgado de él: así
  nace en el mismo lugar venga de donde venga.
*/

/* Las dos familias juntas: la extensión decide cuál es, no un control aparte. */
const EXTENSIONES_ADMITIDAS = [
  ...EXTENSIONES_POR_FUENTE.audio,
  ...EXTENSIONES_POR_FUENTE.transcripcion,
].join(',')

const DENSIDADES: readonly { valor: Densidad; etiqueta: string; icono: string }[] = [
  { valor: 'pocas', etiqueta: 'Pocas', icono: 'filter_list' },
  { valor: 'equilibrado', etiqueta: 'Equilibrado', icono: 'balance' },
  { valor: 'muchas', etiqueta: 'Muchas', icono: 'stacks' },
  { valor: 'libre', etiqueta: 'Sin límite', icono: 'all_inclusive' },
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
  /** La conferencia recién creada; su archivo y su análisis siguen en segundo plano. */
  alCargar: (conferencia: Conferencia) => void
}

export function ModalDeCarga({
  abierto,
  alCerrar,
  anclaEn,
  limites,
  alCargar,
}: PropsModalDeCarga): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { eventos, ponentes, crearEvento, crearPonente, eliminarEvento, eliminarPonente } = useDirectorio()
  const { puedeUsarIa, cargando: cargandoApiKey } = useApiKey()
  const navegar = useNavigate()

  const entradaDeArchivo = useRef<HTMLInputElement>(null)

  const [campos, setCampos] = useState<Campos>(CAMPOS_VACIOS)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [duracion, setDuracion] = useState(0)
  const [densidad, setDensidad] = useState<Densidad>('equilibrado')
  const [errores, setErrores] = useState<ErroresDeCampo>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const { analizarAlCargar } = usePreferencias()
  const formulario = useRef<HTMLFormElement>(null)
  const finDelFormulario = useRef<HTMLSpanElement>(null)

  /* Cada apertura empieza en blanco: es una conferencia nueva, no la anterior a medias. */
  useEffect(() => {
    if (!abierto) {
      return
    }

    setCampos(CAMPOS_VACIOS)
    setArchivo(null)
    setDuracion(0)
    setDensidad('equilibrado')
    setErrores({})
    setError(null)
  }, [abierto])

  const fuente = archivo === null ? null : fuenteDeArchivo(archivo)

  /*
    A medida que se rellena, el modal baja solo: al completar un campo se hace
    visible el que viene debajo, y tras la fecha, el botón de cargar.

    El formulario es más alto que la pantalla, y el botón quedaba bajo el
    borde: se llegaba al final de los campos sin ver dónde se terminaba.

    Es "el de debajo" y no "el primero que falte", a propósito. La primera
    versión buscaba el primer campo vacío, y medido en pantalla eso fallaba
    justo en el caso que importa: con el archivo sin elegir —que está arriba
    del todo— cualquier campo que se completara apuntaba hacia arriba, la
    vista no se movía y el botón seguía perdido. Rellenar va hacia abajo, y el
    desplazamiento tiene que ir con ella.

    - Solo cuenta lo que se elige de un toque (archivo, evento, ponente,
      fecha). El título se escribe, y mover la vista con la primera letra
      sería desplazar el campo bajo los dedos de quien teclea.
    - `block: 'nearest'`: si lo de debajo ya se ve, no se mueve nada. Baja lo
      justo y nunca sube.
    - Solo al completar. Vaciar un campo no arrastra la vista.
  */
  const hechos = {
    archivo: archivo !== null,
    evento: campos.idEvento !== '',
    ponente: campos.idPonente !== '',
    fecha: campos.fechaDelEvento !== '',
  }
  const hechosAntes = useRef(hechos)

  useEffect(() => {
    const antes = hechosAntes.current
    hechosAntes.current = hechos

    /* Qué se ve a continuación de cada uno. `null` es el final: el botón. */
    const siguienteDe = { archivo: 'titulo', evento: 'ponente', ponente: 'fecha', fecha: null } as const

    const recienCompletado = (Object.keys(siguienteDe) as (keyof typeof siguienteDe)[]).find(
      (campo) => hechos[campo] && !antes[campo],
    )

    if (recienCompletado === undefined) {
      return
    }

    const siguiente = siguienteDe[recienCompletado]
    const destino =
      siguiente === null
        ? finDelFormulario.current
        : formulario.current?.querySelector<HTMLElement>(`[data-campo="${siguiente}"]`)

    const sinMovimiento =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /*
      Un cuadro de espera: el campo recién elegido puede cambiar de alto (el
      archivo pasa de la zona de soltar a su nombre), y medir antes de que el
      DOM se asiente calcularía contra una altura que ya no es.
    */
    const cuadro = requestAnimationFrame(() => {
      destino?.scrollIntoView({ block: 'nearest', behavior: sinMovimiento ? 'auto' : 'smooth' })
    })

    return () => cancelAnimationFrame(cuadro)
  }, [hechos.archivo, hechos.evento, hechos.ponente, hechos.fecha])

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

    const nombreEvento = eventos.find((candidato) => candidato.id === campos.idEvento)?.nombre ?? ''
    const nombrePonente = ponentes.find((candidato) => candidato.id === campos.idPonente)?.nombre ?? ''

    /*
      Aquí solo se espera a la fila: es lo que hace falta para que exista la
      tarjeta. El archivo y el análisis siguen en segundo plano (ver
      `carga/segundoPlano.ts`), y la tarjeta va diciendo por dónde van.
    */
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
      null,
    )

    setEnviando(false)

    if (!resultado.ok) {
      setError(mensajeDeError(resultado.codigo))
      return
    }

    if (archivo !== null) {
      void subirEnSegundoPlano(resultado.datos, archivo, analizarAlCargar)
    }

    alCargar(resultado.datos)
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

  const sinClave = !cargandoApiKey && !puedeUsarIa

  return (
    <>
      <Modal
        abierto={abierto}
        alCerrar={alCerrar}
        titulo="Cargar conferencia"
        /*
          Anclado a su botón, como los demás modales de la cabecera, y ancho:
          a 440px el formulario no cabía y se partía en una columna larga
          que se salía por abajo; a 720px caben las tres pastillas de evento,
          ponente y fecha en un solo renglón.
        */
        ancho="normal"
        {...(anclaEn === undefined ? {} : { anclaje: 'disparador' as const, anclaEn })}
        {...(limites === undefined ? {} : { limites })}
      >
        <form
          ref={formulario}
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
          <div data-campo="archivo" className="flex flex-col gap-1.5">
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
                <span className="text-base text-texto">Elige el audio o la transcripción</span>
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
                    {/* Solo la de un audio: la de un texto es una cuenta interna para el tope de fichas, no un dato. */}
                    {fuente === 'audio' && duracion > 0 ? ` · ${formatearTimestamp(duracion)}` : ''} ·{' '}
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
          <div data-campo="titulo" className="flex flex-col gap-1.5">
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
          {/*
            Tres celdas fijas, una por pastilla, y no un `flex-wrap`.

            Con el reparto automático la posición de cada pastilla dependía de
            cuánto texto llevaba puesto: al elegir un ponente de nombre corto,
            saltaba a la fila de arriba justo al usarlo. En una rejilla cada
            una tiene su sitio y nada se mueve por rellenarlo. `items-start`
            para que cada pastilla siga midiendo lo que su valor.
          */}
          <div className="grid grid-cols-3 items-start gap-2">
            <div data-campo="evento" className="min-w-0">
              <SelectorDeOpciones
                etiquetaAccesible="Evento"
                icono="folder"
                vacio="Elige un evento"
                valor={campos.idEvento}
                opciones={opcionesDeEvento}
                textoDeCreacion="Nombre del evento nuevo"
                alCrear={alCrearEvento}
                alEliminar={(idEvento) => {
                  if (campos.idEvento === idEvento) {
                    actualizar({ idEvento: '', idPonente: '' })
                  }
                  void eliminarEvento(idEvento)
                }}
                alCambiar={(valor) => {
                  /* Cambiar de evento invalida el ponente: los ponentes cuelgan del evento. */
                  actualizar({ idEvento: valor, idPonente: '' })
                }}
              />
            </div>

            <div data-campo="ponente" className="min-w-0">
              <SelectorDeOpciones
                etiquetaAccesible="Ponente"
                icono="mic"
                vacio={campos.idEvento === '' ? 'Elige primero el evento' : 'Elige un ponente'}
                deshabilitado={campos.idEvento === ''}
                valor={campos.idPonente}
                opciones={opcionesDePonente}
                textoDeCreacion="Nombre del ponente nuevo"
                alCrear={alCrearPonente}
                alEliminar={(idPonente) => {
                  if (campos.idPonente === idPonente) {
                    actualizar({ idPonente: '' })
                  }
                  void eliminarPonente(idPonente)
                }}
                alCambiar={(valor) => actualizar({ idPonente: valor })}
              />
            </div>

            <div data-campo="fecha" className="min-w-0">
              <SelectorDeFecha
                etiquetaAccesible="Fecha del evento"
                vacio="Fecha del evento"
                valor={campos.fechaDelEvento === '' ? null : campos.fechaDelEvento}
                /*
                  Hasta hoy: una conferencia se carga cuando ya ocurrió —hay
                  su audio o su transcripción—, así que una fecha futura es
                  casi siempre un error al tocar, y la dejaría mal ordenada
                  entre las recientes.
                */
                maximo={hoyEnIso()}
                alElegir={(iso) => actualizar({ fechaDelEvento: iso })}
              />
            </div>

            {[errores.idEvento, errores.idPonente, errores.fechaDelEvento]
              .filter((mensaje): mensaje is string => mensaje !== undefined)
              .map((mensaje) => (
                <p key={mensaje} role="alert" className="col-span-3 px-1 text-sm text-error">
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

            <EleccionEnPastillas
              opciones={DENSIDADES.map((opcion) => {
                const cuantas = duracion > 0 ? fichasPedidas(opcion.valor, duracion) : null
                return { ...opcion, etiqueta: cuantas === null ? opcion.etiqueta : `${opcion.etiqueta} · ${cuantas}` }
              })}
              valor={densidad}
              alCambiar={setDensidad}
            />
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
            Cargar conferencia
          </button>

          <span ref={finDelFormulario} aria-hidden="true" />
        </form>
      </Modal>

    </>
  )
}
