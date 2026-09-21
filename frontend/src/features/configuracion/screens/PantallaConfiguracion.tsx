import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactElement, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { nombreDePersona } from '@/features/conferencias/data'
import { privacidadEfectiva } from '@/features/conferencias/query'
import type { ConferenciaVisible } from '@/features/conferencias/query'
import { Button, CLASES_DE_PILDORA, Field, Input, MensajeDeFormulario } from '@/shared/ui'
import type { ColorDePildora } from '@/shared/ui'
import type { PropositoDeClave } from '../contextoApiKey'
import { useApiKey } from '../useApiKey'

const ID_CAMPO_API_KEY = 'config-api-key'

/*
  Configuración: las claves de OpenAI y lo que otras personas compartieron
  contigo.

  Con el lenguaje de las demás pantallas: título grande, paneles de radio
  24 sobre el fondo, sin filetes ni sombras. Se fue lo que ya no hacía
  nada: los permisos de "incluye pendientes" y "puedes validar" de cada
  compartida hablaban de la validación de fichas, que salió de la interfaz.

  Compartir una conferencia no vive aquí: está en la propia conferencia,
  que es donde se decide hacerlo.
*/

/*
  Dos claves, una por uso, en vez de una sola. Separarlas deja poner en
  OpenAI un límite de gasto distinto a cada una —analizar una charla larga
  cuesta mucho más que una pregunta de chat— y cortar una sin tocar la otra.
  La del chat es opcional: sin ella, el chat usa la de análisis.
*/
const USOS: readonly {
  proposito: PropositoDeClave
  titulo: string
  descripcion: string
  icono: string
}[] = [
  {
    proposito: 'analisis',
    titulo: 'Análisis y memorias',
    descripcion: 'Transcribe y analiza las conferencias que cargas, y redacta las memorias. Sin ella no se puede cargar nada.',
    icono: 'auto_awesome',
  },
  {
    proposito: 'chat',
    titulo: 'Chat',
    descripcion: 'Responde las preguntas del chat. Es opcional: si no pones una, el chat usa la de análisis.',
    icono: 'forum',
  },
]

/* Lo justo para reconocer cuál es sin poder copiarla: `sk-…a1b2`. */
function claveAbreviada(clave: string): string {
  return `${clave.slice(0, 3)}…${clave.slice(-4)}`
}

