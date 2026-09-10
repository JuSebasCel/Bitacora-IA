import { vi } from 'vitest'
import { supabase } from '@/shared/supabase/cliente'
import * as repositorio from '@/features/conferencias/repositorio'
import { CONFERENCIAS_DE_EJEMPLO, ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
import type { Conferencia, Ficha } from '@/features/conferencias/data'
import {
  PROPUESTAS_DE_EJEMPLO,
  TEMAS_ACTIVOS_DE_EJEMPLO,
  TEMAS_DE_EJEMPLO,
} from '@/features/taxonomia/data'
import { mockearTabla } from '@/test/supabaseDePrueba'

/*
  Siembra el repositorio de conferencias con datos de dominio, sin red.

  Las pantallas de conferencias, catálogo y memorias dejaron de leer los
  fixtures directamente: ahora piden a `listarConferencias`/`listarFichasDe`,
  que en producción hablan con Supabase. Sus pruebas de aceptación siguen
  describiendo el mismo comportamiento observable, así que en vez de
  reescribirlas se les inyecta aquí la misma data de ejemplo por la nueva
  puerta.

  Cada archivo que use esto declara `vi.mock('@/features/conferencias/repositorio')`
  en su nivel superior — Vitest exige que `vi.mock` sea estático por archivo.
*/

export function sembrarConferencias(
  conferencias: readonly Conferencia[] = CONFERENCIAS_DE_EJEMPLO,
  fichas: readonly Ficha[] = FICHAS_DE_EJEMPLO,
): void {
  vi.mocked(repositorio.listarConferencias).mockResolvedValue({ ok: true, datos: conferencias })
  vi.mocked(repositorio.listarFichasVisibles).mockResolvedValue({ ok: true, datos: fichas })

  vi.mocked(repositorio.listarFichasDe).mockImplementation(async (idConferencia: string) => ({
    ok: true,
    datos: fichas.filter((ficha) => ficha.idConferencia === idConferencia),
  }))

  vi.mocked(repositorio.obtenerConferencia).mockImplementation(async (idConferencia: string) => {
    const conferencia = conferencias.find((candidata) => candidata.id === idConferencia)
    return conferencia === undefined
      ? { ok: false, codigo: 'CONF_NO_ENCONTRADA' }
      : { ok: true, datos: conferencia }
  })

  vi.mocked(repositorio.actualizarEstadoDeValidacion).mockResolvedValue({ ok: true, datos: null })

  sembrarTaxonomia()
}

/*
  El pool de temas y las propuestas viven en tablas que la taxonomía consulta
  con `supabase.from(...)` directo (no un módulo mockeado), así que se siembran
  por el cliente simulado. Cualquier pantalla que resuelva el nombre de un tema
  —catálogo, chat, detalle— lo necesita.
*/
export function sembrarTaxonomia(): void {
  mockearTabla('temas', TEMAS_DE_EJEMPLO)
  mockearTabla(
    'temas_activos_evento',
    TEMAS_ACTIVOS_DE_EJEMPLO.map((activo: { idEvento: string; idTema: string }) => ({
      id_evento: activo.idEvento,
      id_tema: activo.idTema,
    })),
  )
  mockearTabla(
    'temas_propuestos',
    PROPUESTAS_DE_EJEMPLO.map((propuesta: {
      id: string
      nombre: string
      idEvento: string
      justificacion: string
      propuestoEl: string
    }) => ({
      id: propuesta.id,
      nombre: propuesta.nombre,
      id_evento: propuesta.idEvento,
      justificacion: propuesta.justificacion,
      propuesto_el: propuesta.propuestoEl,
    })),
  )
}

/** Ninguna conferencia visible: para los casos de listado vacío. */
export function sembrarSinConferencias(): void {
  sembrarConferencias([], [])
}

/** Todas las lecturas del repositorio fallan con el código dado. */
export function sembrarFalloDeConferencias(codigo = 'DATOS_SIN_CONEXION' as const): void {
  vi.mocked(repositorio.listarConferencias).mockResolvedValue({ ok: false, codigo })
  vi.mocked(repositorio.listarFichasVisibles).mockResolvedValue({ ok: false, codigo })
  vi.mocked(repositorio.listarFichasDe).mockResolvedValue({ ok: false, codigo })
  vi.mocked(repositorio.obtenerConferencia).mockResolvedValue({ ok: false, codigo })
}

/*
  Siembra las etiquetas personales de una cuenta (B10). Va aparte de
  `sembrarConferencias` porque necesita saber quién tiene la sesión, y eso
  solo se sabe después de `mockearSesionAutenticada` — se llama desde el
  `montar` de cada prueba, no desde el `beforeEach`.

  Reproduce lo que RLS deja ver: `etiquetas` y `etiquetas_asignaciones` traen
  solo lo propio de esa cuenta, y la función `mis_etiquetas_visibles` compone
  lo propio con lo del dueño de una conferencia compartida (aquí se computa
  desde el mapa completo del fixture, filtrado por `compartirEtiquetas`).
*/
export function sembrarEtiquetasDe(idUsuario: string): void {
  const espacioPropio = ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[idUsuario] ?? { etiquetas: [], asignaciones: [] }

  mockearTabla(
    'etiquetas',
    espacioPropio.etiquetas.map((e) => ({ id: e.id, nombre: e.nombre, id_propietario: e.idPropietario })),
  )
  mockearTabla(
    'etiquetas_asignaciones',
    espacioPropio.asignaciones.map((a) => ({ id_etiqueta: a.idEtiqueta, id_conferencia: a.idConferencia })),
  )

  /* Etiquetas visibles por conferencia: propias siempre; ajenas solo si el dueño compartió con la bandera. */
  const visibles: { id_conferencia: string; id_etiqueta: string; nombre: string; propia: boolean }[] = []

  for (const asignacion of espacioPropio.asignaciones) {
    const etiqueta = espacioPropio.etiquetas.find((e) => e.id === asignacion.idEtiqueta)
    if (etiqueta !== undefined) {
      visibles.push({
        id_conferencia: asignacion.idConferencia,
        id_etiqueta: etiqueta.id,
        nombre: etiqueta.nombre,
        propia: true,
      })
    }
  }

  for (const conferencia of CONFERENCIAS_DE_EJEMPLO) {
    const comparticion = conferencia.comparticiones.find((c) => c.idInvitado === idUsuario)
    if (comparticion === undefined || !comparticion.privacidad.compartirEtiquetas) continue

    const espacioDueno = ESPACIOS_DE_ETIQUETAS_DE_EJEMPLO[conferencia.idDueno]
    if (espacioDueno === undefined) continue

    for (const asignacion of espacioDueno.asignaciones) {
      if (asignacion.idConferencia !== conferencia.id) continue
      const etiqueta = espacioDueno.etiquetas.find((e) => e.id === asignacion.idEtiqueta)
      if (etiqueta !== undefined) {
        visibles.push({
          id_conferencia: conferencia.id,
          id_etiqueta: etiqueta.id,
          nombre: etiqueta.nombre,
          propia: false,
        })
      }
    }
  }

  vi.mocked(supabase.rpc).mockImplementation((nombre: string) => {
    if (nombre === 'mis_etiquetas_visibles') {
      return Promise.resolve({ data: visibles, error: null }) as never
    }
    /* leer_mi_api_key y cualquier otra: sin dato. */
    return Promise.resolve({ data: null, error: null }) as never
  })
}

