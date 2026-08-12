import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from 'react'
import { resolverMarcador } from '../plantillas'
import type { ElementoDePlantilla, RolDeTexto } from '../data'

export type PropsElementoEnLienzo = {
  elemento: ElementoDePlantilla
  interactivo: boolean
  seleccionado: boolean
  onPointerDownCuerpo: (evento: ReactPointerEvent<HTMLDivElement>) => void
  onPointerDownMango: (evento: ReactPointerEvent<HTMLButtonElement>) => void
}

/*
  Un elemento del lienzo: texto, imagen o marcador, posicionado con `%` sobre
  el lienzo que lo contiene (el lienzo es el marco de referencia, así que el
  elemento escala con él sin necesitar medición en JS). El arrastre y el
  redimensionado en sí los maneja `LienzoDePlantilla` — este componente solo
  reenvía los eventos de puntero, no calcula posiciones.
*/

const CLASE_POR_ROL: Record<RolDeTexto, string> = {
  titulo: 'text-2xl font-semibold tracking-tight text-texto',
  subtitulo: 'text-lg font-medium text-texto',
  cuerpo: 'text-sm text-texto',
}

function ContenidoDeTexto({ elemento }: { elemento: Extract<ElementoDePlantilla, { tipo: 'texto' }> }) {
  if (elemento.contenido.trim() === '') {
    return <p className="text-sm text-texto-tenue italic">Texto</p>
  }

  return (
    <p className={CLASE_POR_ROL[elemento.rol]} style={elemento.color ? { color: elemento.color } : undefined}>
      {elemento.contenido}
    </p>
  )
}

function ContenidoDeImagen({ elemento }: { elemento: Extract<ElementoDePlantilla, { tipo: 'imagen' }> }) {
  return (
    <img
      src={elemento.url}
      alt={elemento.nombreDeArchivo}
      className="h-full w-full object-contain"
      draggable={false}
    />
  )
}

function ContenidoDeMarcador({ elemento }: { elemento: Extract<ElementoDePlantilla, { tipo: 'marcador' }> }) {
  const resuelto = resolverMarcador(elemento.campo, elemento.formato)

  return (
    <div className="h-full w-full rounded-md border border-dashed border-filete-fuerte p-2">
      {typeof resuelto === 'string' ? (
        <p className="text-sm text-texto-tenue italic">{resuelto}</p>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4 text-sm text-texto-tenue italic">
          {resuelto.map((linea) => (
            <li key={linea}>{linea}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ElementoEnLienzo({
  elemento,
  interactivo,
  seleccionado,
  onPointerDownCuerpo,
  onPointerDownMango,
}: PropsElementoEnLienzo): ReactElement {
  const estilo: CSSProperties = {
    left: `${elemento.posicion.x * 100}%`,
    top: `${elemento.posicion.y * 100}%`,
    width: `${elemento.posicion.ancho * 100}%`,
    height: `${elemento.posicion.alto * 100}%`,
  }

  return (
    <div
      data-testid={`elemento-${elemento.id}`}
      style={estilo}
      onPointerDown={interactivo ? onPointerDownCuerpo : undefined}
      className={`absolute overflow-hidden ${interactivo ? 'cursor-move touch-none' : ''} ${
        seleccionado ? 'outline outline-2 outline-offset-1 outline-acento' : ''
      }`}
    >
      {elemento.tipo === 'texto' ? <ContenidoDeTexto elemento={elemento} /> : null}
      {elemento.tipo === 'imagen' ? <ContenidoDeImagen elemento={elemento} /> : null}
      {elemento.tipo === 'marcador' ? <ContenidoDeMarcador elemento={elemento} /> : null}

      {interactivo && seleccionado ? (
        <button
          type="button"
          aria-label="Redimensionar"
          onPointerDown={(evento) => {
            evento.stopPropagation()
            onPointerDownMango(evento)
          }}
          className="absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize touch-none rounded-full border border-panel bg-acento"
        />
      ) : null}
    </div>
  )
}
