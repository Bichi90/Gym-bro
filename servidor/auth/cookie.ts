/**
 * Cookie de sesión: nombre, construcción y lectura.
 *
 * Vive aparte de `tokens.ts` por una razón concreta: el middleware corre en el
 * runtime Edge, donde `node:crypto` no existe, y solo necesita saber el nombre
 * de la cookie. Si esto estuviera junto al generador de tokens, importarlo
 * arrastraría `node:crypto` y el build fallaría.
 */

export const NOMBRE_COOKIE = 'gb_sesion'

export interface OpcionesCookie {
  maxEdadSeg: number
  seguro: boolean
}

/**
 * `SameSite=Lax` deja pasar la navegación normal desde un enlace del correo
 * pero corta el envío en peticiones de terceros, que es lo que protege de CSRF
 * sin necesidad de token aparte para peticiones GET.
 */
export function cabeceraCookieSesion(token: string, opciones: OpcionesCookie): string {
  const partes = [
    `${NOMBRE_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(opciones.maxEdadSeg))}`,
  ]
  if (opciones.seguro) partes.push('Secure')
  return partes.join('; ')
}

export function cabeceraCookieBorrada(seguro: boolean): string {
  const partes = [`${NOMBRE_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (seguro) partes.push('Secure')
  return partes.join('; ')
}

/** Extrae el token de la cabecera Cookie cruda. */
export function leerTokenDeCookies(cabecera: string | undefined): string | undefined {
  if (!cabecera) return undefined
  for (const trozo of cabecera.split(';')) {
    const separador = trozo.indexOf('=')
    if (separador === -1) continue
    if (trozo.slice(0, separador).trim() !== NOMBRE_COOKIE) continue
    const valor = trozo.slice(separador + 1).trim()
    return valor || undefined
  }
  return undefined
}
