type PropiedadesPantallaDeModulo = {
  titulo: string
  descripcion: string
}

/*
  Encabezado común de las pantallas del shell: nombre de la sección y una línea
  que dice, en términos del producto, qué trabajo se hace ahí. Cada módulo
  posterior sustituye el cuerpo manteniendo este encabezado.
*/
export function PantallaDeModulo({ titulo, descripcion }: PropiedadesPantallaDeModulo) {
  return (
    <section className="border-t border-filete-fuerte pt-5">
      <h1 className="text-base font-medium tracking-tight text-texto">{titulo}</h1>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-texto-tenue">{descripcion}</p>
    </section>
  )
}
