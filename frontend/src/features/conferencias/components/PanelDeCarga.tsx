import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useApiKey } from '@/features/configuracion/useApiKey'
import { mensajeDeError } from '@/shared/errors'
import {
  Button,
  DialogoDeCreacion,
  Field,
  Input,
  InputDeArchivo,
  MensajeDeFormulario,
  Select,
} from '@/shared/ui'
import type { OpcionDeSelect } from '@/shared/ui'
import { cargarConferencia, agregarConferenciaCargada, EXTENSIONES_POR_FUENTE } from '../carga'
import type { DatosDeCarga } from '../carga'
import { SegmentacionDeFuente } from './SegmentacionDeFuente'
import { VistaPreviaDeCarga } from './VistaPreviaDeCarga'
import type { Conferencia, FuenteDeConferencia } from '../data'
import { useDirectorio } from '../directorio'

/*
  Formulario de carga de conferencia, como panel lateral deslizable sobre el
  dashboard (no un diálogo modal: se probó esa forma y no convenció).

  Antes era su propia pantalla con ruta e ítem de navegación propios; el
  usuario la encontró innecesaria como unidad separada ("no veo útil tener una
  pantalla aparte") y pidió que viviera dentro de Conferencias, disparada por
  un botón. Al enviar, la conferencia queda guardada (por sesión, por
  usuario) y aparece de inmediato en el listado con su estado "Procesando" y
  una barra que avanza en tiempo real — ver `FilaDeConferencia` y
  `carga/progreso.ts`. Ya no hay una pantalla de confirmación aparte: cerrar
  el panel y ver la fila nueva en el listado ES la confirmación.
*/

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
    errores.idEvento = 'Elige el evento al que pertenece esta conferencia.'
  }
  if (datos.idPonente === '') {
    errores.idPonente = 'Elige quién dio la conferencia.'
  }
  if (datos.fechaDelEvento === '') {
    errores.fechaDelEvento = 'Elige la fecha del evento.'
  }
  if (archivo === null) {
    errores.archivo = 'Elige el archivo de audio o transcripción.'
  }

  return errores
}

function codigoDeEvento(idEvento: string): string {
  return idEvento.replace(/^evt-/, '').toUpperCase()
}

export type PropsPanelDeCarga = {
  abierto: boolean
  alCerrar: () => void
  /** Se llama con la conferencia ya guardada, para que el dashboard refresque su listado. */
  alCargar: (conferencia: Conferencia) => void
}

