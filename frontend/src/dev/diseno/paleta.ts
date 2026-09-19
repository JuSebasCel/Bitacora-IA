/*
  Clases del sandbox de diseño (`/_diseno`), apoyadas en los tokens Material 3
  que define `.lienzo-m3` en `styles/index.css`. Se usan variables CSS y no
  valores literales porque de eso depende que el modo claro y el oscuro
  salgan del mismo marcado, sin una sola condicional en los componentes.

  Los valores del tema oscuro están medidos sobre la referencia (lectura de
  `--md-sys-color-*`), no estimados. Ver el comentario en `index.css`.
*/

/* Superficies */
export const M3_FONDO = 'bg-[var(--m3-background)]'
export const M3_PANEL = 'bg-[var(--m3-surface-container-low)]'
export const M3_PANEL_ALTO = 'bg-[var(--m3-surface-container)]'
export const M3_PANEL_MAXIMO = 'bg-[var(--m3-surface-container-highest)]'

/*
  Texto. El "tenue" apunta a `outline-variant` y no a `surface-variant`: en
  oscuro los dos valen lo mismo, pero en claro no, y el nav inactivo de la
  referencia usa `outline-variant`. Medido, no supuesto.
*/
export const M3_TEXTO = 'text-[var(--m3-on-background)]'
export const M3_TEXTO_SECUNDARIO = 'text-[var(--m3-on-surface-variant)]'
export const M3_TEXTO_TENUE = 'text-[var(--m3-outline-variant)]'
export const M3_NAV_ACTIVO = 'text-[var(--m3-nav-activo)]'

/* Acento: blanco en oscuro, negro en claro. Nunca un color. */
export const M3_PRIMARIO_BG = 'bg-[var(--m3-primary)]'
export const M3_PRIMARIO_TEXTO = 'text-[var(--m3-on-primary)]'

/*
  El filete de la referencia no es un `border`: es un box-shadow inset de 1px.
  Con `border` real el borde se ve más duro y además cambia la caja.
*/
export const M3_FILETE = 'shadow-[inset_0_0_0_1px_var(--m3-filete)]'

/* Geometría medida sobre la referencia. */
export const M3_RADIO_TARJETA = 'rounded-[24px]'
export const M3_RADIO_PILDORA = 'rounded-full'
