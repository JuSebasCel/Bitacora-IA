import { escribirJson, leerJson } from '@/shared/storage/almacenamiento'
import { ESPACIO_DE_CHAT_VACIO } from './data/tipos'
import type { AlcanceDeConsulta, Conversacion, EspacioDeChat, Mensaje, OpcionDeAclaracion, PasoDeRazonamiento } from './data/tipos'

/*
  Persistencia de conversaciones y mensajes, por usuario. Mismo patrón exacto
  que `conferencias/tags/almacenamiento.ts`: sin fixture semilla (una
  conversación nace de una sesión real de uso, no hay ninguna de ejemplo que
  tenga sentido inventar), un espacio por usuario para que sea imposible leer
  las conversaciones de otro por olvidar un filtro, y todo lo que no pasa los
  guards se descarta en silencio.
*/

export const CLAVE_CHAT = 'bitacora-ai.chat'

function esCadenaUtil(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim().length > 0
}

function esAlcance(valor: unknown): valor is AlcanceDeConsulta {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  if (candidato['tipo'] === 'todas') {
    return true
  }

  if (candidato['tipo'] === 'seleccion') {
    return Array.isArray(candidato['idsConferencias']) && candidato['idsConferencias'].every((id) => typeof id === 'string')
  }

  if (candidato['tipo'] === 'filtro') {
    return (
      (candidato['idTema'] === null || typeof candidato['idTema'] === 'string') &&
      typeof candidato['palabraClave'] === 'string'
    )
  }

  return false
}

function esConversacion(valor: unknown): valor is Conversacion {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    esCadenaUtil(candidato['id']) &&
    esCadenaUtil(candidato['idUsuario']) &&
    typeof candidato['titulo'] === 'string' &&
    esAlcance(candidato['alcance']) &&
    esCadenaUtil(candidato['creadaEl']) &&
    esCadenaUtil(candidato['actualizadaEl'])
  )
}

function esPasoDeRazonamiento(valor: unknown): valor is PasoDeRazonamiento {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return (
    typeof candidato['descripcion'] === 'string' &&
    Array.isArray(candidato['descartadas']) &&
    typeof candidato['totalDescartadas'] === 'number'
  )
}

function esOpcionDeAclaracion(valor: unknown): valor is OpcionDeAclaracion {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  return typeof candidato['etiqueta'] === 'string' && esAlcance(candidato['alcance'])
}

function esMensaje(valor: unknown): valor is Mensaje {
  if (typeof valor !== 'object' || valor === null) {
    return false
  }

  const candidato = valor as Record<string, unknown>

  if (!esCadenaUtil(candidato['id']) || !esCadenaUtil(candidato['idConversacion']) || !esCadenaUtil(candidato['creadoEl'])) {
    return false
  }

  if (candidato['rol'] === 'usuario') {
    return typeof candidato['contenido'] === 'string'
  }

  if (candidato['rol'] !== 'asistente') {
    return false
  }

  if (candidato['tipo'] === 'respuesta') {
    return (
      typeof candidato['contenido'] === 'string' &&
      Array.isArray(candidato['idsFichasCitadas']) &&
      Array.isArray(candidato['pasosDeRazonamiento']) &&
      candidato['pasosDeRazonamiento'].every(esPasoDeRazonamiento)
    )
  }

  if (candidato['tipo'] === 'aclaracion') {
    return (
      typeof candidato['pregunta'] === 'string' &&
      Array.isArray(candidato['opciones']) &&
      candidato['opciones'].every(esOpcionDeAclaracion)
    )
  }

  return false
}

function normalizarEspacio(valor: unknown): EspacioDeChat | null {
  if (typeof valor !== 'object' || valor === null) {
    return null
  }

  const candidato = valor as Record<string, unknown>
  const conversaciones = candidato['conversaciones']
  const mensajes = candidato['mensajes']

  if (!Array.isArray(conversaciones) || !Array.isArray(mensajes)) {
    return null
  }

  const conversacionesValidas = conversaciones.filter(esConversacion)
  const idsValidos = new Set(conversacionesValidas.map((conversacion) => conversacion.id))

  return {
    conversaciones: conversacionesValidas,
    /* Un mensaje que apunta a una conversación descartada no tiene sentido. */
    mensajes: mensajes.filter(esMensaje).filter((mensaje) => idsValidos.has(mensaje.idConversacion)),
  }
}

export function leerEspaciosGuardados(): Readonly<Record<string, EspacioDeChat>> {
  const valor = leerJson(CLAVE_CHAT)

  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {}
  }

  const espacios: Record<string, EspacioDeChat> = {}

  for (const [idUsuario, crudo] of Object.entries(valor as Record<string, unknown>)) {
    const espacio = normalizarEspacio(crudo)

    if (espacio !== null) {
      espacios[idUsuario] = espacio
    }
  }

  return espacios
}

export function espacioDeChatDe(idUsuario: string): EspacioDeChat {
  return leerEspaciosGuardados()[idUsuario] ?? ESPACIO_DE_CHAT_VACIO
}

export function guardarEspacioDeChat(idUsuario: string, espacio: EspacioDeChat): void {
  escribirJson(CLAVE_CHAT, { ...leerEspaciosGuardados(), [idUsuario]: espacio })
}
