import { useState } from 'react'
import type { InputHTMLAttributes, ReactElement } from 'react'
import { Input } from './Input'

/*
  Contraseña con un ojo para verla.

  Escribirla a ciegas es de donde salen la mitad de los "correo o contraseña
  incorrectos": no hay forma de distinguir un dedo torcido de una contraseña
  equivocada. El ojo la enseña mientras se pulsa la decisión de mostrarla, y
  vuelve a taparse al enviar el formulario (el campo se vacía y se remonta).

  El botón es `tabindex -1`: quien llega tabulando desde la contraseña espera
  el botón de entrar, no un interruptor. Se pulsa con el ratón, que es como
  se usa.
*/

export type PropsCampoDeContrasena = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalido?: boolean
}

export function CampoDeContrasena({ invalido = false, ...resto }: PropsCampoDeContrasena): ReactElement {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...resto} invalido={invalido} type={visible ? 'text' : 'password'} className="pr-12" />

      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((antes) => !antes)}
        aria-label={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
        aria-pressed={visible}
        className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-acento-tenue hover:text-texto"
      >
        <span aria-hidden="true" className="material-symbols-rounded icono-contorno text-xl">
          {visible ? 'visibility_off' : 'visibility'}
        </span>
      </button>
    </div>
  )
}
