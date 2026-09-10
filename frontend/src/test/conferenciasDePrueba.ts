import { vi } from 'vitest'
import * as repositorio from '@/features/conferencias/repositorio'
import { CONFERENCIAS_DE_EJEMPLO, FICHAS_DE_EJEMPLO } from '@/features/conferencias/data'
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
