import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/shared/supabase/cliente'
import { resultadoDe, resultadoDeLista } from '@/shared/supabase/consultas'
import type { ResultadoDeConsulta } from '@/shared/supabase/consultas'
import type { AlcanceDeConsulta, Conversacion, Mensaje, MensajeNuevo } from './data/tipos'
import {
  COLUMNAS_DE_CONVERSACION,
  COLUMNAS_DE_MENSAJE,
  conversacionDeFila,
  filaDeMensajeNuevo,
  mensajeDeFila,
  ordenarPorActividad,
} from './mapeo'
import type { FilaDeConversacion, FilaDeMensaje } from './mapeo'

/*
  B7: el chat deja de vivir en `sessionStorage` y pasa a `conversaciones_chat`
  y `mensajes_chat`, privadas por política de acceso por fila.

  Es el único archivo del dominio que sabe que existe Supabase. `useChat` y las
  pantallas dependen de estas funciones y nunca de `supabase.from(...)`: así
  las pruebas de la interfaz sustituyen este módulo entero en vez de aprender a
  encadenar filtros de PostgREST, y el día que una tabla cambie de nombre
  cambia un archivo, no un dominio.

  El filtro por dueño en las lecturas se escribe aunque la política de la tabla
  ya lo garantice: es lo que aprovecha el índice
  `conversaciones_chat_id_usuario_idx` y deja explícito de quién es el listado.
  El filtro es una optimización y una declaración de intención; la garantía es
  la política.
*/

const TABLA_CONVERSACIONES = 'conversaciones_chat'
const TABLA_MENSAJES = 'mensajes_chat'

/*
  El cliente se crea sin los tipos generados del esquema, así que PostgREST
  devuelve las filas sin forma. Estos dos alias concentran en un punto la
  promesa de que la fila tiene la forma que declara `mapeo.ts` —promesa que la
  lista de columnas de la consulta sostiene— en vez de repartir un `as` por
  cada función.
*/
type RespuestaDeFila<T> = { data: T | null; error: PostgrestError | null }
type RespuestaDeFilas<T> = { data: T[] | null; error: PostgrestError | null }

export async function listarConversaciones(
  idUsuario: string,
): Promise<ResultadoDeConsulta<readonly Conversacion[]>> {
  const respuesta: RespuestaDeFilas<FilaDeConversacion> = await supabase
    .from(TABLA_CONVERSACIONES)
    .select(COLUMNAS_DE_CONVERSACION)
    .eq('id_usuario', idUsuario)
    .order('actualizada_el', { ascending: false })

  const filas = resultadoDeLista(respuesta)

  if (!filas.ok) {
    return filas
  }

  /*
    Se reordena en el cliente aunque la consulta ya venga ordenada: al agregar
    un mensaje la lista local se reordena sin volver a consultar, y tener una
    sola función que decide el orden evita que la lista recién cargada y la
    lista después de escribir queden ordenadas por criterios distintos.
  */
  return { ok: true, datos: ordenarPorActividad(filas.datos.map(conversacionDeFila)) }
}

export async function crearConversacion(
  idUsuario: string,
  titulo: string,
  alcance: AlcanceDeConsulta,
): Promise<ResultadoDeConsulta<Conversacion>> {
  const respuesta: RespuestaDeFila<FilaDeConversacion> = await supabase
    .from(TABLA_CONVERSACIONES)
    .insert({ id_usuario: idUsuario, titulo, alcance })
    .select(COLUMNAS_DE_CONVERSACION)
    .single()

  return conversacionDeRespuesta(respuesta)
}

export async function renombrarConversacion(
  idConversacion: string,
  titulo: string,
): Promise<ResultadoDeConsulta<Conversacion>> {
  const respuesta: RespuestaDeFila<FilaDeConversacion> = await supabase
    .from(TABLA_CONVERSACIONES)
    .update({ titulo })
    .eq('id', idConversacion)
    .select(COLUMNAS_DE_CONVERSACION)
    .single()

  return conversacionDeRespuesta(respuesta)
}

export async function cambiarAlcanceDeConversacion(
  idConversacion: string,
  alcance: AlcanceDeConsulta,
): Promise<ResultadoDeConsulta<Conversacion>> {
  const respuesta: RespuestaDeFila<FilaDeConversacion> = await supabase
    .from(TABLA_CONVERSACIONES)
    .update({ alcance })
    .eq('id', idConversacion)
    .select(COLUMNAS_DE_CONVERSACION)
    .single()

  return conversacionDeRespuesta(respuesta)
}

/*
  No borra los mensajes: `mensajes_chat.id_conversacion` es una llave foránea
  con `on delete cascade`, así que Postgres los arrastra en la misma
  transacción. Borrarlos primero desde el cliente abriría una ventana en la que
  un fallo de red deja los mensajes muertos y la conversación viva.
*/
export async function eliminarConversacion(idConversacion: string): Promise<ResultadoDeConsulta<null>> {
  const respuesta: RespuestaDeFila<null> = await supabase
    .from(TABLA_CONVERSACIONES)
    .delete()
    .eq('id', idConversacion)

  return resultadoDeBorrado(respuesta)
}

