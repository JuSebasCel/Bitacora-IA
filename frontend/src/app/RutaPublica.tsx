import type { ReactElement } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useSession } from '@/features/auth/session'

/* Destino de quien ya entró y vuelve a pedir una pantalla de autenticación. */
const RUTA_DE_INICIO = '/conferencias'

/*
  Guardia inversa de RutaProtegida, para las rutas de acceso y registro. Con la
  sesión abierta esas pantallas no se renderizan: llegar a ellas desde el
  historial o desde un marcador mostraría un formulario que permitiría cambiar
  de sesión sin ninguna confirmación. Se reemplaza la entrada del historial
  (replace) para que volver atrás no rebote entre el shell y el formulario.
*/
export function RutaPublica(): ReactElement {
  const { autenticado } = useSession()

  if (autenticado) {
    return <Navigate to={RUTA_DE_INICIO} replace />
  }

  return <Outlet />
}
