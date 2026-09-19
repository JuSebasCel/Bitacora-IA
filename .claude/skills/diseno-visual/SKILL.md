---
name: diseno-visual
description: Lenguaje visual de Bitácora AI y cómo construir cada sección de interfaz. Úsala al crear o modificar pantallas, componentes de UI, navegación, tarjetas o tipografía, y antes de proponer colores, radios, tamaños de letra o animaciones. Incluye el método para extraer un diseño de una referencia externa con medidas reales en vez de estimaciones.
---

# Lenguaje visual de Bitácora AI

Registro de decisiones de diseño **ya aprobadas**. Solo entra aquí lo que se
revisó y quedó como se quería — si algo está en discusión, no se anota todavía.

El lenguaje se está calcando de una app de referencia construida sobre
Material Design 3, con su paleta llevada a negro puro y el acento reemplazado
por blanco. Los componentes aprobados viven en
`frontend/src/dev/diseno/componentes/`, y se revisan en la ruta `/_diseno`.

## El método: medir, no estimar

Esta es la regla que más ha servido. **Nunca deduzcas un valor de una captura
de pantalla.** Una captura da una impresión; los estilos computados dan el
número. En este proyecto, calcar a ojo produjo un dock que "se parecía" pero
se sentía mal, y las tres diferencias que lo arruinaban eran invisibles en la
imagen: iconos que la referencia no tenía, tamaños 4px cortos, y un
`line-height` que no debía crecer.

Con la extensión de Chrome, sobre la pestaña de la referencia:

```js
// Geometría y tipografía reales de un elemento
const cs = getComputedStyle(el)
cs.fontSize, cs.fontWeight, cs.lineHeight, cs.color, cs.padding
el.getBoundingClientRect()   // posiciones y alturas exactas

// Tokens del sistema de diseño, si los expone
const raiz = getComputedStyle(document.documentElement)
// recorrer raiz[i] buscando las que empiezan por '--'
```

Tres trampas que ya costaron tiempo:

- **Un icono que no se ve puede estar en el marcado.** Los del dock de la
  referencia existen en el DOM pero con `display: none`. Comprueba el estilo
  computado, no la presencia del nodo.
- **La fuente declarada no siempre es la que renderiza.** Verifícalo midiendo
  ancho de texto en un `canvas` con la familia declarada y comparándolo contra
  la familia sospechada; si coinciden, esa es la que se está usando.
- **Una app puede usar más de una familia.** La referencia usa una para
  títulos y otra para navegación y cuerpo. Mira elemento por elemento antes de
  concluir que hay una sola.

Para animaciones, ver la sección al final.

## Fundamentos

**Tipografía — dos familias, cada una con su trabajo:**

- `font-titulo` (Bricolage Grotesque) encabeza: títulos de página, de tarjeta,
  mensajes de estado vacío.
- `font-sans` (DM Sans) hace navegación y texto corrido.

El contraste entre las dos es lo que separa un título de su contenido sin
depender solo del tamaño. No mezcles una tercera familia.

**Color — monocromo, sin acento de color.** Lo interactivo se distingue por
contraste (blanco sobre negro, negro sobre blanco), nunca por un color. Los
tokens viven en `.lienzo-m3`, en `frontend/src/styles/index.css`, y conservan
los nombres de Material 3 para que portarlos sea un renombrado y no una
reinterpretación. Los dos temas están **medidos**, no deducidos.

Tres valores que conviene no improvisar:

- **El fondo claro no es blanco puro**: es `#fbf9fc`. Poner `#ffffff` fue el
  error más visible de la primera versión — se nota aunque no se sepa por qué.
- **El gris del nav inactivo es `outline-variant`**, no `surface-variant`. En
  oscuro los dos valen lo mismo y el error pasa desapercibido; en claro no.
- **Las ilustraciones usan el par `secondary-container` /
  `on-secondary-container`.** Con eso el disco del estado vacío funciona en
  los dos temas sin tocarlo.

> **Trampa de Tailwind:** `text-[var(--x)]` es ambiguo — no puede saber si
> pides color o tamaño de letra, y a veces resuelve a tamaño; el elemento
> termina heredando el color del padre en silencio. Cuando el valor es una
> variable suelta, usa `[color:var(--x)]`.

