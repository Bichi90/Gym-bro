import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Tokens de sesión opacos. El token viaja en una cookie httpOnly y en la base
 * solo queda su SHA-256: una filtración de la tabla no permite suplantar a
 * nadie. No se usa JWT a propósito — un token opaco se revoca borrando
 * una fila, y aquí revocar importa más que ahorrarse una consulta.
 *
 * Lo relativo a la cookie está en `cookie.ts`, que no toca `node:crypto` y por
 * eso lo puede importar el middleware.
 */

export { NOMBRE_COOKIE, cabeceraCookieBorrada, cabeceraCookieSesion, leerTokenDeCookies } from './cookie'
export type { OpcionesCookie } from './cookie'

export const BYTES_TOKEN = 32

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
