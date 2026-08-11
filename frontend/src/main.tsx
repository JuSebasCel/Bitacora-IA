import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from '@/app/App'
import '@/styles/index.css'

const contenedor = document.getElementById('root')

if (!contenedor) {
  throw new Error('No se encontró el elemento raíz #root en el documento.')
}

createRoot(contenedor).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
