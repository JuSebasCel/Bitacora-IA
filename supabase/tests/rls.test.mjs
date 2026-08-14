// Suite de integración contra el proyecto REAL de Supabase (B1). A propósito
// no usa Vitest ni vive dentro de `frontend/src`: es la única parte de la
// suite del proyecto con dependencia de red real, y se corre aparte
// (`npm test` desde esta carpeta), nunca como parte de `npx vitest run`.
//
// Verifica lo que ninguna prueba unitaria mockeada puede verificar de verdad:
// que las políticas de RLS realmente aíslan los datos en Postgres, no solo
// que el código las invoca con los argumentos correctos.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'

const AQUI = dirname(fileURLToPath(import.meta.url))

function leerEnvDelFrontend() {
  const ruta = join(AQUI, '..', '..', 'frontend', '.env.local')
  const contenido = readFileSync(ruta, 'utf8')
  const variables = {}

  for (const linea of contenido.split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue

    const separador = limpia.indexOf('=')
    if (separador === -1) continue

    variables[limpia.slice(0, separador).trim()] = limpia.slice(separador + 1).trim()
  }

  return variables
}

const env = leerEnvDelFrontend()
const URL = env.VITE_SUPABASE_URL
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY

if (!URL || !ANON_KEY) {
  throw new Error(
    'Falta VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY en frontend/.env.local -- no se puede correr esta suite sin apuntar a un proyecto real.',
  )
}

function correoDePrueba(etiqueta) {
  return `rls-test.${etiqueta}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@gmail.com`
}

async function clienteAutenticadoNuevo(etiqueta) {
  const cliente = createClient(URL, ANON_KEY)
  const correo = correoDePrueba(etiqueta)
  const contrasena = 'Prueba-RLS-2026!'

  const { data, error } = await cliente.auth.signUp({ email: correo, password: contrasena })
  assert.equal(error, null, `signUp de la cuenta de prueba (${etiqueta}) no debería fallar: ${error?.message}`)
  assert.ok(data.user, `signUp debería devolver un usuario para ${etiqueta}`)
  assert.ok(data.session, `con confirmaciones desactivadas, signUp debería devolver sesión ya para ${etiqueta}`)

  return { cliente, id: data.user.id, correo }
}

const clienteAnonimo = createClient(URL, ANON_KEY)

test('un cliente anónimo (sin sesión) no ve filas de una tabla compartida', async () => {
  const { data, error } = await clienteAnonimo.from('eventos').select('id').limit(1)

  assert.equal(error, null, 'RLS bloquea con una lista vacía, no con un error')
  assert.deepEqual(data, [])
})

test('cualquier autenticado puede crear y leer filas en una tabla compartida (eventos)', async () => {
  const { cliente } = await clienteAutenticadoNuevo('compartido')

  const nombre = `Evento de prueba RLS ${Date.now()}`
  const { data: creado, error: errorCrear } = await cliente
    .from('eventos')
    .insert({ nombre })
    .select('id, nombre')
    .single()

  assert.equal(errorCrear, null, `insertar en eventos no debería fallar: ${errorCrear?.message}`)
  assert.equal(creado.nombre, nombre)

  // Limpieza: la misma política "cualquier autenticado" también permite borrar.
  const { error: errorBorrar } = await cliente.from('eventos').delete().eq('id', creado.id)
  assert.equal(errorBorrar, null)
})

test('una conferencia propia es invisible para otra persona hasta que se comparte, y visible después', async () => {
  const { cliente: dueno, id: idDueno } = await clienteAutenticadoNuevo('dueno')
  const { cliente: invitado, id: idInvitado } = await clienteAutenticadoNuevo('invitado')

  const { data: conferencia, error: errorCrear } = await dueno
    .from('conferencias')
    .insert({
      titulo: 'Conferencia de prueba RLS',
      ponente: 'Ponente de prueba',
      evento: 'Evento de prueba',
      codigo_de_evento: 'RLST-2026-01',
      fecha_del_evento: '2026-01-01',
      id_dueno: idDueno,
      estado: 'procesada',
      resumen: '',
      fuente: 'transcripcion',
    })
    .select('id')
    .single()

  assert.equal(errorCrear, null, `el dueño debería poder crear su propia conferencia: ${errorCrear?.message}`)

  // Antes de compartir: el invitado no la ve (lista vacía, no un error).
  const { data: antesDeCompartir, error: errorAntes } = await invitado
    .from('conferencias')
    .select('id')
    .eq('id', conferencia.id)

  assert.equal(errorAntes, null)
  assert.deepEqual(antesDeCompartir, [], 'sin comparticion, el invitado no debería ver la conferencia ajena')

  // El invitado tampoco puede fabricar su propia fila de compartición suplantando al dueño.
  const { error: errorSuplantacion } = await invitado.from('comparticiones').insert({
    id_conferencia: conferencia.id,
    id_dueno: idDueno,
    id_invitado: idInvitado,
    privacidad: { compartirEtiquetas: false, compartirFichasPendientes: false, permitirValidarFichas: false, permitirRecompartir: false },
  })

  assert.notEqual(errorSuplantacion, null, 'RLS debería rechazar que alguien cree una compartición en nombre de otro dueño')

  // El dueño sí puede compartirla.
  const { error: errorCompartir } = await dueno.from('comparticiones').insert({
    id_conferencia: conferencia.id,
    id_dueno: idDueno,
    id_invitado: idInvitado,
    privacidad: { compartirEtiquetas: false, compartirFichasPendientes: false, permitirValidarFichas: false, permitirRecompartir: false },
  })

  assert.equal(errorCompartir, null, `el dueño debería poder compartir su conferencia: ${errorCompartir?.message}`)

  // Después de compartir: el invitado ya la ve.
  const { data: despuesDeCompartir, error: errorDespues } = await invitado
    .from('conferencias')
    .select('id')
    .eq('id', conferencia.id)

  assert.equal(errorDespues, null)
  assert.equal(despuesDeCompartir.length, 1, 'con una comparticion real, el invitado ya debería ver la conferencia')

  // Limpieza (el dueño borra en cascada: comparticiones referencia a conferencias con ON DELETE CASCADE).
  const { error: errorLimpieza } = await dueno.from('conferencias').delete().eq('id', conferencia.id)
  assert.equal(errorLimpieza, null)
})

test('el espacio personal (etiquetas) es privado por defecto entre dos cuentas', async () => {
  const { cliente: propietario, id: idPropietario } = await clienteAutenticadoNuevo('propietario-etiqueta')
  const { cliente: otraPersona } = await clienteAutenticadoNuevo('otra-persona')

  const { data: etiqueta, error: errorCrear } = await propietario
    .from('etiquetas')
    .insert({ nombre: 'etiqueta-privada-rls', id_propietario: idPropietario })
    .select('id')
    .single()

  assert.equal(errorCrear, null, `crear una etiqueta propia no debería fallar: ${errorCrear?.message}`)

  const { data: vistaPorOtro, error: errorLectura } = await otraPersona
    .from('etiquetas')
    .select('id')
    .eq('id', etiqueta.id)

  assert.equal(errorLectura, null)
  assert.deepEqual(vistaPorOtro, [], 'una etiqueta ajena nunca debería ser visible, ni compartiendo la conferencia')

  const { error: errorLimpieza } = await propietario.from('etiquetas').delete().eq('id', etiqueta.id)
  assert.equal(errorLimpieza, null)
})
