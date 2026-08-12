import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cargarConferencia, RETRASO_SIMULADO_MS } from './carga'
import type { DatosDeCarga } from './validacion'

const DATOS_VALIDOS: DatosDeCarga = {
  titulo: 'Series de tiempo aplicadas a la demanda de transporte urbano',
  idPonente: 'pon-evt-ccdn-tomas-iriarte-villalba',
  idEvento: 'evt-ccdn',
  fechaDelEvento: '2026-05-14',
  fuente: 'audio',
}

function archivoValido(): File {
  return new File([new Uint8Array(1)], 'charla.mp3')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cargarConferencia', () => {
  it('no resuelve antes de que pase el retraso simulado', async () => {
    const resultado = vi.fn()
    void cargarConferencia(DATOS_VALIDOS, archivoValido()).then(resultado)

    await vi.advanceTimersByTimeAsync(RETRASO_SIMULADO_MS - 1)

    expect(resultado).not.toHaveBeenCalled()
  })

  it('resuelve con éxito una vez pasa el retraso simulado', async () => {
    const promesa = cargarConferencia(DATOS_VALIDOS, archivoValido())

    await vi.advanceTimersByTimeAsync(RETRASO_SIMULADO_MS)

    await expect(promesa).resolves.toEqual({ ok: true })
  })

  it('no espera el retraso cuando los datos son inválidos', async () => {
    const resultado = vi.fn()
    void cargarConferencia({ ...DATOS_VALIDOS, titulo: '' }, archivoValido()).then(resultado)

    await vi.advanceTimersByTimeAsync(0)

    expect(resultado).toHaveBeenCalledWith({ ok: false, codigo: 'CARGA_CAMPO_REQUERIDO' })
  })

  it('no espera el retraso cuando falta el archivo', async () => {
    const resultado = vi.fn()
    void cargarConferencia(DATOS_VALIDOS, null).then(resultado)

    await vi.advanceTimersByTimeAsync(0)

    expect(resultado).toHaveBeenCalledWith({ ok: false, codigo: 'CARGA_ARCHIVO_REQUERIDO' })
  })

  it('valida los datos antes que el archivo', async () => {
    const resultado = await cargarConferencia({ ...DATOS_VALIDOS, titulo: '' }, null)

    expect(resultado).toEqual({ ok: false, codigo: 'CARGA_CAMPO_REQUERIDO' })
  })

  it('valida el archivo cuando los datos ya son válidos', async () => {
    const resultado = vi.fn()
    const archivoNoSoportado = new File([new Uint8Array(1)], 'notas.txt')
    void cargarConferencia(DATOS_VALIDOS, archivoNoSoportado).then(resultado)

    await vi.advanceTimersByTimeAsync(0)

    expect(resultado).toHaveBeenCalledWith({ ok: false, codigo: 'CARGA_ARCHIVO_NO_SOPORTADO' })
  })
})
