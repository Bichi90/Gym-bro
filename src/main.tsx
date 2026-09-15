import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ProveedorAlmacen } from './estado/almacen'
import './estilos.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('No se encontró el nodo #root')

createRoot(raiz).render(
  <StrictMode>
    <ProveedorAlmacen>
      <App />
    </ProveedorAlmacen>
  </StrictMode>,
)
