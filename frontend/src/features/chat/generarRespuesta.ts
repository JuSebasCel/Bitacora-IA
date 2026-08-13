import { buscarEnCatalogo, eventosDisponibles, filtrarPorTema, temasDisponibles } from '@/features/catalogo/filtros'
import type { FichaDelCatalogo } from '@/features/conferencias/query'
import { normalizarTexto } from '@/features/conferencias/query'
import { nombreDeTema } from '@/features/taxonomia'
import type { Tema } from '@/features/taxonomia'
import { limiteDe } from './cantidad'
import type { CantidadSolicitada } from './cantidad'
import type { AlcanceDeConsulta, OpcionDeAclaracion, PasoDeRazonamiento } from './data/tipos'

/*
  `buscarEnCatalogo` exige que TODA palabra de la búsqueda aparezca (a
  propósito, para no ahogar el filtro exacto de F6 en falsos positivos) —
  pero una pregunta de chat no es una lista de palabras clave, es lenguaje
  natural: "háblame de sesgos algorítmicos" nunca encontraría nada, porque
  ninguna ficha dice "háblame" ni "de". Se quitan las muletillas más
  comunes antes de buscar, para que la palabra que sí importa llegue sola.

  No es comprensión real del lenguaje, es una lista fija — mismo criterio
  honesto que `cantidad.ts`.
*/
const MULETILLAS = new Set([
  'habla',
  'hablame',
  'hablar',
  'cuentame',
  'cuenta',
  'dime',
  'dame',
  'busca',
  'buscame',
  'quiero',
  'necesito',
  'me',
  'gustaria',
  'saber',
  'sobre',
  'acerca',
  'de',
  'del',
  'la',
  'las',
  'el',
  'los',
  'un',
  'una',
  'que',
  'algo',
  'informacion',
  'fichas',
  'ficha',
  'y',
  'o',
  'con',
  'para',
  'por',
  'en',
])

function preguntaParaBuscar(pregunta: string): string {
  const palabras = normalizarTexto(pregunta)
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0 && !MULETILLAS.has(palabra))

  /* Si quitar muletillas deja la pregunta vacía (era pura cortesía, sin tema), se busca con el texto original. */
  return palabras.length > 0 ? palabras.join(' ') : pregunta
}

/*
  El "cerebro" del chat: sin OpenAI real, pero con recuperación real. Reutiliza
  exactamente los mismos filtros del catálogo de F6 (`buscarEnCatalogo`,
  `filtrarPorTema`) en vez de inventar una búsqueda paralela — así lo que el
  chat encuentra es lo mismo que encontraría el catálogo con los mismos
  criterios, y lo que reporta haber descartado es lo que un filtro de verdad
  descartó, no una narración inventada de "pensamiento".
*/

export type ResultadoDeEvaluacion =
  | {
      readonly tipo: 'respuesta'
      readonly contenido: string
      readonly idsFichasCitadas: readonly string[]
      readonly pasosDeRazonamiento: readonly PasoDeRazonamiento[]
    }
  | {
      readonly tipo: 'aclaracion'
      readonly pregunta: string
      readonly opciones: readonly OpcionDeAclaracion[]
    }

/** Listar más de esto en un paso satura el mensaje sin agregar nada útil: el total ya cuenta la historia. */
const MAX_DESCARTADAS_POR_PASO = 5
/** Cuántas opciones de aclaración ofrecer como máximo, para que el menú siga siendo elegible de un vistazo. */
const MAX_OPCIONES_DE_ACLARACION = 5

function pasoDe(
  descripcion: string,
  antes: readonly FichaDelCatalogo[],
  despues: readonly FichaDelCatalogo[],
  motivo: string,
): PasoDeRazonamiento {
  const idsQueQuedan = new Set(despues.map((entrada) => entrada.ficha.id))
  const descartadas = antes.filter((entrada) => !idsQueQuedan.has(entrada.ficha.id))

  return {
    descripcion,
    descartadas: descartadas.slice(0, MAX_DESCARTADAS_POR_PASO).map((entrada) => ({ idFicha: entrada.ficha.id, motivo })),
    totalDescartadas: descartadas.length,
  }
}

function aplicarAlcance(
  entradas: readonly FichaDelCatalogo[],
  alcance: AlcanceDeConsulta,
): { readonly resultado: readonly FichaDelCatalogo[]; readonly paso: PasoDeRazonamiento } {
  if (alcance.tipo === 'todas') {
    return {
      resultado: entradas,
      paso: { descripcion: 'Alcance: todas las conferencias visibles para ti', descartadas: [], totalDescartadas: 0 },
    }
  }

  if (alcance.tipo === 'seleccion') {
    const idsElegidos = new Set(alcance.idsConferencias)
    const resultado = entradas.filter((entrada) => idsElegidos.has(entrada.conferencia.id))

    return { resultado, paso: pasoDe('Alcance: conferencias que elegiste', entradas, resultado, 'no está entre las conferencias elegidas') }
  }

  const resultado = filtrarPorTema(entradas, alcance.idTema)

  return { resultado, paso: pasoDe('Alcance: tema elegido', entradas, resultado, 'no pertenece al tema elegido') }
}

