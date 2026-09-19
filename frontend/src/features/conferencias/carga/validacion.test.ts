import { describe, expect, it } from 'vitest'
import { EXTENSIONES_POR_FUENTE, TAMANO_MAXIMO_POR_FUENTE, validarArchivo } from './validacion'

/*
  Construye un archivo con el tamaño exacto que pide la prueba sin reservar esa
  memoria de verdad: el contenido real es de un solo byte, y `size` se
  sobrescribe. Los límites mockeados llegan a los cientos de megabytes, y
  crear el buffer real en cada caso de prueba de tamaño haría la suite lenta
  sin aportar nada, porque `validarArchivo` solo lee `archivo.size`.
*/
function archivoDe(nombre: string, bytes: number, tipo = ''): File {
  const archivo = new File([new Uint8Array(1)], nombre, { type: tipo })
  Object.defineProperty(archivo, 'size', { value: bytes })
  return archivo
}

describe('validarArchivo', () => {
  it('rechaza cuando no se eligió ningún archivo', () => {
    expect(validarArchivo(null, 'audio')).toEqual({ ok: false, codigo: 'CARGA_ARCHIVO_REQUERIDO' })
  })

  it.each(EXTENSIONES_POR_FUENTE.audio)('acepta un audio con extensión %s', (extension) => {
    const archivo = archivoDe(`charla${extension}`, 1024)

    expect(validarArchivo(archivo, 'audio')).toEqual({ ok: true })
  })

  it.each(EXTENSIONES_POR_FUENTE.transcripcion)('acepta una transcripción con extensión %s', (extension) => {
    const archivo = archivoDe(`transcripcion${extension}`, 1024)

    expect(validarArchivo(archivo, 'transcripcion')).toEqual({ ok: true })
  })

  it('rechaza una extensión de transcripción cuando la fuente es audio', () => {
    const archivo = archivoDe('notas.txt', 1024)

    expect(validarArchivo(archivo, 'audio')).toEqual({
      ok: false,
      codigo: 'CARGA_ARCHIVO_NO_SOPORTADO',
    })
  })

  it('rechaza una extensión de audio cuando la fuente es transcripción', () => {
    const archivo = archivoDe('charla.mp3', 1024)

    expect(validarArchivo(archivo, 'transcripcion')).toEqual({
      ok: false,
      codigo: 'CARGA_ARCHIVO_NO_SOPORTADO',
    })
  })

  it('no distingue mayúsculas en la extensión', () => {
    const archivo = archivoDe('CHARLA.MP3', 1024)

    expect(validarArchivo(archivo, 'audio')).toEqual({ ok: true })
  })

  it('acepta un archivo justo en el tamaño máximo de su fuente', () => {
    const archivo = archivoDe('charla.mp3', TAMANO_MAXIMO_POR_FUENTE.audio)

    expect(validarArchivo(archivo, 'audio')).toEqual({ ok: true })
  })

  it('rechaza un archivo un byte más grande que el máximo de su fuente', () => {
    const archivo = archivoDe('charla.mp3', TAMANO_MAXIMO_POR_FUENTE.audio + 1)

    expect(validarArchivo(archivo, 'audio')).toEqual({
      ok: false,
      codigo: 'CARGA_ARCHIVO_MUY_GRANDE',
    })
  })

  it('rechaza una transcripción más grande que el máximo de su fuente', () => {
    const archivo = archivoDe('notas.txt', TAMANO_MAXIMO_POR_FUENTE.transcripcion + 1)

    expect(validarArchivo(archivo, 'transcripcion')).toEqual({
      ok: false,
      codigo: 'CARGA_ARCHIVO_MUY_GRANDE',
    })
  })
})
