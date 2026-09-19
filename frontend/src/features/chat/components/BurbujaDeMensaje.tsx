import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import type { Tema } from '@/features/taxonomia'
import type { AlcanceDeConsulta, Mensaje } from '../data/tipos'
import { generacionCompleta, textoVisibleDe } from '../progreso'
import { MenuDeAclaracion } from './MenuDeAclaracion'
import { TarjetaDeFichaEnChat } from './TarjetaDeFichaEnChat'

export type PropsBurbujaDeMensaje = {
  mensaje: Mensaje
  generando: boolean
  inicioGeneracionMs: number | null
  entradas: readonly FichaDelCatalogo[]
  temas: readonly Tema[]
  alElegirAclaracion: (alcance: AlcanceDeConsulta) => void
  alEditar: (idMensaje: string, contenidoNuevo: string) => void
  alEtiquetar: (idMensaje: string, nombreEtiqueta: string) => void
  alTerminarGeneracion: () => void
}

const INTERVALO_DE_REVELADO_MS = 150

/*
  Tres siluetas según el mensaje: pregunta propia (editable), aclaración
  (opciones de alcance) o respuesta (texto revelado en vivo + citas). Mismo
  patrón de `setInterval` que `TarjetaDeMemoria.tsx` para forzar el
  re-render mientras el progreso no llega al 100%, adaptado de un
  porcentaje a la cantidad de texto visible.
*/
export function BurbujaDeMensaje({
  mensaje,
  generando,
  inicioGeneracionMs,
  entradas,
  temas,
  alElegirAclaracion,
  alEditar,
  alEtiquetar,
  alTerminarGeneracion,
}: PropsBurbujaDeMensaje): ReactElement {
  const [ahora, setAhora] = useState(() => Date.now())
  const [editando, setEditando] = useState(false)
  const [valorEditado, setValorEditado] = useState('')

  useEffect(() => {
    if (!generando || inicioGeneracionMs === null || mensaje.rol !== 'asistente' || mensaje.tipo !== 'respuesta') {
      return
    }

    const intervalo = setInterval(() => {
      const ahoraMs = Date.now()
      setAhora(ahoraMs)

      if (generacionCompleta(mensaje.contenido, inicioGeneracionMs, ahoraMs)) {
        alTerminarGeneracion()
      }
    }, INTERVALO_DE_REVELADO_MS)

    return () => clearInterval(intervalo)
  }, [generando, inicioGeneracionMs, mensaje, alTerminarGeneracion])

  if (mensaje.rol === 'usuario') {
    if (editando) {
      return (
        <div className="ml-auto flex max-w-[85%] flex-col gap-2 rounded-md bg-acento-tenue p-3">
          <textarea
            value={valorEditado}
            onChange={(evento) => setValorEditado(evento.target.value)}
            rows={2}
            className="resize-none rounded-md border border-filete bg-fondo px-2 py-1.5 text-sm text-texto focus:border-acento focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variante="sutil" onClick={() => setEditando(false)}>
              Cancelar
            </Button>
            <Button
              variante="primario"
              onClick={() => {
                alEditar(mensaje.id, valorEditado)
                setEditando(false)
              }}
            >
              Reenviar
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="ml-auto flex max-w-[85%] items-start gap-1.5">
        <button
          type="button"
          aria-label="Editar mensaje"
          onClick={() => {
            setValorEditado(mensaje.contenido)
            setEditando(true)
          }}
          className="mt-2.5 shrink-0 rounded-md p-1 text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-acento"
        >
          <PencilSimpleIcon size={14} weight="regular" aria-hidden="true" />
        </button>
        <p className="rounded-md bg-acento-tenue p-3 text-sm whitespace-pre-line text-texto">{mensaje.contenido}</p>
      </div>
    )
  }

  if (mensaje.tipo === 'aclaracion') {
    return (
      <div className="mr-auto max-w-[85%] rounded-md bg-panel p-3">
        <MenuDeAclaracion mensaje={mensaje} alElegir={alElegirAclaracion} />
      </div>
    )
  }

  const texto = generando ? textoVisibleDe(mensaje.contenido, inicioGeneracionMs ?? 0, ahora) : mensaje.contenido

  const entradasCitadas = generando
    ? []
    : mensaje.idsFichasCitadas.flatMap((idFicha) => {
        const entrada = entradas.find((candidata) => candidata.ficha.id === idFicha)
        return entrada === undefined ? [] : [entrada]
      })

  function pedirEtiqueta(): void {
    const nombre = window.prompt('Nombre de la etiqueta')
    if (nombre !== null && nombre.trim().length > 0) {
      alEtiquetar(mensaje.id, nombre.trim())
    }
  }

  return (
    <div className="mr-auto flex max-w-[85%] flex-col rounded-md bg-panel p-3">
      {mensaje.pasosDeRazonamiento.length === 0 ? null : (
        <details className="mb-2 text-xs text-texto-tenue">
          <summary className="cursor-pointer">Cómo llegué a esto</summary>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {mensaje.pasosDeRazonamiento.map((paso, indice) => (
              // Los pasos son un reporte fijo del pipeline, sin id propio: el índice es estable.
              <div key={paso.descripcion + indice}>
                <p className="font-medium text-texto-tenue">{paso.descripcion}</p>
                {paso.descartadas.length === 0 ? null : (
                  <ul className="ml-3 list-disc">
                    {paso.descartadas.map((descarte) => (
                      <li key={descarte.idFicha}>
                        {descarte.idFicha} — {descarte.motivo}
                      </li>
                    ))}
                  </ul>
                )}
                {paso.totalDescartadas > paso.descartadas.length ? (
                  <p className="ml-3">y {paso.totalDescartadas - paso.descartadas.length} más</p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="text-sm whitespace-pre-line text-texto">{texto}</p>

      {generando || entradasCitadas.length === 0 ? null : (
        <div className="mt-2 flex flex-col gap-2">
          {entradasCitadas.map((entrada) => (
            <TarjetaDeFichaEnChat key={entrada.ficha.id} entrada={entrada} temas={temas} />
          ))}
        </div>
      )}

      {generando || mensaje.idsFichasCitadas.length === 0 ? null : (
        <Button variante="sutil" onClick={pedirEtiqueta} className="mt-2 self-start">
          Etiquetar estas fichas
        </Button>
      )}
    </div>
  )
}
