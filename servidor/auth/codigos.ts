import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

/**
 * Códigos de segundo factor: seis dígitos, enviados por correo.
 *
 * Seis dígitos son solo un millón de combinaciones, así que la seguridad no
 * está en el código sino en el cerco que lo rodea: vida corta, un único uso,
 * pocos intentos y límite de reenvíos. Todo eso vive en `politica.ts`.
 *
 * Se guarda el HMAC-SHA256 con un secreto de servidor, no el código: quien
 * lea la base no puede usarlo, y al ser de entropía baja un hash sin clave
 * se rompería con una tabla precalculada de un millón de entradas.
 */

export const LONGITUD_CODIGO = 6

/** Genera un código de seis dígitos con aleatoriedad criptográfica y sin sesgo. */
export function generarCodigo(): string {
  return String(randomInt(0, 10 ** LONGITUD_CODIGO)).padStart(LONGITUD_CODIGO, '0')
}

export function hashearCodigo(codigo: string, secreto: string): string {
  if (!secreto) throw new Error('Falta el secreto del servidor para hashear el código')
  return createHmac('sha256', secreto).update(normalizar(codigo)).digest('hex')
}

/** Compara en tiempo constante el código que llega con el hash guardado. */
export function verificarCodigo(codigo: string, hashGuardado: string, secreto: string): boolean {
  if (!esFormatoValido(codigo)) return false
  let a: Buffer
  let b: Buffer
  try {
    a = Buffer.from(hashearCodigo(codigo, secreto), 'hex')
    b = Buffer.from(hashGuardado, 'hex')
  } catch {
    return false
  }
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}

/** Quita espacios y guiones, que es como la gente pega los códigos del correo. */
export function normalizar(codigo: string): string {
  return codigo.replace(/[\s-]/g, '')
}

export function esFormatoValido(codigo: string): boolean {
  return new RegExp(`^\\d{${LONGITUD_CODIGO}}$`).test(normalizar(codigo))
}

/** Presentación en el correo: `123 456` se lee y se teclea mejor que `123456`. */
export function formatearParaCorreo(codigo: string): string {
  return `${codigo.slice(0, 3)} ${codigo.slice(3)}`
}
