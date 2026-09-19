/*
  Componentes aprobados del lenguaje visual que se está calcando.

  Esta carpeta es la que va a sobrevivir: solo entra aquí lo que ya se revisó
  y quedó como se quería. Lo que sigue en discusión vive un nivel arriba, en
  `dev/diseno/`, y se promueve a esta carpeta cuando se aprueba.

  Todo depende de los tokens `--m3-*` que declara `.lienzo-m3` en
  `styles/index.css`, así que quien los use tiene que estar dentro de un
  contenedor con esa clase.
*/

export { Dock } from './Dock'
export type { GrupoDelDock, PropsDock } from './Dock'

export { EstadoVacioIlustrado } from './EstadoVacioIlustrado'
export type { PropsEstadoVacioIlustrado } from './EstadoVacioIlustrado'

export { SelectorDeVista } from './SelectorDeVista'
export type { OpcionDeVista, PropsSelectorDeVista } from './SelectorDeVista'

export { Modal } from './Modal'
export type { AnclajeDeModal, PropsModal } from './Modal'