export function PanelDeCarga({ abierto, alCerrar, alCargar }: PropsPanelDeCarga) {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { eventos, ponentes, crearEvento, crearPonente } = useDirectorio()
  const { clave: apiKey } = useApiKey(idUsuario)
  const navegar = useNavigate()

  const panelRef = useRef<HTMLDivElement>(null)
  const alCerrarRef = useRef(alCerrar)
  const [datos, setDatos] = useState<DatosDeCarga>(CAMPOS_VACIOS)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [erroresDeCampo, setErroresDeCampo] = useState<ErroresDeCampo>({})
  const [enviando, setEnviando] = useState(false)
  const [dialogoAbierto, setDialogoAbierto] = useState<'evento' | 'ponente' | null>(null)

  useEffect(() => {
    alCerrarRef.current = alCerrar
  })

  /*
    Mientras el panel está abierto se comporta como un diálogo modal: bloquea
    el desplazamiento del documento, cierra con Escape y devuelve el foco a
    quien lo abrió. Mismo patrón que el cajón de navegación en ShellLayout.
  */
  useEffect(() => {
    const panel = panelRef.current
    if (panel !== null) {
      panel.inert = !abierto
    }

    if (!abierto) {
      return
    }

    const enfocadoAntes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const desbordePrevio = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    setDatos(CAMPOS_VACIOS)
    setArchivo(null)
    setError(null)
    setErroresDeCampo({})

    const primerCampo = panel?.querySelector<HTMLElement>('input, select')
    ;(primerCampo ?? panel)?.focus()

    function alPresionarTecla(evento: KeyboardEvent): void {
      if (evento.key === 'Escape') {
        alCerrarRef.current()
      }
    }

    document.addEventListener('keydown', alPresionarTecla)
    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = desbordePrevio

      const aRestaurar = enfocadoAntes !== null && enfocadoAntes.isConnected ? enfocadoAntes : null
      aRestaurar?.focus()
    }
  }, [abierto])

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

      const nombreEvento = eventos.find((candidato) => candidato.id === datos.idEvento)?.nombre ?? ''
      const nombrePonente = ponentes.find((candidato) => candidato.id === datos.idPonente)?.nombre ?? ''

      const nueva: Conferencia = {
        id: `cnf-carga-${Date.now()}`,
        titulo: datos.titulo,
        ponente: nombrePonente,
        evento: nombreEvento,
        codigoDeEvento: codigoDeEvento(datos.idEvento),
        fechaDelEvento: datos.fechaDelEvento,
        duracionEnSegundos: 0,
        idDueno: idUsuario,
        estado: 'procesando',
        /* Sin tema todavía: lo asigna el procesamiento al clasificar la charla contra la taxonomía. */
        idTemaPrincipal: '',
        resumen: '',
        fuente: datos.fuente,
        comparticiones: [],
        cargadaEl: new Date().toISOString(),
      }

      agregarConferenciaCargada(idUsuario, nueva)
      setEnviando(false)
      alCargar(nueva)
    } catch {
      setError(mensajeDeError('CARGA_FALLO_INESPERADO'))
      setEnviando(false)
    }
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
      <div
        aria-hidden="true"
        onClick={alCerrar}
        className={`fixed inset-0 z-40 bg-fondo/70 transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        ref={panelRef}
        {...(abierto ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Cargar conferencia' } : {})}
        aria-hidden={abierto ? undefined : 'true'}
        aria-describedby={error === null ? undefined : ID_ERROR}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[min(48rem,100vw)] flex-col border-l border-filete-fuerte bg-panel elevacion transition-transform duration-300 ease-out focus:outline-none ${
          abierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-filete px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-texto">Cargar conferencia</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {apiKey === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="max-w-sm text-sm text-texto">{mensajeDeError('CARGA_API_KEY_REQUERIDA')}</p>
            <Button
              variante="primario"
              onClick={() => {
                alCerrar()
                navegar('/configuracion#config-api-key')
              }}
            >
              Ir a Configuración
            </Button>
          </div>
        ) : (
        <form
          noValidate
          onSubmit={(evento) => {
            void alEnviar(evento)
          }}
          className="flex flex-1 flex-col gap-5 overflow-y-auto p-6"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="flex flex-col gap-5">
              <Field
                id="carga-titulo"
                etiqueta="Título"
                {...(erroresDeCampo.titulo ? { error: erroresDeCampo.titulo } : {})}
              >
                <Input value={datos.titulo} onChange={(evento) => actualizar({ titulo: evento.target.value })} />
              </Field>

              <div className="flex flex-col gap-4 rounded-md bg-fondo p-4">
                <h3 className="text-sm font-medium text-texto">Evento y ponente</h3>

                <Field
                  id="carga-evento"
                  etiqueta="Evento"
                  {...(erroresDeCampo.idEvento ? { error: erroresDeCampo.idEvento } : {})}
                >
                  <Select
                    opciones={opcionesDeEvento}
                    value={datos.idEvento}
                    onChange={(evento) => cambiarEvento(evento.target.value)}
                  />
                </Field>

                <Field
                  id="carga-ponente"
                  etiqueta="Ponente"
                  {...(erroresDeCampo.idPonente ? { error: erroresDeCampo.idPonente } : {})}
                >
                  <Select
                    opciones={opcionesDePonente}
                    value={datos.idPonente}
                    disabled={datos.idEvento === ''}
                    onChange={(evento) => cambiarPonente(evento.target.value)}
                  />
                </Field>
              </div>

              <Field
                id="carga-fecha"
                etiqueta="Fecha del evento"
                {...(erroresDeCampo.fechaDelEvento ? { error: erroresDeCampo.fechaDelEvento } : {})}
              >
                <Input
                  type="date"
                  value={datos.fechaDelEvento}
                  onChange={(evento) => actualizar({ fechaDelEvento: evento.target.value })}
                />
              </Field>

              <div className="flex flex-col gap-4 rounded-md bg-fondo p-4">
                <h3 className="text-sm font-medium text-texto">Fuente y archivo</h3>

                <SegmentacionDeFuente fuente={datos.fuente} alCambiar={cambiarFuente} />

                <Field
                  id="carga-archivo"
                  etiqueta="Archivo"
                  {...(erroresDeCampo.archivo ? { error: erroresDeCampo.archivo } : {})}
                >
                  <InputDeArchivo
                    accept={EXTENSIONES_POR_FUENTE[datos.fuente].join(',')}
                    archivo={archivo}
                    alSeleccionar={elegirArchivo}
                  />
                </Field>
              </div>
            </div>

            <VistaPreviaDeCarga datos={datos} archivo={archivo} eventos={eventos} ponentes={ponentes} />
          </div>

          {error === null ? null : <MensajeDeFormulario id={ID_ERROR}>{error}</MensajeDeFormulario>}

          <Button type="submit" variante="primario" cargando={enviando} className="mt-1 w-full">
            Cargar conferencia
          </Button>
        </form>
        )}
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
