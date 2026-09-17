/**
 * Mapa de secciones. Vive aparte de los componentes para que lo puedan usar
 * tanto el shell (que pinta la navegación) como cualquier pantalla que quiera
 * mandar al usuario a otro sitio.
 */

export const RUTAS = [
  { id: 'panel', etiqueta: 'Panel', href: '/panel' },
  { id: 'entrenar', etiqueta: 'Entrenar', href: '/entrenar' },
  { id: 'rutina', etiqueta: 'Rutina', href: '/rutina' },
  { id: 'progreso', etiqueta: 'Progreso', href: '/progreso' },
  { id: 'medidas', etiqueta: 'Medidas', href: '/medidas' },
  { id: 'objetivo', etiqueta: 'Objetivo', href: '/objetivo' },
  { id: 'ejercicios', etiqueta: 'Ejercicios', href: '/ejercicios' },
  { id: 'ajustes', etiqueta: 'Ajustes', href: '/ajustes' },
] as const

export type RutaId = (typeof RUTAS)[number]['id']

export function hrefDe(id: RutaId): string {
  return RUTAS.find((r) => r.id === id)?.href ?? '/panel'
}

/**
 * Navegación imperativa desde cualquier punto de la app.
 *
 * El App Router de Next no expone una instancia global del router, así que el
 * shell registra su `push` al montarse. Si por lo que sea no hay ninguno
 * registrado (por ejemplo durante un render de servidor), se cae a una
 * navegación completa del navegador, que funciona igual aunque recargue.
 */
let empujar: ((href: string) => void) | null = null

export function registrarNavegador(fn: ((href: string) => void) | null): void {
  empujar = fn
}

export function navegar(id: RutaId): void {
  const href = hrefDe(id)
  if (empujar) empujar(href)
  else if (typeof window !== 'undefined') window.location.assign(href)
}

/**
 * Rutas que se pueden ver sin sesión. Las usan el middleware (para decidir la
 * redirección) y el shell (para pintar las pantallas de acceso sin la
 * navegación de la app, que ahí no tendría a dónde llevar).
 */
export const RUTAS_PUBLICAS = ['/entrar', '/crear-cuenta', '/codigo'] as const

export function esRutaPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

/** Destino tras entrar. Se rechaza cualquier cosa que no sea una ruta interna
 * para que un enlace preparado no pueda usar `?volver=` como redirección
 * abierta hacia otro dominio. */
export function destinoSeguro(volver: string | null | undefined): string {
  if (!volver) return '/panel'
  // `//otro.com` y `/\otro.com` los interpreta el navegador como absolutos.
  if (!volver.startsWith('/') || volver.startsWith('//') || volver.startsWith('/\\')) return '/panel'
  if (esRutaPublica(volver)) return '/panel'
  return volver
}
