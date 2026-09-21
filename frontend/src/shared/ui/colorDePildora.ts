/*
  Los colores de las pastillas, fuera del acento.

  El acento dice "esto se pulsa" o "esto está elegido"; estos colores dicen
  "esto es de tal clase". Antes todas las pastillas eran del mismo gris y una
  etiqueta, un tema y un tipo de ficha se leían como la misma cosa. Son seis
  tonos suaves pensados para convivir con cualquier primario, de modo que el
  día que el acento se pueda cambiar no haya que volver a elegirlos (tokens
  `--bitacora-pildora-*` en `styles/index.css`).

  Las clases van escritas enteras y no armadas con `bg-pildora-${color}`:
  Tailwind solo genera las clases que encuentra literales en el código.
*/
export type ColorDePildora = 'azul' | 'verde' | 'ambar' | 'rosa' | 'violeta' | 'turquesa'

export const CLASES_DE_PILDORA: Record<ColorDePildora, string> = {
  azul: 'bg-pildora-azul text-pildora-azul-texto',
  verde: 'bg-pildora-verde text-pildora-verde-texto',
  ambar: 'bg-pildora-ambar text-pildora-ambar-texto',
  rosa: 'bg-pildora-rosa text-pildora-rosa-texto',
  violeta: 'bg-pildora-violeta text-pildora-violeta-texto',
  turquesa: 'bg-pildora-turquesa text-pildora-turquesa-texto',
}

const ORDEN: readonly ColorDePildora[] = ['azul', 'verde', 'ambar', 'rosa', 'violeta', 'turquesa']

/*
  Un color estable para algo que no tiene color propio —una etiqueta, un
  tema—: siempre el mismo para la misma clave, en cualquier pantalla y en
  cualquier sesión, sin guardarlo en ninguna parte. Un hash de la clave y
  no un contador: con un contador, crear una etiqueta nueva recolorearía
  las que ya había.
*/
export function colorPorClave(clave: string): ColorDePildora {
  let hash = 0
  for (const caracter of clave) {
    hash = (hash * 31 + caracter.charCodeAt(0)) | 0
  }

  return ORDEN[Math.abs(hash) % ORDEN.length] ?? 'azul'
}
