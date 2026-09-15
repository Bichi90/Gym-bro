import { useEffect, useState } from 'react'
import { useAlmacen } from './estado/almacen'
import { PaginaPanel } from './paginas/Panel'
import { PaginaAntropometria } from './paginas/Antropometria'
import { PaginaObjetivo } from './paginas/Objetivo'
import { PaginaRutina } from './paginas/Rutina'
import { PaginaEntrenar } from './paginas/Entrenar'
import { PaginaProgreso } from './paginas/Progreso'
import { PaginaEjercicios } from './paginas/Ejercicios'
import { PaginaAjustes } from './paginas/Ajustes'

const RUTAS = [
  { id: 'panel', etiqueta: 'Panel' },
  { id: 'entrenar', etiqueta: 'Entrenar' },
  { id: 'rutina', etiqueta: 'Rutina' },
  { id: 'progreso', etiqueta: 'Progreso' },
  { id: 'antropometria', etiqueta: 'Antropometría' },
  { id: 'objetivo', etiqueta: 'Objetivo' },
  { id: 'ejercicios', etiqueta: 'Ejercicios' },
  { id: 'ajustes', etiqueta: 'Ajustes' },
] as const

export type RutaId = (typeof RUTAS)[number]['id']

function rutaDesdeHash(): RutaId {
  const bruto = window.location.hash.replace(/^#\/?/, '')
  return (RUTAS.find((r) => r.id === bruto)?.id ?? 'panel') as RutaId
}

export function navegar(id: RutaId): void {
  window.location.hash = `#/${id}`
}

export function App() {
  const [ruta, setRuta] = useState<RutaId>(rutaDesdeHash)
  const { estado } = useAlmacen()

  useEffect(() => {
    const alCambiar = () => setRuta(rutaDesdeHash())
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [ruta])

  return (
    <div className="app">
      <header className="barra-superior">
        <div className="marca">
          <span className="punto" aria-hidden />
          Gym Bro
          {estado.sesionActiva && (
            <span className="etiqueta acento" style={{ marginLeft: 8 }}>
              Sesión en curso
            </span>
          )}
        </div>
        <nav className="nav" aria-label="Secciones">
          {RUTAS.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-current={ruta === r.id ? 'page' : undefined}
              onClick={() => navegar(r.id)}
            >
              {r.etiqueta}
            </button>
          ))}
        </nav>
      </header>

      <main className="contenido">
        {ruta === 'panel' && <PaginaPanel />}
        {ruta === 'entrenar' && <PaginaEntrenar />}
        {ruta === 'rutina' && <PaginaRutina />}
        {ruta === 'progreso' && <PaginaProgreso />}
        {ruta === 'antropometria' && <PaginaAntropometria />}
        {ruta === 'objetivo' && <PaginaObjetivo />}
        {ruta === 'ejercicios' && <PaginaEjercicios />}
        {ruta === 'ajustes' && <PaginaAjustes />}
      </main>
    </div>
  )
}