export async function listarMensajes(
  idConversacion: string,
): Promise<ResultadoDeConsulta<readonly Mensaje[]>> {
  const respuesta: RespuestaDeFilas<FilaDeMensaje> = await supabase
    .from(TABLA_MENSAJES)
    .select(COLUMNAS_DE_MENSAJE)
    .eq('id_conversacion', idConversacion)
    .order('creado_el', { ascending: true })

  const filas = resultadoDeLista(respuesta)

  if (!filas.ok) {
    return filas
  }

  /*
    `flatMap` y no `map`: `mensajeDeFila` devuelve `null` ante una fila que no
    encaja en ningún miembro de la unión, y una burbuja vacía a mitad del hilo
    es peor que un hilo que sigue leyéndose.
  */
  return {
    ok: true,
    datos: filas.datos.flatMap((fila) => {
      const mensaje = mensajeDeFila(fila)
      return mensaje === null ? [] : [mensaje]
    }),
  }
}

/*
  Devuelve el mensaje ya guardado, no el que se mandó: `id` y `creado_el` los
  pone Postgres, y el hilo se ordena por `creado_el`. Inventarlos en el cliente
  haría que dos pestañas con relojes distintos ordenaran distinto el mismo
  hilo, y que el id con el que la interfaz sigue la generación no fuera el id
  con el que la fila quedó guardada.
*/
export async function agregarMensaje(
  idConversacion: string,
  nuevo: MensajeNuevo,
): Promise<ResultadoDeConsulta<Mensaje>> {
  const respuesta: RespuestaDeFila<FilaDeMensaje> = await supabase
    .from(TABLA_MENSAJES)
    .insert(filaDeMensajeNuevo(idConversacion, nuevo))
    .select(COLUMNAS_DE_MENSAJE)
    .single()

  return mensajeDeRespuesta(respuesta)
}

/*
  Reescribe solo `contenido`, y solo sobre mensajes que ya tienen esa columna
  llena: la pregunta que se edita y se reenvía, y la respuesta que se corta a
  mitad de generación. Como el rol y el tipo no se tocan, la fila no puede
  cambiar de miembro de la unión ni romper el `check`.
*/
export async function reemplazarContenidoDeMensaje(
  idMensaje: string,
  contenido: string,
): Promise<ResultadoDeConsulta<Mensaje>> {
  const respuesta: RespuestaDeFila<FilaDeMensaje> = await supabase
    .from(TABLA_MENSAJES)
    .update({ contenido })
    .eq('id', idMensaje)
    .select(COLUMNAS_DE_MENSAJE)
    .single()

  return mensajeDeRespuesta(respuesta)
}

/*
  Borra lo que vino DESPUÉS de un mensaje dentro de un hilo. Es lo que hace
  posible editar una pregunta ya enviada: la conversación no puede quedar con
  dos respuestas a la misma pregunta, y las que sobrevivirían serían respuestas
  a un texto que ya nadie escribió.

  El corte va por `creado_el` y no por posición: la posición es una propiedad
  del arreglo que la interfaz tiene cargado en ese instante, y la marca de
  tiempo es del dato.
*/
export async function eliminarMensajesPosterioresA(
  idConversacion: string,
  creadoEl: string,
): Promise<ResultadoDeConsulta<null>> {
  const respuesta: RespuestaDeFila<null> = await supabase
    .from(TABLA_MENSAJES)
    .delete()
    .eq('id_conversacion', idConversacion)
    .gt('creado_el', creadoEl)

  return resultadoDeBorrado(respuesta)
}

/*
  Una escritura sin fila de vuelta (un `delete`) resuelve con `data` en `null`
  y sin error. Pasa igual por `resultadoDe`, con `siVacio` diciendo que ahí
  "vacío" es el éxito esperado, en vez de abrir un segundo camino de traducción
  de errores paralelo al compartido.
*/
function resultadoDeBorrado(respuesta: RespuestaDeFila<null>): ResultadoDeConsulta<null> {
  return resultadoDe<null>(respuesta, () => ({ ok: true, datos: null }))
}

/*
  `single()` sobre una escritura que no afectó ninguna fila responde con error,
  no con `data` en `null`; `siVacio` cubre el caso restante traduciéndolo al
  mismo "no está" que ve la interfaz cuando la política de acceso esconde la
  fila, en vez de dejar pasar un `null` disfrazado de conversación.
*/
function conversacionDeRespuesta(
  respuesta: RespuestaDeFila<FilaDeConversacion>,
): ResultadoDeConsulta<Conversacion> {
  const fila = resultadoDe(respuesta, () => ({ ok: false, codigo: 'CHAT_CONVERSACION_NO_ENCONTRADA' }) as const)

  return fila.ok ? { ok: true, datos: conversacionDeFila(fila.datos) } : fila
}

function mensajeDeRespuesta(respuesta: RespuestaDeFila<FilaDeMensaje>): ResultadoDeConsulta<Mensaje> {
  const fila = resultadoDe(respuesta, () => ({ ok: false, codigo: 'CHAT_MENSAJE_NO_ENCONTRADO' }) as const)

  if (!fila.ok) {
    return fila
  }

  const mensaje = mensajeDeFila(fila.datos)

  /*
    La fila se guardó pero no se deja leer como mensaje del dominio: eso solo
    pasa si el `check` de la tabla y la unión de `data/tipos.ts` dejaron de
    decir lo mismo. Es un fallo de esquema, no del usuario, así que se reporta
    con el código genérico de datos y no con un "no encontrado" que mentiría.
  */
  return mensaje === null ? { ok: false, codigo: 'DATOS_FALLO_INESPERADO' } : { ok: true, datos: mensaje }
}
