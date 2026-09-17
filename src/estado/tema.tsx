'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  CLAVE_TEMA,
  COLOR_BARRA,
  TEMA_POR_DEFECTO,
  esPreferencia,
  resolverTema,
  type PreferenciaTema,
  type Tema,
} from '../lib/tema'

interface ContextoTema {
  preferencia: PreferenciaTema
  /** El tema que se está pintando ahora mismo. */
  tema: Tema
  cambiar(preferencia: PreferenciaTema): void
}

const Contexto = createContext<ContextoTema | null>(null)

const CONSULTA_CLARO = '(prefers-color-scheme: light)'

function prefiereClaro(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(CONSULTA_CLARO).matches
}

function leerPreferencia(): PreferenciaTema {
  try {
    const guardada = localStorage.getItem(CLAVE_TEMA)
    return esPreferencia(guardada) ? guardada : TEMA_POR_DEFECTO
  } catch {
    // Ventana privada o almacenamiento bloqueado: se sigue al sistema.
    return TEMA_POR_DEFECTO
  }
}

/** Pinta el tema y ajusta el color de la barra del navegador en el móvil. */
function aplicar(tema: Tema): void {
  document.documentElement.dataset.tema = tema
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = COLOR_BARRA[tema]
}

export function ProveedorTema({ children }: { children: ReactNode }) {
  // En el servidor no hay ni localStorage ni matchMedia, así que se arranca
  // con lo mismo que trae la hoja y se corrige al montar. El guión del <head>
  // ya dejó el tema correcto pintado: esto solo pone el estado de React al
  // día, no provoca ningún parpadeo.
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(TEMA_POR_DEFECTO)
  const [sistemaClaro, setSistemaClaro] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    setPreferencia(leerPreferencia())
    setSistemaClaro(prefiereClaro())
    setListo(true)
  }, [])

  // Si está en automático hay que seguir al sistema mientras la app está
  // abierta: alguien puede tener el teléfono en modo oscuro por horario.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const consulta = window.matchMedia(CONSULTA_CLARO)
    const alCambiar = (e: MediaQueryListEvent) => setSistemaClaro(e.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  const tema = resolverTema(preferencia, sistemaClaro)

  // Hasta no haber leído la preferencia de verdad no se toca el <html>: el
  // guión del <head> ya dejó el tema correcto, y escribir encima con el valor
  // provisional del primer render haría parpadear la pantalla.
  useEffect(() => {
    if (!listo) return
    aplicar(tema)
  }, [listo, tema])

  const cambiar = useCallback((nueva: PreferenciaTema) => {
    setPreferencia(nueva)
    try {
      localStorage.setItem(CLAVE_TEMA, nueva)
    } catch {
      // Sin almacenamiento el cambio vale para esta sesión y nada más.
    }
  }, [])

  const valor = useMemo(() => ({ preferencia, tema, cambiar }), [preferencia, tema, cambiar])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useTema(): ContextoTema {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useTema necesita estar dentro de ProveedorTema')
  return valor
}
