import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { PantallaAcceso, PantallaRegistro } from '@/features/auth/screens'
import { SessionProvider } from '@/features/auth/session'
import { ShellLayout } from '@/app/layout'
import { RutaProtegida } from '@/app/RutaProtegida'
import { RutaPublica } from '@/app/RutaPublica'
import { PantallaCatalogo } from '@/features/catalogo/screens'
import { PantallaConferencias, PantallaDetalleConferencia } from '@/features/conferencias/screens'
import { PantallaDetalleMemoria, PantallaMemorias } from '@/features/memorias/screens'
import { PantallaEditorDePlantilla, PantallaPlantillas } from '@/features/plantillas/screens'
import { PantallaTaxonomia } from '@/features/taxonomia/screens'
import { PantallaConfiguracion } from '@/app/placeholders'

/*
  Mapa de rutas de la aplicación.

  Las dos rutas públicas viven fuera del shell: quien no ha entrado no ve la
  navegación. Van envueltas en `RutaPublica`, que aparta de ellas a quien ya
  tiene sesión abierta, para que nadie llegue al formulario de acceso desde el
  historial y cambie de sesión sin darse cuenta.

  Todo lo demás cuelga de `RutaProtegida`, que redirige a `/acceso` cuando no
  hay sesión y recuerda a dónde se quería ir, y de `ShellLayout`, que aporta la
  barra lateral y la barra superior comunes.

  El chat (F7) es un panel lateral dentro del shell, no una ruta, y por eso no
  aparece en esta tabla.
*/
export function App(): ReactElement {
  return (
    <SessionProvider>
      <Routes>
        <Route element={<RutaPublica />}>
          <Route path="/acceso" element={<PantallaAcceso />} />
          <Route path="/registro" element={<PantallaRegistro />} />
        </Route>

        <Route element={<RutaProtegida />}>
          <Route element={<ShellLayout />}>
            <Route index element={<Navigate to="/conferencias" replace />} />
            <Route path="/conferencias" element={<PantallaConferencias />} />
            <Route path="/conferencias/:idConferencia" element={<PantallaDetalleConferencia />} />
            <Route path="/catalogo" element={<PantallaCatalogo />} />
            <Route path="/memorias" element={<PantallaMemorias />} />
            <Route path="/memorias/:idMemoria" element={<PantallaDetalleMemoria />} />
            <Route path="/plantillas" element={<PantallaPlantillas />} />
            <Route path="/plantillas/:idPlantilla" element={<PantallaEditorDePlantilla />} />
            <Route path="/taxonomia" element={<PantallaTaxonomia />} />
            <Route path="/configuracion" element={<PantallaConfiguracion />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/conferencias" replace />} />
      </Routes>
    </SessionProvider>
  )
}
