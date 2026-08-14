/*
  "sistema" no es un tercer color: es la ausencia de override, siguiendo
  `prefers-color-scheme` como hacía la app antes de este proveedor. "claro" y
  "oscuro" fuerzan el tema sin importar la preferencia del sistema operativo.
*/
export type Tema = 'claro' | 'oscuro' | 'sistema'

export type ValorTema = {
  tema: Tema
  establecerTema: (tema: Tema) => void
}