function TarjetaDeClave({
  proposito,
  titulo,
  descripcion,
  icono,
}: {
  proposito: PropositoDeClave
  titulo: string
  descripcion: string
  icono: string
}): ReactElement {
  const { clave: claveDeAnalisis, claveDeChat, cargando, guardar, borrar } = useApiKey()
  const clave = proposito === 'chat' ? claveDeChat : claveDeAnalisis
  const [valor, setValor] = useState('')
  const [mensaje, setMensaje] = useState<{ texto: string; esError: boolean } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const reducirMovimiento = useReducedMotion()

  async function alGuardar(): Promise<void> {
    if (enviando) return
    setEnviando(true)

    const resultado = await guardar(valor, proposito)
    setMensaje(resultado.ok ? { texto: 'Clave guardada.', esError: false } : { texto: resultado.mensaje, esError: true })
    if (resultado.ok) {
      setValor('')
    }
    setEnviando(false)
  }

  async function alQuitar(): Promise<void> {
    if (enviando) return
    setEnviando(true)

    const resultado = await borrar(proposito)
    setMensaje(resultado.ok ? { texto: 'Clave quitada.', esError: false } : { texto: resultado.mensaje, esError: true })
    setEnviando(false)
  }

  const estado =
    cargando ? null : clave !== null ? (
      <Estado color="verde">Guardada · {claveAbreviada(clave)}</Estado>
    ) : proposito === 'chat' ? (
      <Estado color={claveDeAnalisis === null ? 'rosa' : 'azul'}>
        {claveDeAnalisis === null ? 'Sin clave' : 'Usa la de análisis'}
      </Estado>
    ) : (
      <Estado color="rosa">Falta</Estado>
    )

  return (
    <section aria-label={`Clave de ${titulo.toLowerCase()}`} className="flex flex-col gap-5 rounded-[24px] bg-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ilustracion text-ilustracion-texto">
          <span aria-hidden="true" className="material-symbols-rounded icono-relleno text-[22px]">
            {icono}
          </span>
        </div>
        {estado}
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="font-titulo text-xl leading-tight font-semibold text-texto">{titulo}</h2>
        <p className="text-sm leading-relaxed text-texto-tenue">{descripcion}</p>
      </div>

      <Field
        id={proposito === 'analisis' ? ID_CAMPO_API_KEY : `config-api-key-${proposito}`}
        etiqueta={clave === null ? 'Pega tu clave' : 'Reemplazar por otra'}
      >
        <Input
          type="password"
          autoComplete="off"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              void alGuardar()
            }
          }}
          placeholder="sk-…"
        />
      </Field>

      <AnimatePresence mode="wait">
        {mensaje === null ? null : (
          <motion.div
            key={mensaje.texto}
            initial={reducirMovimiento ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {mensaje.esError ? (
              <MensajeDeFormulario id={`config-api-key-${proposito}-error`}>{mensaje.texto}</MensajeDeFormulario>
            ) : (
              <p className="text-sm text-texto-tenue">{mensaje.texto}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto flex gap-2">
        <Button
          variante="primario"
          cargando={enviando}
          disabled={valor.trim() === ''}
          onClick={() => {
            void alGuardar()
          }}
        >
          Guardar
        </Button>

        {cargando || clave === null ? null : (
          <Button
            variante="sutil"
            disabled={enviando}
            onClick={() => {
              void alQuitar()
            }}
          >
            Quitar
          </Button>
        )}
      </div>
    </section>
  )
}

/* El estado de cada clave en su color: verde lista, rosa falta, azul prestada de la de análisis. */
function Estado({ color, children }: { color: ColorDePildora; children: ReactNode }): ReactElement {
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${CLASES_DE_PILDORA[color]}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

const PASOS_PARA_CONSEGUIR_UNA_CLAVE: readonly ReactElement[] = [
  <>
    Entra a{' '}
    <a
      href="https://platform.openai.com/api-keys"
      target="_blank"
      rel="noreferrer"
      className="font-medium text-texto underline underline-offset-2"
    >
      platform.openai.com/api-keys
    </a>{' '}
    con tu cuenta de OpenAI.
  </>,
  <>Pulsa «Create new secret key» y ponle un nombre, por ejemplo «Menti Vault».</>,
  <>Copia la clave, que empieza por «sk-», y pégala arriba. OpenAI solo la muestra una vez.</>,
]

function ComoConseguirUnaClave(): ReactElement {
  return (
    <section aria-label="Cómo conseguir una clave" className="flex flex-col gap-4 rounded-[24px] bg-panel p-6">
      <h2 className="font-titulo text-xl leading-tight font-semibold text-texto">Cómo conseguir una clave</h2>

      <ol className="grid grid-cols-3 gap-3">
        {PASOS_PARA_CONSEGUIR_UNA_CLAVE.map((paso, indice) => (
          <li key={indice} className="flex gap-3 rounded-[20px] bg-fondo p-4 text-sm leading-relaxed text-texto-tenue">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-acento-tenue text-sm font-semibold text-texto">
              {indice + 1}
            </span>
            <p>{paso}</p>
          </li>
        ))}
      </ol>

    </section>
  )
}

function SeccionCompartidasConmigo({ visibles }: { visibles: readonly ConferenciaVisible[] }): ReactElement {
  const compartidas = visibles.filter((visible) => visible.procedencia === 'compartida')

  return (
    <section aria-label="Compartidas conmigo" className="flex flex-col gap-4 rounded-[24px] bg-panel p-6">
      <h2 className="font-titulo text-xl leading-tight font-semibold text-texto">Compartidas conmigo</h2>

      {compartidas.length === 0 ? (
        <p className="rounded-[20px] bg-fondo p-4 text-sm text-texto-tenue">
          Nadie ha compartido ninguna conferencia contigo todavía.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {compartidas.map((visible) => {
            const privacidad = privacidadEfectiva(visible)

            return (
              <li
                key={visible.conferencia.id}
                className="flex items-center justify-between gap-4 rounded-[20px] bg-fondo px-5 py-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-base font-medium text-texto">{visible.conferencia.titulo}</p>
                  <p className="text-sm text-texto-tenue">
                    Compartida por {nombreDePersona(visible.conferencia.idDueno) ?? 'otra persona'}
                  </p>
                </div>

                {privacidad.permitirRecompartir ? (
                  <span className="shrink-0 rounded-full bg-acento-tenue px-3 py-1 text-sm text-texto-tenue">
                    Puedes recompartir
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function PantallaConfiguracion(): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const { visibles } = useConferenciasVisibles(idUsuario)
  const ubicacion = useLocation()

  /*
    Quien llega desde el aviso de clave faltante (el menú de cuenta, o el
    modal de carga) trae `#config-api-key` en la URL: el campo se desplaza a
    la vista y recibe el foco, en vez de dejar a la persona a buscarlo.
  */
  useEffect(() => {
    if (ubicacion.hash !== `#${ID_CAMPO_API_KEY}`) {
      return
    }

    const campo = document.getElementById(ID_CAMPO_API_KEY)
    campo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    campo?.focus()
  }, [ubicacion.hash])

  return (
    <div className="flex flex-col gap-6 pb-6">
      <h1 className="font-titulo text-[32px] leading-none font-semibold text-texto">Configuración</h1>

      <div className="grid grid-cols-2 gap-4">
        {USOS.map((uso) => (
          <TarjetaDeClave key={uso.proposito} {...uso} />
        ))}
      </div>

      <ComoConseguirUnaClave />
      <SeccionCompartidasConmigo visibles={visibles} />
    </div>
  )
}
