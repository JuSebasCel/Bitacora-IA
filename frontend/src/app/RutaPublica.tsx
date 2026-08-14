import type { ReactElement } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@/features/auth/session'
import { destinoTrasAcceder } from '@/features/auth/screens'

/*
  Guardia inversa de RutaProtegida, para las rutas de acceso y registro. Con la
  sesión abierta esas pantallas no se renderizan: llegar a ellas desde el
  historial o desde un marcador mostraría un formulario que permitiría cambiar
  de sesión sin ninguna confirmación. Se reemplaza la entrada del historial
  (replace) para que volver atrás no rebote entre el shell y el formulario.

  Mientras `cargando` es true no se decide nada: alguien con sesión real
  válida no debe ver un parpadeo del formulario de acceso antes de que la
  promesa de Supabase Auth resuelva (B1).

  El destino usa `destinoTrasAcceder` -- el mismo cálculo que ya hacían
  `PantallaAcceso`/`PantallaRegistro` tras un acceso o registro exitoso --
  en vez de un `/conferencias` fijo. Antes de B1, esas pantallas eran las
  únicas que decidían a dónde ir después de autenticar, porque `acceder`
  nunca hacía red y el `navegar()` imperativo siempre ganaba. Con la sesión
  real, `acceder`/`registrar` actualizan `usuario` tras un `await` de red
  real, lo que puede disparar el re-render de esta guardia (reactiva a
  `autenticado`) antes de que el `navegar()` imperativo de la pantalla
  llegue a ejecutarse -- dos sitios decidiendo el destino de la misma
  transición es una carrera. Ambos calculan ahora el mismo destino a partir
  del mismo `location.state`, así que el resultado es el mismo sin importar
  cuál gane.
*/
export function RutaPublica(): ReactElement | null {
  const { autenticado, cargando } = useSession()
  const ubicacion = useLocation()

  if (cargando) {
    return null
  }

  if (autenticado) {
    return <Navigate to={destinoTrasAcceder(ubicacion.state)} replace />
  }

  return <Outlet />
}
