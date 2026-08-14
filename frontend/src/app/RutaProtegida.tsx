import type { ReactElement } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'

/*
  Guardia de las rutas privadas del shell. Sin sesión abierta no se renderiza
  nada del árbol protegido: se reemplaza la entrada actual del historial por la
  pantalla de acceso (replace), para que el botón de volver no devuelva a una
  pantalla que la persona no puede ver.

  La ubicación pedida viaja en el estado de la navegación bajo la clave `desde`,
  con el objeto Location completo (ruta, búsqueda y hash). Así la pantalla de
  acceso puede devolver a la persona exactamente a donde iba en vez de dejarla
  siempre en el listado de conferencias.

  Mientras `cargando` es true (B1: la sesión real se resuelve de forma
  asíncrona contra Supabase Auth al montar) no se decide nada todavía -- sin
  esto, alguien con una sesión válida vería un parpadeo hacia /acceso antes de
  que la promesa resolviera.
*/
export function RutaProtegida(): ReactElement | null {
  const { autenticado, cargando } = useSession()
  const ubicacion = useLocation()

  if (cargando) {
    return null
  }

  if (!autenticado) {
    return <Navigate to="/acceso" replace state={{ desde: ubicacion }} />
  }

  return <Outlet />
}
