import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { useSession } from '@/features/auth/session'
import { useConferenciasVisibles } from '@/features/conferencias/components'
import { FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import { fichasDelCatalogo } from '@/features/conferencias/query'
import { leerTaxonomia } from '@/features/taxonomia'
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

  const { visibles } = useConferenciasVisibles(idUsuario)
  const entradas = useMemo(() => fichasDelCatalogo(FICHAS_DE_EJEMPLO, visibles), [visibles])
  const temas = useMemo(() => leerTaxonomia().temas, [])

  const panelRef = useRef<HTMLDivElement>(null)
  const alCerrarRef = useRef(alCerrar)

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
              alSeleccionar={chat.seleccionar}
              alCrear={() => chat.crear()}
              alRenombrar={chat.renombrar}
              alEliminar={chat.eliminar}
            />
          </div>

          <div className="border-b border-filete sm:hidden">
            <ListaDeConversaciones
              conversaciones={chat.conversaciones}
              idActiva={chat.conversacionActiva?.id ?? null}
              alSeleccionar={chat.seleccionar}
              alCrear={() => chat.crear()}
              alRenombrar={chat.renombrar}
              alEliminar={chat.eliminar}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-3">
              {chat.conversacionActiva === null && chat.mensajes.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <p className="text-sm text-texto">Escribe una pregunta o crea una conversación nueva.</p>
                  <p className="text-xs text-texto-tenue">
                    El chat busca entre tus conferencias visibles y responde citando las fichas de donde sale cada
                    dato.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {chat.mensajes.map((mensaje) => (
                    <li key={mensaje.id}>
                      <BurbujaDeMensaje
                        mensaje={mensaje}
                        generando={chat.generacion?.idMensaje === mensaje.id}
                        inicioGeneracionMs={chat.generacion?.idMensaje === mensaje.id ? chat.generacion.inicioMs : null}
                        entradas={entradas}
                        temas={temas}
                        alElegirAclaracion={(alcance) => chat.elegirAclaracion(mensaje.id, alcance)}
                        alEditar={chat.editarYReenviar}
                        alEtiquetar={chat.etiquetarCitadas}
                        alTerminarGeneracion={chat.finalizarGeneracion}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <SelectorDeAlcance alcance={alcanceActivo} alCambiar={chat.cambiarAlcance} />
            <CompositorDeMensaje
              generando={chat.generacion !== null}
              alEnviar={(texto) => {
                chat.enviar(texto)
              }}
              alDetener={chat.detener}
            />
          </div>
        </div>
      </div>
    </>
  )
}