/*
  El texto que se revela letra por letra dice qué se encontró, no repite
  cada cita completa: las tarjetas de fichas ya muestran el fragmento real
  debajo, una vez termina la generación. Meter el texto de las citas aquí
  duplicaba la información y alargaba el revelado varios segundos de más por
  cada ficha citada, sin agregar nada que la tarjeta no dijera mejor.
*/
function componerRespuesta(
  encontradas: readonly FichaDelCatalogo[],
  citadas: readonly FichaDelCatalogo[],
  pregunta: string,
  temas: readonly Tema[],
): string {
  if (citadas.length === 0) {
    return `No encontré ninguna ficha sobre "${pregunta.trim()}" en ese alcance.`
  }

  const temasEncontrados = [...new Set(citadas.map((entrada) => nombreDeTema(temas, entrada.ficha.idTema)))]
  const resumenDeTemas = temasEncontrados.length > 2 ? `${temasEncontrados.slice(0, 2).join(', ')} y otros temas` : temasEncontrados.join(' y ')

  if (citadas.length === 1) {
    return `Encontré 1 ficha relacionada, sobre ${resumenDeTemas}.`
  }

  return encontradas.length > citadas.length
    ? `Encontré ${encontradas.length} fichas relacionadas, sobre ${resumenDeTemas}. Te muestro las ${citadas.length} más relevantes:`
    : `Encontré ${citadas.length} fichas relacionadas, sobre ${resumenDeTemas}:`
}

function opcionesDeAclaracion(
  entradas: readonly FichaDelCatalogo[],
  temas: readonly Tema[],
  pregunta: string,
): readonly OpcionDeAclaracion[] {
  const porTema: readonly OpcionDeAclaracion[] = temasDisponibles(entradas, temas).map((tema) => ({
    etiqueta: `Tema: ${tema.nombre}`,
    alcance: { tipo: 'filtro', idTema: tema.id, palabraClave: pregunta },
  }))

  const porEvento: readonly OpcionDeAclaracion[] = eventosDisponibles(entradas).map((evento) => ({
    etiqueta: `Evento: ${evento}`,
    alcance: { tipo: 'seleccion', idsConferencias: entradas.filter((e) => e.conferencia.evento === evento).map((e) => e.conferencia.id) },
  }))

  return [...porTema, ...porEvento].slice(0, MAX_OPCIONES_DE_ACLARACION)
}

export function evaluarPregunta(
  pregunta: string,
  alcance: AlcanceDeConsulta,
  entradas: readonly FichaDelCatalogo[],
  temas: readonly Tema[],
  cantidad: CantidadSolicitada,
): ResultadoDeEvaluacion {
  const { resultado: dentroDelAlcance, paso: pasoAlcance } = aplicarAlcance(entradas, alcance)
  const encontradas = buscarEnCatalogo(dentroDelAlcance, preguntaParaBuscar(pregunta), temas)
  const pasoBusqueda = pasoDe(
    `Buscando fichas que mencionen "${pregunta.trim()}"`,
    dentroDelAlcance,
    encontradas,
    `no menciona "${pregunta.trim()}"`,
  )

  /*
    Sin nada encontrado y sin ningún alcance ya elegido, no hay de dónde
    acotar más una respuesta vacía: se pregunta de vuelta en vez de devolver
    un "no encontré nada" mudo. Con un alcance ya puesto (selección o tema),
    la persona ya acotó por su cuenta y un "no encontré nada" es información
    real, no una pregunta vaga sin resolver.
  */
  if (encontradas.length === 0 && alcance.tipo === 'todas') {
    return {
      tipo: 'aclaracion',
      pregunta: `No encontré nada sobre "${pregunta.trim()}" en todo lo que puedes ver. ¿Acoto por alguno de estos?`,
      opciones: opcionesDeAclaracion(entradas, temas, pregunta),
    }
  }

  const limite = limiteDe(cantidad)
  const citadas = encontradas.slice(0, Number.isFinite(limite) ? limite : encontradas.length)

  return {
    tipo: 'respuesta',
    contenido: componerRespuesta(encontradas, citadas, pregunta, temas),
    idsFichasCitadas: citadas.map((entrada) => entrada.ficha.id),
    pasosDeRazonamiento: [pasoAlcance, pasoBusqueda],
  }
}
