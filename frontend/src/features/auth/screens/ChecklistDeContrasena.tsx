import type { ReactElement } from 'react'
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check'
import { CircleIcon } from '@phosphor-icons/react/dist/csr/Circle'
import { XIcon } from '@phosphor-icons/react/dist/csr/X'
import { reglasDeContrasena } from './reglasDeContrasena'

/*
  Lista de requisitos de la contraseña, en vivo: mientras el campo está vacío
  ninguna regla se ha incumplido todavía, así que se muestran en neutro en vez
  de en rojo — arrancar en rojo antes de escribir una sola tecla se leía como
  una pantalla llena de errores desde el primer frame. Una vez que hay texto,
  cada regla pasa a rojo o verde según la cumpla. `aria-live="polite"` para que
  un lector de pantalla anuncie el cambio sin interrumpir la escritura.
*/
export function ChecklistDeContrasena({ contrasena }: { contrasena: string }): ReactElement {
  const sinEscribir = contrasena === ''

  return (
    <ul aria-live="polite" className="flex flex-col gap-1">
      {reglasDeContrasena(contrasena).map((regla) => (
        <li
          key={regla.clave}
          className={`flex items-center gap-1.5 text-xs ${
            sinEscribir ? 'text-texto-tenue' : regla.cumplida ? 'text-validado' : 'text-error'
          }`}
        >
          {sinEscribir ? (
            <CircleIcon size={12} weight="regular" aria-hidden="true" className="shrink-0" />
          ) : regla.cumplida ? (
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