**Iconos — Material Symbols Rounded**, en su variante rellena
(`font-variation-settings: 'FILL' 1`). Son un tipo de letra: el nombre va como
texto (`folder_open`) y la ligadura lo dibuja, así que el tamaño se controla
con `font-size`. Nombres en fonts.google.com/icons.

> El CSS del paquete de iconos no está en ninguna capa y fija
> `font-size: 24px`. En la cascada, lo que está fuera de capas le gana a lo que
> está dentro — así que una utilidad de Tailwind **no** puede cambiarle el
> tamaño. Por eso `.icono-relleno` también vive fuera de `@layer` y usa
> `font-size: inherit`: el tamaño se declara en el contenedor.

## Dock / navegación lateral — APROBADO

Componente: `frontend/src/dev/diseno/componentes/Dock.tsx`

Columna de 280px, padding 16px. Cada ítem es una caja de 40px de alto con 8px
de padding, y van pegados entre sí (40 + 40 + 40…). Un grupo con rótulo abre
con 24px de aire; el rótulo va a 16px.

| Estado | Tamaño | Peso | Color |
|---|---|---|---|
| Inactivo | 24px | 400 | `--m3-surface-variant` (gris tenue) |
| Activo | 28px | 600 | `--m3-nav-activo` (blanco / negro) |

**Las tres decisiones que lo hacen funcionar. Si tocas una, se rompe:**

1. **Sin iconos.** Es tipografía pura. Agregarle iconos fue el error que más
   lo alejó de la referencia.
2. **El `line-height` se queda clavado en 24px** aunque el ítem activo suba a
   28px. Por eso la fila sigue midiendo 40px y la columna no salta al cambiar
   de sección. Es el detalle que nadie ve pero que se siente.
3. **El activo no lleva fondo, ni pastilla, ni color.** Solo crece y pesa más.
   Toda la jerarquía sale de la tipografía.

Los ítems llevan `cursor: pointer`. La sección activa llega por props, no por
estado propio: el cambio suele disparar también la animación de entrada del
contenido, así que manda la pantalla que lo usa.

### El armazón que lo sostiene

El dock **no se fija con `position: fixed`**. Queda quieto por construcción,
con el patrón de app-shell de la referencia:

- El contenedor raíz mide exactamente el alto de la ventana y no desborda
  (`h-dvh overflow-hidden`). El documento nunca scrollea.
- El dock es un hijo flex que se estira a todo lo alto.
- El contenido tiene su propia caja con `overflow-y-auto`, y es lo único que
  se desplaza.

Es lo que separa que la interfaz se sienta una app y no una página larga.

## Movimiento

Curvas disponibles como tokens en `.lienzo-m3`:

| Token | Valor | Para qué |
|---|---|---|
| `--m3-curva-rebote-fuerte` | `cubic-bezier(0.38, 0.49, 0, 1.5)` | Lo que crece (tamaño de letra) |
| `--m3-curva-rebote-suave` | `cubic-bezier(0.38, 0.49, 0, 1.2)` | Transformaciones, hover |
| `--m3-curva-entrada` | `cubic-bezier(0.37, 0.35, 0, 1)` | Entrada de contenido |

Las dos primeras terminan en y > 1: el valor se pasa del destino y vuelve, y
de ahí sale la sensación elástica.

**Dock** (`.item-de-dock`): `font-size` en 0.3s con rebote fuerte, `color` en
0.15s, `transform` en 0.3s con rebote suave. El `transform-origin` va a la
izquierda para que el texto crezca hacia la derecha sin descuadrar la columna.
En hover, `scale(1.2)` y color a máximo contraste.

Dos detalles con razón de ser: el color entra en la **mitad** de tiempo que el
tamaño, y por eso se siente más reactivo de lo que es. Y `font-weight` queda
**fuera** de la transición a propósito — en la referencia salta sin animar.

**Entrada del dock** (`navIn` en la referencia): `opacity 0 → 1` y
`translateX(-100%) → 0` en **0.7s** con `cubic-bezier(0.38, 0.49, 0, 1)`. Es
más lenta que todo lo demás a propósito: corre una sola vez, al abrir.

**Entrada de contenido**: `filter: blur(32px) → blur(0)` en 0.3s con la curva
de entrada, más un fundido de opacidad de 0.2s. Van en elementos distintos
porque la forma abreviada de `animation` solo admite una por elemento. En
React hace falta un `key` que cambie para que el subárbol se remonte y la
animación vuelva a dispararse.

