import { useLayoutEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { ContextoTema } from './ContextoTema'
import type { Tema, ValorTema } from './tipos'

const CLAVE_DE_ALMACENAMIENTO = 'bitacora-tema'

function leerTemaGuardado(): Tema {
  const guardado = localStorage.getItem(CLAVE_DE_ALMACENAMIENTO)
  return guardado === 'claro' || guardado === 'oscuro' ? guardado : 'sistema'
}

/*
  Se monta una sola vez, en la raíz de `App.tsx`, para que el override de tema
  aplique tanto a las pantallas públicas (acceso/registro) como al shell
  autenticado -- ninguna de las dos debería quedar atada a `prefers-color-scheme`
  si la persona ya eligió un tema explícito.

  `useLayoutEffect`, no `useEffect`: aplica el atributo antes de que el
  navegador pinte el primer frame, para no mostrar un parpadeo del tema
  equivocado al recargar con un tema guardado distinto al del sistema.
*/
export function ProveedorDeTema({ children }: { children: ReactNode }): ReactElement {
  const [tema, setTema] = useState<Tema>(() => leerTemaGuardado())

  useLayoutEffect(() => {
    const raiz = document.documentElement

    if (tema === 'sistema') {
      delete raiz.dataset.theme
      localStorage.removeItem(CLAVE_DE_ALMACENAMIENTO)
      return
    }

    raiz.dataset.theme = tema === 'oscuro' ? 'dark' : 'light'
    localStorage.setItem(CLAVE_DE_ALMACENAMIENTO, tema)
  }, [tema])

  const valor = useMemo<ValorTema>(() => ({ tema, establecerTema: setTema }), [tema])

  return <ContextoTema value={valor}>{children}</ContextoTema>
}
