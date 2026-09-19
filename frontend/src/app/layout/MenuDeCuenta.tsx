import { DesktopIcon } from '@phosphor-icons/react/dist/csr/Desktop'
import { GearIcon } from '@phosphor-icons/react/dist/csr/Gear'
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon'
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut'
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun'
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle'
import type { Icon } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactElement } from 'react'
import { Link } from 'react-router'
import type { UsuarioSesion } from '@/features/auth/session'
import { useApiKey } from '@/features/configuracion/useApiKey'
import { useTema, type Tema } from '@/shared/tema'
import { Popover } from '@/shared/ui'
import { inicialesDe } from './inicialesDe'

const OPCIONES_DE_TEMA: ReadonlyArray<{ valor: Tema; etiqueta: string; Icono: Icon }> = [
  { valor: 'claro', etiqueta: 'Claro', Icono: SunIcon },
  { valor: 'oscuro', etiqueta: 'Oscuro', Icono: MoonIcon },
  { valor: 'sistema', etiqueta: 'Sistema', Icono: DesktopIcon },
]

/*
  Círculo con iniciales en vez de "nombre + botón Cerrar sesión" sueltos: el
  nombre, el correo, el tema y "Cerrar sesión" viven juntos en un solo menú,
  mismo patrón de `Popover` que ya usa `NotificacionesDropdown`. El tema es la
  única "setting" que se agrega -- es la única que hace algo real; no se
  agregan opciones decorativas sin función.
*/
export function MenuDeCuenta({
  usuario,
  cerrarSesion,
}: {
  usuario: UsuarioSesion
  cerrarSesion: () => void
}): ReactElement {
  const { tema, establecerTema } = useTema()
  const { clave: apiKey, cargando: cargandoApiKey } = useApiKey()
  const apiKeyFaltante = !cargandoApiKey && apiKey === null
  const nombreVisible = usuario.nombre === '' ? usuario.correo : usuario.nombre
  const reducirMovimiento = useReducedMotion()

  return (
    <Popover
      alinear="derecha"
      etiquetaAccesible={
        apiKeyFaltante ? `Cuenta de ${nombreVisible}, falta configurar la API key` : `Cuenta de ${nombreVisible}`
      }
      /*
        Dos círculos concéntricos, como la referencia: un aro gris de 40px que
        lo despega del fondo y, dentro, el disco con las iniciales. Solo con el
        disco pequeño el avatar se leía como un punto suelto.
      */
      boton={
        <span aria-hidden="true" className="relative inline-flex">
          <span className="flex size-12 items-center justify-center rounded-full bg-acento-tenue">
            <span className="flex size-7 items-center justify-center rounded-full bg-acento text-[0.6875rem] font-semibold text-acento-contraste">
              {inicialesDe(usuario.nombre, usuario.correo)}
            </span>
          </span>
          <AnimatePresence>
            {apiKeyFaltante ? (
              <motion.span
                initial={reducirMovimiento ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-pendiente ring-2 ring-panel"
              />
            ) : null}
          </AnimatePresence>
        </span>
      }
    >
      {(cerrar) => (
        <div className="flex flex-col gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-texto">{nombreVisible}</p>
            <p className="truncate text-xs text-texto-tenue">{usuario.correo}</p>
          </div>

          {apiKeyFaltante ? (
            <Link
              to="/configuracion#config-api-key"
              onClick={cerrar}
              className="flex items-start gap-2 rounded-md border border-pendiente/40 bg-pendiente/10 p-2.5 text-xs text-texto transition-colors hover:border-pendiente"
            >
              <WarningCircleIcon
                size={15}
                weight="regular"
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-pendiente"
              />
              <span>
                Falta tu API key. Configúrala para poder cargar conferencias.
              </span>
            </Link>
          ) : null}

          <div className="border-t border-filete pt-3">
            <p className="mb-1.5 text-xs font-medium text-texto-tenue">Tema</p>
            <div className="grid grid-cols-3 gap-1 rounded-md border border-filete bg-fondo p-1">
              {OPCIONES_DE_TEMA.map(({ valor, etiqueta, Icono }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => establecerTema(valor)}
                  aria-pressed={tema === valor}
                  className={`flex flex-col items-center gap-1 rounded px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    tema === valor
                      ? 'elevacion bg-panel text-acento'
                      : 'text-texto-tenue hover:text-texto'
                  }`}
                >
                  <Icono size={14} weight="regular" aria-hidden="true" />
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/configuracion"
            onClick={cerrar}
            className="flex items-center gap-2 border-t border-filete pt-3 text-sm text-texto transition-colors hover:text-acento"
          >
            <GearIcon size={16} weight="regular" aria-hidden="true" />
            Configuración
          </Link>

          <button
            type="button"
            onClick={() => {
              cerrar()
              cerrarSesion()
            }}
            className="flex items-center gap-2 border-t border-filete pt-3 text-sm text-texto-tenue transition-colors hover:text-error"
          >
            <SignOutIcon size={16} weight="regular" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </Popover>
  )
}
