const PREDETERMINADO = '/conferencias'

/*
  Resuelve a dónde llevar a la persona después de acceder.

  `RutaProtegida` adjunta la ubicación pedida en el estado de la navegación bajo
  la clave `desde`, para que quien entró buscando `/plantillas` no aterrice en
  el listado de conferencias.

  El estado de navegación es manipulable desde el exterior (se puede llegar a
  `/acceso` con un estado fabricado), así que solo se aceptan rutas internas:
  una sola barra inicial, nunca `//host` ni una URL absoluta. Tampoco se vuelve
  a una ruta pública, que dejaría a la persona en el formulario recién resuelto.
*/
export function destinoTrasAcceder(estado: unknown): string {
  if (typeof estado !== 'object' || estado === null || !('desde' in estado)) {
    return PREDETERMINADO
  }

  const desde = (estado as { desde: unknown }).desde
  if (typeof desde !== 'object' || desde === null) {
    return PREDETERMINADO
  }

  const { pathname, search, hash } = desde as Record<string, unknown>
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return PREDETERMINADO
  }

  if (pathname === '/acceso' || pathname === '/registro') {
    return PREDETERMINADO
  }

  const consulta = typeof search === 'string' ? search : ''
  const fragmento = typeof hash === 'string' ? hash : ''

  return `${pathname}${consulta}${fragmento}`
}
