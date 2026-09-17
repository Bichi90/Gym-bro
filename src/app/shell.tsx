'use client'

import { useEffect, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAlmacen } from '../estado/almacen'
import { RUTAS, esRutaPublica, registrarNavegador, type RutaId } from '../lib/rutas'
import { BotonTema } from '../componentes/tema'
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
} from '../componentes/iconos'

const ICONOS: Record<RutaId, ComponentType<{ className?: string }>> = {
  panel: IconoPanel,
  entrenar: IconoEntrenar,
  rutina: IconoRutina,
  progreso: IconoProgreso,
  medidas: IconoAntropometria,
  objetivo: IconoObjetivo,
  ejercicios: IconoEjercicios,
  ajustes: IconoAjustes,
}

export function Shell({ children }: { children: ReactNode }) {
  const { estado } = useAlmacen()
  const ruta = usePathname()
  const router = useRouter()

  // Deja el `push` del router accesible a `navegar()`, que se usa desde
  // manejadores de eventos repartidos por las pantallas.
  useEffect(() => {
    registrarNavegador((href) => router.push(href))
    return () => registrarNavegador(null)
  }, [router])

  // Las pantallas de acceso se pintan solas: la navegación llevaría a
  // secciones que sin sesión no se pueden ver.
  if (esRutaPublica(ruta)) return <>{children}</>

  const activa = (href: string) => ruta === href || ruta.startsWith(href + '/')

  return (
    <div className="app">
      <header className="barra-superior">
        <Link href="/panel" className="marca" aria-label="Gym Bro, ir al panel">
          <span className="glifo" aria-hidden>
            <GlifoMarca />
          </span>
          Gym Bro
          {estado.sesionActiva && <span className="etiqueta acento">En sesión</span>}
        </Link>

        <nav className="nav" aria-label="Secciones">
          {RUTAS.map(({ id, etiqueta, href }) => {
            const Icono = ICONOS[id]
            return (
              <Link key={id} href={href} aria-current={activa(href) ? 'page' : undefined}>
                <Icono />
                {etiqueta}
              </Link>
            )
          })}
        </nav>

        <BotonTema />
      </header>

      <main className="contenido">{children}</main>

      <nav className="nav-inferior" aria-label="Secciones">
        {RUTAS.map(({ id, etiqueta, href }) => {
          const Icono = ICONOS[id]
          return (
            <Link key={id} href={href} aria-current={activa(href) ? 'page' : undefined}>
              <Icono />
              {etiqueta}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
