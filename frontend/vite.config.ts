import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  /*
    `docx-templates` (F4, generación de vistas previas de .docx) usa el
    global `Buffer` de Node internamente al construir el XML de salida.
    `nodePolyfills` inyecta ese global (y `process`, por si alguna
    dependencia transitiva también lo espera) solo para el bundle del
    cliente — dev y build, nunca en pruebas (`process.env.VITEST`): Vitest ya
    corre sobre Node real, donde esos globales existen de forma nativa, y el
    polyfill llegaba a interceptar módulos propios de Node como `node:url`
    (usado por las pruebas para resolver rutas de archivos de ejemplo),
    rompiendo su resolución con un shim pensado solo para el navegador.
  */
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.VITEST ? [] : [nodePolyfills({ globals: { Buffer: true, process: true, global: true } })]),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
    /*
      Los cinco segundos que trae Vitest por defecto se quedaron cortos al pasar
      la suite de 129 a 352 pruebas. Las de acceso y registro escriben en los
      campos tecla a tecla y calculan de verdad un resumen SHA-256 con
      `crypto.subtle`, así que con varios archivos corriendo en paralelo rozan
      el límite: aisladas pasan siempre, y en la suite completa caían unas u
      otras según la corrida.

      El fallo era de tiempo agotado, nunca de aserción. Subir el margen no
      esconde un defecto de comportamiento; el día que una de estas pruebas
      tarde quince segundos, eso sí será una señal que valga la pena mirar.
    */
    testTimeout: 15_000,
  },
})
