import type { FichaDelCatalogo } from '@/features/conferencias/query'
import type { Tema } from '@/features/taxonomia'
import { hayBackend, pedirAlBackend } from '@/shared/api/backend'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import { extraerCantidadSolicitada } from './cantidad'
import type { AlcanceDeConsulta, MensajeNuevo, PasoDeRazonamiento } from './data/tipos'
import { evaluarPregunta } from './generarRespuesta'
import type { ResultadoDeEvaluacion } from './generarRespuesta'

/*
  FRONTERA DE GENERACIÓN — el único punto por donde el dominio del chat pide
  una respuesta.

  Quién construye qué: la persistencia del chat (B7) es de este módulo; la
  generación real —el agente conversacional que recupera fichas de verdad y
  cita sus ids— la construye el backend de Python. Las dos cosas se estaban
  cruzando en `useChat`, que llamaba directo a la simulación de
  `generarRespuesta.ts`. Ahí está el problema que este archivo resuelve: con la
  llamada incrustada en el hook, conectar el backend obligaba a reescribir el
  hook, y la simulación quedaba enredada con el estado de React.

  Por eso el contrato es esta pareja de tipos y no una función concreta:

    (peticion) => Promise<ResultadoDeConsulta<ResultadoDeEvaluacion>>

  Tres decisiones que esa firma toma a propósito, y que son las que hacen que
  conectar el backend después sea cambiar una implementación:

  1. Es asíncrona aunque hoy la simulación responda en el acto. Una firma
     síncrona se habría filtrado a todo lo que la llama —el hook, el estado de
     "respondiendo", la interfaz— y volverla asíncrona más tarde habría sido el
     cambio caro que aquí se evita.

  2. Devuelve `ResultadoDeConsulta`, el mismo tipo que los repositorios de la
     serie B. Así un backend caído entra al dominio como un código del catálogo
     de errores —con nombre propio y mensaje accionable— y no como una excepción
     suelta que la burbuja tendría que interpretar.

  3. Recibe la pregunta, el alcance y el id de la conversación; NO recibe el
     catálogo de fichas. El backend no lo necesita —lee las fichas de Postgres
     por su cuenta, que es lo que le permite citar ids reales—, así que se lo
     pasa como dependencia de construcción solo la implementación que sí lo
     necesita: la simulada, que corre en el navegador sobre lo que la persona
     puede ver. El id de conversación viaja porque el agente real leerá el hilo
     del lado del servidor para tener contexto; la simulación lo ignora.

  Lo que el backend tendrá que devolver es exactamente `ResultadoDeEvaluacion`:
  o una respuesta con `contenido`, `idsFichasCitadas` y `pasosDeRazonamiento`, o
  una aclaración con `pregunta` y `opciones`. Esa unión ya es la que viaja a la
  tabla (ver `mapeo.ts`), así que el punto de integración no toca el esquema.
*/

export type PeticionDeGeneracion = {
  readonly idConversacion: string
  readonly pregunta: string
  readonly alcance: AlcanceDeConsulta
}

export type GeneradorDeRespuesta = (
  peticion: PeticionDeGeneracion,
) => Promise<ResultadoDeConsulta<ResultadoDeEvaluacion>>

/** Lo que la implementación simulada necesita y la real no: el catálogo visible en el navegador. */
export type CatalogoParaGenerar = {
  readonly entradas: readonly FichaDelCatalogo[]
  readonly temas: readonly Tema[]
}

/*
  La simulación de F7, ahora detrás de la frontera. Sigue siendo recuperación
  real sobre el catálogo (los mismos filtros de F6) con la redacción simulada:
  lo que cita, lo cita de verdad. `extraerCantidadSolicitada` se aplica aquí
  dentro y no en el hook porque "cuántas fichas pidió la persona" es una
  decisión de quien genera; el agente real la tomará por su cuenta y el dominio
  no tiene por qué enterarse.
*/
export function generadorSimulado(catalogo: CatalogoParaGenerar): GeneradorDeRespuesta {
  return (peticion) =>
    Promise.resolve({
      ok: true,
      datos: evaluarPregunta(
        peticion.pregunta,
        peticion.alcance,
        catalogo.entradas,
        catalogo.temas,
        extraerCantidadSolicitada(peticion.pregunta),
      ),
    })
}

