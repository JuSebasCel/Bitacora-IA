/*
  Genera las imágenes que se ven al compartir un enlace de Menti Vault
  (WhatsApp, Instagram, Slack, X…) y los iconos de pantalla de inicio.

      node scripts/imagenes-para-compartir.mjs

  Se dibujan como HTML y se fotografían con el Chromium de Playwright, que ya
  está instalado para las pruebas: así llevan las mismas fuentes de la app
  (Bricolage Grotesque y DM Sans) y el mismo dial del logo, sin mantener una
  copia a mano en un editor de imágenes. Los resultados se guardan en
  `public/` y se commitean: el despliegue no ejecuta esto.

  PNG y no SVG porque las vistas previas de enlaces de WhatsApp e Instagram
  no aceptan SVG.
*/
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const fuente = (ruta) => readFileSync(`${raiz}node_modules/${ruta}`).toString('base64')

const bricolage = fuente('@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2')
const dmSans = fuente('@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2')

function dial(tamano, color) {
  return `<svg viewBox="0 0 32 32" width="${tamano}" height="${tamano}">
    <defs><mask id="d"><rect width="32" height="32" rx="9" fill="white"/>
      <circle cx="16" cy="16" r="8.25" fill="none" stroke="black" stroke-width="2.75"/>
      <circle cx="16" cy="16" r="2.4" fill="black"/>
      <path d="M16 16 L20.6 11.4" stroke="black" stroke-width="2.75" stroke-linecap="round"/></mask></defs>
    <rect width="32" height="32" rx="9" fill="${color}" mask="url(#d)"/>
  </svg>`
}

const estilos = `
  @font-face { font-family: 'Bricolage'; src: url(data:font/woff2;base64,${bricolage}) format('woff2'); font-weight: 200 800; }
  @font-face { font-family: 'DM Sans'; src: url(data:font/woff2;base64,${dmSans}) format('woff2'); font-weight: 100 1000; }
  * { margin: 0; box-sizing: border-box; }
  body { background: #000; color: #fff; font-family: 'DM Sans', sans-serif; }
`

/*
  La tarjeta: negro puro con el acento en blanco, como la app. El logo y el
  nombre grandes a la izquierda, lo que hace en una frase debajo, y un
  resplandor tenue detrás del dial para que no quede plano en miniatura.
*/
const tarjeta = `<!doctype html><html><head><style>${estilos}
  body { width: 1200px; height: 630px; display: flex; flex-direction: column; justify-content: center;
         padding: 0 96px; gap: 36px; position: relative; overflow: hidden; }
  .halo { position: absolute; right: -140px; top: 50%; transform: translateY(-50%); width: 620px; height: 620px;
          border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.10), transparent 65%); }
  .fondo-dial { position: absolute; right: -70px; top: 50%; transform: translateY(-50%); opacity: 0.08; }
  .marca { display: flex; align-items: center; gap: 28px; }
  h1 { font-family: 'Bricolage'; font-weight: 700; font-size: 104px; letter-spacing: -3px; line-height: 1; }
  p { font-size: 38px; line-height: 1.35; color: #b8b8b8; max-width: 820px; }
  .pie { font-size: 26px; color: #6f6f6f; letter-spacing: 0.5px; }
</style></head><body>
  <div class="halo"></div>
  <div class="fondo-dial">${dial(460, '#fff')}</div>
  <div class="marca">${dial(112, '#fff')}<h1>Menti Vault</h1></div>
  <p>Convierte conferencias en fichas citables y memorias listas para entregar.</p>
  <div class="pie">menti.site</div>
</body></html>`

const icono = (tamano) => `<!doctype html><html><head><style>${estilos}
  body { width: ${tamano}px; height: ${tamano}px; display: grid; place-items: center; }
</style></head><body>${dial(Math.round(tamano * 0.7), '#fff')}</body></html>`

const navegador = await chromium.launch()

async function fotografiar(html, ancho, alto, destino) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } })
  await pagina.setContent(html)
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.screenshot({ path: `${raiz}public/${destino}` })
  await pagina.close()
  console.log(`public/${destino}`)
}

await fotografiar(tarjeta, 1200, 630, 'compartir.png')
await fotografiar(icono(180), 180, 180, 'apple-touch-icon.png')
await fotografiar(icono(512), 512, 512, 'icono-512.png')

await navegador.close()
