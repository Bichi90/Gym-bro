import { useEffect, useState, type ComponentType } from 'react'
import { useAlmacen } from './estado/almacen'
import {
  GlifoMarca,
  IconoAjustes,
  IconoAntropometria,
  IconoEjercicios,
  IconoEntrenar,
  IconoObjetivo,
  IconoPanel,
  IconoProgreso,
  IconoRutina,
} from './componentes/iconos'
import { PaginaPanel } from './paginas/Panel'
import { PaginaAntropometria } from './paginas/Antropometria'
import { PaginaObjetivo } from './paginas/Objetivo'
import { PaginaRutina } from './paginas/Rutina'
import { PaginaEntrenar } from './paginas/Entrenar'
import { PaginaProgreso } from './paginas/Progreso'
import { PaginaEjercicios } from './paginas/Ejercicios'
import { PaginaAjustes } from './paginas/Ajustes'

const RUTAS = [
  { id: 'panel', etiqueta: 'Panel', Icono: IconoPanel },
  { id: 'entrenar', etiqueta: 'Entrenar', Icono: IconoEntrenar },
  { id: 'rutina', etiqueta: 'Rutina', Icono: IconoRutina },
  { id: 'progreso', etiqueta: 'Progreso', Icono: IconoProgreso },
  { id: 'antropometria', etiqueta: 'Medidas', Icono: IconoAntropometria },
  { id: 'objetivo', etiqueta: 'Objetivo', Icono: IconoObjetivo },
  { id: 'ejercicios', etiqueta: 'Ejercicios', Icono: IconoEjercicios },
  { id: 'ajustes', etiqueta: 'Ajustes', Icono: IconoAjustes },
] as const satisfies readonly { id: string; etiqueta: string; Icono: ComponentType<{ className?: string }> }[]

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
          <span className="glifo" aria-hidden>
            <GlifoMarca />
          </span>
          Gym Bro
          {estado.sesionActiva && <span className="etiqueta acento">En sesión</span>}
        </div>

        <nav className="nav" aria-label="Secciones">
          {RUTAS.map(({ id, etiqueta, Icono }) => (
            <button
              key={id}
              type="button"
              aria-current={ruta === id ? 'page' : undefined}
              onClick={() => navegar(id)}
            >
              <Icono />
              {etiqueta}
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

      <nav className="nav-inferior" aria-label="Secciones">
        {RUTAS.map(({ id, etiqueta, Icono }) => (
          <button
            key={id}
            type="button"
            aria-current={ruta === id ? 'page' : undefined}
            onClick={() => navegar(id)}
          >
            <Icono />
            {etiqueta}
          </button>
        ))}
      </nav>
    </div>
  )
}