### Cómo capturar animaciones de una referencia

Las transiciones se leen en frío:

```js
cs.transitionProperty, cs.transitionDuration, cs.transitionTimingFunction
```

Los `@keyframes` de hojas bloqueadas por CORS no se pueden leer, pero sí sus
efectos ya calculados: **dispara el cambio y muestrea en la misma ejecución**,
porque entre dos llamadas del agente la animación ya terminó.

```js
boton.click()
await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
document.getAnimations().map(a => ({
  n: a.animationName || a.transitionProperty,
  t: a.effect.getComputedTiming(),
  kf: a.effect.getKeyframes(),
}))
```

Para verla, congélala: `el.animate(frames, opts)`, `.pause()`, fijar
`currentTime` al punto medio y capturar pantalla.

> Chrome **congela las animaciones y transiciones de pestañas en segundo
> plano**: `requestAnimationFrame` no dispara y `getAnimations()` devuelve
> vacío. Si sale vacío, pide que traigan esa pestaña al frente antes de
> concluir nada.
>
> Esto tiene un síntoma engañoso al verificar colores: si un elemento tiene
> `transition` sobre `color`, en segundo plano se queda **congelado en el
> color viejo** aunque la variable ya valga otra cosa. Se llega a ver una
> misma pantalla con unos elementos en tema claro y otros en oscuro, y parece
> un bug del código. No lo es. Antes de depurar, trae la pestaña al frente y
> vuelve a medir.

> Si `prefers-reduced-motion` está activo en el sistema, las duraciones reales
> serán `1e-05s` y **no se verá ninguna animación**. Compruébalo con
> `matchMedia('(prefers-reduced-motion: reduce)').matches` antes de dar por
> rota una animación que está bien escrita.

## Modales — APROBADO

Componente: `frontend/src/dev/diseno/componentes/Modal.tsx`

Los dos modales de la referencia —el buscador anclado a su botón y el de
crear carpeta centrado— son **el mismo componente**. Lo único que cambia es
dónde se posa.

**Forma:** radio **32px** (más redondo que las tarjetas, que van a 24px),
fondo `surface-bright`, y **sin sombra**: la separación la da el velo. El
botón de cerrar va a la **izquierda** del título.

**El modal no aparece: crece desde el botón que lo abrió.** En el primer
cuadro su transformación es `scale(ancho del botón / ancho de la ventana)`
más la traslación que lo calza encima. Se suelta y se deja que la transición
lo lleve a identidad. Es un FLIP, y es lo que hace sentir que el botón *se
convierte* en el modal.

Tres capas corren juntas, y las tres hacen falta —con una sola se siente
pobre:

| Capa | De → a | Duración |
|---|---|---|
| Ventana, transform | caja del botón → identidad | 300ms, curva de entrada |
| Ventana, filtro | `blur(32px)` → 0 | 300ms |
| Velo | opacidad 0 → 1, desenfoque 0 → 6px | 250ms |

**El cierre es el mismo recorrido al revés**, y se ve tan importante como la
apertura.

El anclado se posa fijando `top` y `right` contra el botón, y se acota a una
región (`limites`) para no montarse sobre el dock ni salirse por abajo.

### Cuatro trampas que costaron sesión entera

1. **Una animación CSS le gana a los estilos en línea** en las propiedades
   que anima, mientras siga activa. Las clases de entrada se tienen que
   **quitar** al cerrar; si se quedan, la salida no pinta nada.
2. **El orden de los efectos importa.** Anclar y medir para el FLIP tienen
   que ir en el **mismo** efecto y en ese orden. Separados, el FLIP mide la
   ventana antes de que el anclaje la mueva y calcula contra una posición que
   deja de ser cierta.
3. **Montar con retraso rompe los efectos de layout.** Si un estado tipo
   `montado` hace que la ventana aparezca un render después de `abierto`, el
   efecto que la mide corre con la ref todavía en `null` y **nunca se vuelve
   a ejecutar**. Ese estado va en las dependencias.
4. **Las props que describen el modal no pueden derivarse de si está
   abierto.** Con un solo `tipo | null`, al cerrar se vuelven `null` de golpe
   el disparador y el anclaje, justo mientras corre la salida, y esta se
   encoge hacia el botón equivocado. Van en estados separados.

