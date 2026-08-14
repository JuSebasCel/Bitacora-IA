import type { ReactElement, ReactNode } from 'react'
import { Children, cloneElement, isValidElement } from 'react'
import { TEXTO_ERROR, unirClases } from './clases'

export type PropsField = {
  id: string
  etiqueta: string
  error?: string | undefined
  ayuda?: string
  /** Marca el campo como obligatorio: asterisco visual junto a la etiqueta y `aria-required` en el control. */
  obligatorio?: boolean
  children: ReactNode
}

type PropsControl = {
  id?: string
  invalido?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

function leerTexto(props: PropsControl, clave: 'id' | 'aria-describedby'): string | undefined {
  const valor = props[clave]
  return typeof valor === 'string' ? valor : undefined
}

function leerInvalido(props: PropsControl): boolean | undefined {
  return typeof props.invalido === 'boolean' ? props.invalido : undefined
}

/** Primer hijo que es un elemento de React; de el sale el id real del control. */
function primerControl(children: ReactNode): ReactElement<PropsControl> | undefined {
  for (const hijo of Children.toArray(children)) {
    if (isValidElement<PropsControl>(hijo)) return hijo
  }
  return undefined
}

/*
  `Field` es el unico responsable de la relacion etiqueta/control/descripcion.

  El id del control se resuelve una sola vez (el del hijo si lo trae, si no el
  del propio `Field`) y ese mismo valor alimenta el `htmlFor` de la etiqueta, el
  id inyectado al hijo y los ids de ayuda/error, para que la etiqueta nunca
  apunte a un id inexistente.

  Con `error` presente el control ademas se marca como invalido, salvo que el
  hijo ya traiga un `invalido` explicito: en ese caso manda el hijo.
*/
export function Field({
  id,
  etiqueta,
  error,
  ayuda,
  obligatorio = false,
  children,
}: PropsField): ReactElement {
  const idControl = leerTexto(primerControl(children)?.props ?? {}, 'id') ?? id
  const idAyuda = `${idControl}-ayuda`
  const idError = `${idControl}-error`

  const descripciones = [ayuda ? idAyuda : undefined, error ? idError : undefined].filter(
    (valor): valor is string => Boolean(valor),
  )

  const control = Children.map(children, (hijo) => {
    if (!isValidElement<PropsControl>(hijo)) return hijo

    const propias = leerTexto(hijo.props, 'aria-describedby')
    const todas = [propias, ...descripciones].filter((valor): valor is string => Boolean(valor))
    const marcarInvalido = Boolean(error) && leerInvalido(hijo.props) === undefined

    return cloneElement(hijo, {
      id: idControl,
      ...(todas.length > 0 ? { 'aria-describedby': todas.join(' ') } : {}),
      ...(marcarInvalido ? { invalido: true } : {}),
      ...(obligatorio ? { 'aria-required': true } : {}),
    })
  })

  return (
    <div className="flex flex-col gap-1.5">
      {/*
        El asterisco es un `::after` generado por CSS, no un hijo del DOM: así
        el texto accesible de la etiqueta (lo que lee `getByLabelText` y un
        lector de pantalla) sigue siendo exactamente `etiqueta`, sin el
        caracter suelto pegado. `aria-required` en el control ya comunica lo
        mismo de forma explícita.
      */}
      <label
        htmlFor={idControl}
        className={unirClases(
          'text-sm font-medium text-texto',
          obligatorio && "after:ml-0.5 after:text-error after:content-['*']",
        )}
      >
        {etiqueta}
      </label>

      {control}

      {ayuda ? (
        <p id={idAyuda} className="text-xs text-texto-tenue">
          {ayuda}
        </p>
      ) : null}

      {error ? (
        <p id={idError} role="alert" className={unirClases('text-xs font-medium', TEXTO_ERROR)}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