/*
  Forma cruda de lo que devuelve `POST /chat/preguntar` (ver
  `backend/bitacora/api/chat.py`). Se mapea aquí, en el borde, a
  `ResultadoDeEvaluacion` — el tipo que ya viaja a la tabla.
*/
type RespuestaCrudaDelBackend = {
  readonly contenido?: unknown
  readonly ids_fichas_citadas?: unknown
  readonly pasos_de_razonamiento?: unknown
}

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

function listaDeCadenas(valor: unknown): readonly string[] {
  return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : []
}

function pasosDe(valor: unknown): readonly PasoDeRazonamiento[] {
  const crudos = Array.isArray(valor) ? valor : []

  return crudos.map((crudo): PasoDeRazonamiento => {
    const paso = (crudo ?? {}) as Record<string, unknown>
    const descartadas = Array.isArray(paso['descartadas']) ? paso['descartadas'] : []

    return {
      descripcion: textoDe(paso['descripcion']),
      descartadas: descartadas.map((d) => {
        const item = (d ?? {}) as Record<string, unknown>
        return {
          idFicha: textoDe(item['id_ficha'] ?? item['idFicha'] ?? item['id']),
          motivo: textoDe(item['motivo']),
        }
      }),
      totalDescartadas:
        typeof paso['total_descartadas'] === 'number' ? paso['total_descartadas'] : descartadas.length,
    }
  }) as never
}

/*
  El generador real. El backend recupera las fichas de Postgres por su cuenta
  —por eso no recibe el catálogo— y cita ids reales. Solo devuelve respuestas,
  nunca aclaraciones: si algún día lo hace, `mensajeNuevoDeEvaluacion` ya
  cubre ese caso y este mapeo tendría que distinguir el `tipo`.
*/
export function generadorConBackend(): GeneradorDeRespuesta {
  return async (peticion) => {
    const respuesta = await pedirAlBackend<RespuestaCrudaDelBackend>('/chat/preguntar', {
      pregunta: peticion.pregunta,
      id_conversacion: peticion.idConversacion === '' ? null : peticion.idConversacion,
    })

    if (!respuesta.ok) {
      return respuesta
    }

    return {
      ok: true,
      datos: {
        tipo: 'respuesta',
        contenido: textoDe(respuesta.datos.contenido),
        idsFichasCitadas: listaDeCadenas(respuesta.datos.ids_fichas_citadas),
        pasosDeRazonamiento: pasosDe(respuesta.datos.pasos_de_razonamiento),
      },
    }
  }
}

/*
  El interruptor. La única decisión: si `VITE_API_URL` está configurada, el
  agente real; si no, la simulación sobre lo que la persona ve en el navegador.
  Ni `useChat` ni el repositorio ni las burbujas se enteran, porque ninguno
  conoce otra cosa que `GeneradorDeRespuesta`.
*/
export function construirGenerador(catalogo: CatalogoParaGenerar): GeneradorDeRespuesta {
  return hayBackend() ? generadorConBackend() : generadorSimulado(catalogo)
}

/*
  De lo que devuelve el generador a lo que se guarda en la tabla. Es pura y
  vive aquí, junto al contrato, para que el día que el backend agregue un
  tercer desenlace el compilador señale este archivo —el borde— y no una rama
  perdida dentro del hook.
*/
export function mensajeNuevoDeEvaluacion(resultado: ResultadoDeEvaluacion): MensajeNuevo {
  if (resultado.tipo === 'respuesta') {
    return {
      rol: 'asistente',
      tipo: 'respuesta',
      contenido: resultado.contenido,
      idsFichasCitadas: resultado.idsFichasCitadas,
      pasosDeRazonamiento: resultado.pasosDeRazonamiento,
    }
  }

  return {
    rol: 'asistente',
    tipo: 'aclaracion',
    pregunta: resultado.pregunta,
    opciones: resultado.opciones,
  }
}