### Velo: la única decisión de gusto

Medida, la referencia usa `rgba(0, 0, 0, 0.1)` y **ningún** desenfoque
(`backdrop-filter: none` en el scrim, `filter: none` en el contenido de
atrás). Aquí va más oscuro y con desenfoque real, en `--m3-velo` y
`--m3-velo-desenfoque`. Es deliberado, no un descuido: con el velo de la
referencia el modal apenas se despega del fondo.

El desenfoque va como `backdrop-filter` en el velo, no como `filter` en el
contenido: difumina lo que queda debajo sin tocar el árbol del fondo, y el
modal —que es hijo del velo— queda nítido.

Los anchos (440 y 720) también son más generosos que los suyos (400 y 600).

**Trampa de medición, ampliada.** Con la ventana minimizada
(`document.visibilityState === 'hidden'`, `innerWidth === 0`) el navegador no
solo congela las animaciones: **devuelve estilos calculados rancios** de los
elementos que ya existían cuando cambian de clase. Un elemento recién
insertado —o un `cloneNode` del propio elemento— sí computa de cero. Si una
medida no cuadra con lo que dice el `className`, clona el nodo y mide el clon
antes de dar por hecho que hay un fallo.

## Selección: el control lleva puesto su valor — APROBADO

Medido en la app de tareas de la referencia (`/apps/tasks`), en los controles
"Estado" y "Tablero" y en el creador de tareas.

**El botón no tiene rótulo: el botón ES el valor.** Cerrado dice "Pendiente",
no "Estado: Pendiente". Al abrirse, la opción elegida aparece resaltada dentro
de la lista —en el sitio donde estaba el botón— y las demás salen alrededor.
El nombre del campo solo haría falta si la respuesta no estuviera a la vista,
y lo está. El icono es el que desambigua de qué va.

Un formulario así se lee de un vistazo porque no tiene ninguna fila
"rótulo + campo vacío": solo el campo de escritura libre se ve como campo, y
todo lo demás son pastillas que ya traen un valor por defecto válido.

    lista       flex columna, gap 4px
    opción      alto 48, padding 0 16, radio 24, 14px, fondo transparente
    :hover      fondo contenedor, color de acento
    .elegida    fondo secundario, radio 16 — salvo primera y última, que
                vuelven a 24 para que el bloque conserve forma de pastilla

Implementado en `shared/ui/SelectorDeOpciones.tsx`.

## Calendario — APROBADO

Medido de la misma app. La semana empieza en **domingo** (Do Lu Ma Mi Ju Vi Sa).

    rejilla     7 columnas, gap 2px, centrado
    rótulos     11px/500, color tenue, padding 4px 0
    día         cuadrado (aspect-ratio 1), 14px, radio 16
    hoy         fondo tenue, color de acento, peso 600
    elegido     fondo de acento, 20px, peso 800
    fuera       opacidad 0.4, no se pulsa
    bloqueado   opacidad 0.35, tachado

**La firma:** el número **crece** al elegirlo, de 14px/400 a 20px/800. Es el
mismo recurso del dock (la sección activa pasa de 24 a 28px). En esta casa la
selección se dice agrandando el texto; el color solo acompaña.

Las duraciones son distintas a propósito — el fondo responde al instante y el
tamaño se toma su tiempo, que es lo que hace que el número se infle en vez de
saltar:

    transition: background-color .125s, color .125s,
                font-size .2s ease-in-out, font-weight .2s ease-in-out

Está en `.dia-de-calendario` (`styles/index.css`) y no en clases de Tailwind
porque son cuatro propiedades con dos duraciones y dos curvas distintas.

Solo se dibujan las filas que hagan falta: un mes de cinco semanas no pinta
una sexta vacía, o el panel cambiaría de alto al pasar de mes.

Fechas como texto ISO de principio a fin. Construir un `Date` para volver a
texto es por donde se cuela el desfase de zona horaria: `new Date('2026-09-19')`
es medianoche UTC, que en Bogotá es el día 18.

Implementado en `shared/ui/Calendario.tsx` y `shared/ui/SelectorDeFecha.tsx`.

## Pendiente de aprobar

En revisión en `/_diseno`, todavía no consolidado aquí: tarjetas (contorno y
rellena), píldoras y botones, selector de vista, y estado vacío ilustrado.
