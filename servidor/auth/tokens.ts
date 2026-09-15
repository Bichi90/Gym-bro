import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Tokens de sesión opacos. El token viaja en una cookie httpOnly y en la base
 * solo queda su SHA-256: una filtración de la tabla no permite suplantar a
 * nadie. No se usa JWT a propósito — un token opaco se revoca borrando
 * una fila, y aquí revocar importa más que ahorrarse una consulta.
 */

export const BYTES_TOKEN = 32
export const NOMBRE_COOKIE = 'gb_sesion'

/** Duración por defecto de una sesión: 30 días. */
export const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000

export function generarToken(): string {
  return randomBytes(BYTES_TOKEN).toString('base64url')
}

/** SHA-256 basta: el token ya tiene 256 bits de entropía, no hay nada que forzar. */
export function hashearToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function compararHashes(a: string, b: string): boolean {
  let ba: Buffer
  let bb: Buffer
  try {
    ba = Buffer.from(a, 'hex')
    bb = Buffer.from(b, 'hex')
  } catch {
    return false
  }
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb)
}

export interface OpcionesCookie {
  maxEdadSeg: number
  seguro: boolean
}

/**
 * Cookie de sesión. `SameSite=Lax` deja pasar la navegación normal desde un
 * enlace del correo pero corta el envío en peticiones de terceros, que es lo
 * que protege de CSRF sin necesidad de token aparte para peticiones GET.
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
