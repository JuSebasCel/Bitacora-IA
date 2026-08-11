import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
