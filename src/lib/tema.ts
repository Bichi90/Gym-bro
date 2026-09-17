/**
 * Tema visual: día (arena) y noche (grafito).
 *
 * La preferencia se guarda aparte del estado de la app, en su propia clave de
 * localStorage. No es un capricho: el tema tiene que aplicarse antes del
 * primer pintado, y para eso hay un script mínimo en el `<head>` que no puede
 * permitirse leer y parsear el JSON entero del estado.
 */

export type Tema = 'dia' | 'noche'

/** Lo que elige la persona. `auto` sigue al sistema operativo. */
export type PreferenciaTema = 'auto' | Tema

export const CLAVE_TEMA = 'gym-bro:tema'

export const TEMA_POR_DEFECTO: PreferenciaTema = 'auto'

export function esPreferencia(valor: unknown): valor is PreferenciaTema {
  return valor === 'auto' || valor === 'dia' || valor === 'noche'
}

export function esTema(valor: unknown): valor is Tema {
  return valor === 'dia' || valor === 'noche'
}

/** Resuelve la preferencia a un tema concreto, que es lo que pinta la hoja. */
export function resolverTema(preferencia: PreferenciaTema, prefiereClaro: boolean): Tema {
  if (preferencia === 'dia' || preferencia === 'noche') return preferencia
  return prefiereClaro ? 'dia' : 'noche'
}

/**
 * Color de la barra del navegador en el móvil. Tiene que coincidir con
 * `--fondo` de cada tema o queda una franja de otro color arriba.
 */
export const COLOR_BARRA: Record<Tema, string> = {
  dia: '#f2ebdd',
  noche: '#17161a',
}

export const ETIQUETA_TEMA: Record<PreferenciaTema, string> = {
  auto: 'Automático',
  dia: 'Día',
  noche: 'Noche',
}

/**
 * Script que corre en el `<head>`, antes de que se pinte nada, para que no
 * haya un parpadeo del tema equivocado. Va como texto porque se inserta en el
 * HTML del servidor: no puede depender de nada del bundle.
 *
 * Si falla (localStorage bloqueado en una ventana privada, por ejemplo), no
 * hace nada y queda el tema noche, que es el que trae la hoja por defecto.
 */
export const GUION_TEMA_INICIAL = `try{var p=localStorage.getItem('${CLAVE_TEMA}');if(p!=='dia'&&p!=='noche'){p=window.matchMedia('(prefers-color-scheme: light)').matches?'dia':'noche'}document.documentElement.dataset.tema=p}catch(e){}`
