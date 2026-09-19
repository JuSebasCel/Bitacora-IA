import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { fichasDelCatalogo } from '@/features/conferencias/query'
import { useTemas } from '@/features/taxonomia'
import { useChat } from '../useChat'
import { BurbujaDeMensaje } from './BurbujaDeMensaje'
import { CompositorDeMensaje } from './CompositorDeMensaje'
import { ListaDeConversaciones } from './ListaDeConversaciones'
import { SelectorDeAlcance } from './SelectorDeAlcance'

export type PropsPanelDeChat = {
  abierto: boolean
  alCerrar: () => void
}

/*
  Panel lateral del chat, misma mecánica modal que `PanelDeCarga.tsx`
  (foco atrapado, `Escape` cierra, scroll del documento bloqueado mientras
  está abierto): se copia tal cual, solo cambia el contenido interior y el
  ancho, porque aquí hay dos columnas (conversaciones + chat) en vez de un
  formulario.
*/
export function PanelDeChat({ abierto, alCerrar }: PropsPanelDeChat): ReactElement {
  const { usuario } = useSession()
  const idUsuario = usuario?.id ?? ''
  const chat = useChat(idUsuario)

  const { visibles, fichas } = useConferenciasVisibles(idUsuario)
  const entradas = useMemo(() => fichasDelCatalogo(fichas, visibles), [fichas, visibles])
  const { temas } = useTemas()

  const panelRef = useRef<HTMLDivElement>(null)
  const alCerrarRef = useRef(alCerrar)
  const reducirMovimiento = useReducedMotion()

  useEffect(() => {
    alCerrarRef.current = alCerrar
  })

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

    const primerElemento = panel?.querySelector<HTMLElement>('button, textarea')
    ;(primerElemento ?? panel)?.focus()

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

  const alcanceActivo = chat.conversacionActiva?.alcance ?? { tipo: 'todas' as const }

  /*
    El índice de conversaciones no interpreta resultados: cada acción reporta su
    propio fallo por `chat.error`, que se dibuja una sola vez arriba del hilo.
    Estos envoltorios existen solo para descartar la promesa de forma explícita
    —`void`— en vez de dejar una promesa colgando en un manejador de evento.
  */
  function crearConversacion(): void {
    void chat.crear()
  }

  function renombrarConversacion(idConversacion: string, titulo: string): void {
    void chat.renombrar(idConversacion, titulo)
  }

  function eliminarConversacion(idConversacion: string): void {
    void chat.eliminar(idConversacion)
  }

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
        {...(abierto ? { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Chat sobre tus conferencias' } : {})}
        aria-hidden={abierto ? undefined : 'true'}
        tabIndex={-1}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-filete-fuerte bg-panel elevacion transition-transform duration-300 ease-out focus:outline-none ${
          abierto ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-filete px-4 py-3">
          <h2 className="text-base font-semibold tracking-tight text-texto">Chat</h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar"
            className="rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
          >
            <XIcon size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="hidden shrink-0 border-r border-filete sm:block sm:w-64">
            <ListaDeConversaciones
              conversaciones={chat.conversaciones}
              idActiva={chat.conversacionActiva?.id ?? null}
              cargando={chat.cargando}
              alSeleccionar={chat.seleccionar}
              alCrear={crearConversacion}
              alRenombrar={renombrarConversacion}
              alEliminar={eliminarConversacion}
            />
          </div>

          <div className="border-b border-filete sm:hidden">
            <ListaDeConversaciones
              conversaciones={chat.conversaciones}
              idActiva={chat.conversacionActiva?.id ?? null}
              cargando={chat.cargando}
              alSeleccionar={chat.seleccionar}
              alCrear={crearConversacion}
              alRenombrar={renombrarConversacion}
              alEliminar={eliminarConversacion}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {chat.error === null ? null : (
              <p role="alert" className="border-b border-filete bg-error/12 px-3 py-2 text-sm text-error">
                {chat.error}
              </p>
            )}

            <div className="flex-1 overflow-y-auto p-3">
              {chat.cargandoMensajes ? (
                <p className="text-sm text-texto-tenue">Cargando la conversación…</p>
              ) : chat.conversacionActiva === null && chat.mensajes.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-texto">Escribe una pregunta o crea una conversación nueva.</p>
                  <p className="text-xs text-texto-tenue">
                    El chat busca entre tus conferencias visibles y responde citando las fichas de donde sale cada
                    dato.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  <AnimatePresence initial={false}>
                    {chat.mensajes.map((mensaje) => (
                      <motion.li
                        key={mensaje.id}
                        initial={reducirMovimiento ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <BurbujaDeMensaje
                          mensaje={mensaje}
                          generando={chat.generacion?.idMensaje === mensaje.id}
                          inicioGeneracionMs={chat.generacion?.idMensaje === mensaje.id ? chat.generacion.inicioMs : null}
                          entradas={entradas}
                          temas={temas}
                          alElegirAclaracion={(alcance) => void chat.elegirAclaracion(mensaje.id, alcance)}
                          alEditar={(idMensaje, contenido) => void chat.editarYReenviar(idMensaje, contenido)}
                          alEtiquetar={(idMensaje, nombre) => void chat.etiquetarCitadas(idMensaje, nombre)}
                          alTerminarGeneracion={chat.finalizarGeneracion}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            <SelectorDeAlcance alcance={alcanceActivo} alCambiar={(alcance) => void chat.cambiarAlcance(alcance)} />
            {/*
              "Generando" cubre dos momentos que la persona vive como uno solo:
              la pregunta viajando hacia quien responde (`respondiendo`) y el
              texto revelándose ya recibido (`generacion`). Con la generación
              simulada el primero dura un instante; con el backend real es una
              llamada de red, y el botón tiene que ofrecer "Detener" desde el
              principio, no solo cuando ya hay texto que cortar.
            */}
            <CompositorDeMensaje
              generando={chat.respondiendo || chat.generacion !== null}
              alEnviar={(texto) => void chat.enviar(texto)}
              alDetener={() => void chat.detener()}
            />
          </div>
        </div>
      </div>
    </>
  )
}
