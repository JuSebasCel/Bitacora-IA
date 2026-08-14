import type { ReactElement } from 'react'
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { reglasDeContrasena } from './reglasDeContrasena'

/*
  Lista de requisitos de la contraseña, en vivo: cada regla empieza en rojo y
  pasa a verde apenas la contraseña escrita la cumple. `aria-live="polite"`
  para que un lector de pantalla anuncie el cambio sin interrumpir la escritura.
*/
export function ChecklistDeContrasena({ contrasena }: { contrasena: string }): ReactElement {
  return (
    <ul aria-live="polite" className="flex flex-col gap-1">
      {reglasDeContrasena(contrasena).map((regla) => (
        <li
          key={regla.clave}
          className={`flex items-center gap-1.5 text-xs ${regla.cumplida ? 'text-validado' : 'text-error'}`}
        >
          {regla.cumplida ? (
            <CheckIcon size={12} weight="bold" aria-hidden="true" className="shrink-0" />
          ) : (
            <XIcon size={12} weight="bold" aria-hidden="true" className="shrink-0" />
          )}
          {regla.texto}
        </li>
      ))}
    </ul>
  )
}
