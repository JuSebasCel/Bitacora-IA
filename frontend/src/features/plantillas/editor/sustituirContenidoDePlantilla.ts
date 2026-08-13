import type { JSONContent, OrigenDeMarcador, RegistroDeDatosDeCampo } from '../data'
import { resolverCondicionDeMarcador, resolverListaDeMarcador, resolverMarcador } from '../data'
import type { AttrsDeOrigen } from './extensiones/origen'
import { origenDesdeAttrs } from './extensiones/origen'

/*
  Motor de sustitución de una plantilla en blanco (documento TipTap en flujo)
  para F5 — equivalente en espíritu a `prepararComandos.ts` (que hace lo
  mismo sobre el XML crudo de un `.docx`), pero operando directo sobre el
  árbol `JSONContent` ya en memoria, sin pasar por ninguna sintaxis de
  plantilla intermedia: no hay un motor externo que interprete comandos, así
  que la sustitución es una única función pura que recorre y reconstruye el
  árbol.
*/

type FormatoDeMarcador = 'parrafo' | 'lista_vinetas' | 'lista_numerada'
type AttrsDeMarcador = AttrsDeOrigen & { readonly formato: FormatoDeMarcador }
type AttrsDeSeccion = AttrsDeOrigen & { readonly modo: 'condicional' | 'repetible' }

/** El valor de la iteración actual de una sección repetible, para que un marcador interno del mismo origen lo use tal cual (sin unir la lista completa). */
type ContextoDeIteracion = { readonly origen: OrigenDeMarcador; readonly valor: string }

function mismoOrigen(a: OrigenDeMarcador, b: OrigenDeMarcador): boolean {
  if (a.tipo === 'campo' && b.tipo === 'campo') return a.campo === b.campo
  if (a.tipo === 'personalizado' && b.tipo === 'personalizado') return a.etiqueta === b.etiqueta
  return false
}

function textoResuelto(valor: string | readonly string[]): string {
  return typeof valor === 'string' ? valor : valor.join(' · ')
}

function sustituirNodo(
  nodo: JSONContent,
  datosReales: RegistroDeDatosDeCampo,
  iteracion?: ContextoDeIteracion,
): readonly JSONContent[] {
  if (nodo.type === 'marcador') {
    const attrs = nodo.attrs as AttrsDeMarcador
    const origen = origenDesdeAttrs(attrs)

    const texto =
      iteracion !== undefined && mismoOrigen(origen, iteracion.origen)
        ? iteracion.valor
        : textoResuelto(resolverMarcador(origen, attrs.formato, datosReales))

    return [{ type: 'text', text: texto }]
  }

  if (nodo.type === 'seccionMarcador') {
    const attrs = nodo.attrs as AttrsDeSeccion
    const origen = origenDesdeAttrs(attrs)
    const contenidoInterno = nodo.content ?? []

    if (attrs.modo === 'condicional') {
      if (!resolverCondicionDeMarcador(origen, datosReales)) {
        return []
      }

      return contenidoInterno.flatMap((hijo) => sustituirNodo(hijo, datosReales, iteracion))
    }

    return resolverListaDeMarcador(origen, datosReales).flatMap((valor) =>
      contenidoInterno.flatMap((hijo) => sustituirNodo(hijo, datosReales, { origen, valor })),
    )
  }

  if (nodo.content !== undefined) {
    return [{ ...nodo, content: nodo.content.flatMap((hijo) => sustituirNodo(hijo, datosReales, iteracion)) }]
  }

  return [nodo]
}

/** Sustituye los nodos `marcador`/`seccionMarcador` de una plantilla en blanco por los datos reales de una conferencia, para su vista previa (F5). No muta `contenido`. */
export function sustituirContenidoDePlantilla(
  contenido: JSONContent,
  datosReales: RegistroDeDatosDeCampo,
): JSONContent {
  return sustituirNodo(contenido, datosReales)[0] ?? contenido
}
