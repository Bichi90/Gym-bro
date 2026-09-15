/** Validación y normalización de las entradas de registro y acceso. */

export type Rol = 'entrenado' | 'entrenador'

/**
 * Normaliza un correo para poder compararlo y guardarlo de forma estable.
 * Se recorta y se pasa a minúsculas; no se tocan los puntos ni los `+` de la
 * parte local, porque eso es cosa de cada proveedor y descartarlos rompería
 * direcciones legítimas.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Comprobación deliberadamente sencilla: algo@algo.tld sin espacios. La
 * validación real de un correo es que llegue el código, no una expresión
 * regular elaborada.
 */
export function esEmailValido(email: string): boolean {
  const e = normalizarEmail(email)
  if (e.length < 6 || e.length > 254) return false
  if (/\s/.test(e)) return false
  const partes = e.split('@')
  if (partes.length !== 2) return false
  const [local, dominio] = partes as [string, string]
  if (!local || local.length > 64) return false
  if (!dominio.includes('.') || dominio.startsWith('.') || dominio.endsWith('.')) return false
  if (dominio.includes('..')) return false
  return /^[^@]+$/.test(local)
}

export const LONGITUD_MINIMA_CONTRASENA = 10
export const LONGITUD_MAXIMA_CONTRASENA = 200

export type ProblemaContrasena = 'corta' | 'larga' | 'solo_espacios' | 'demasiado_comun' | 'contiene_email'

/**
 * Se prioriza la longitud sobre las reglas de composición: obligar a mayúsculas
 * y símbolos produce contraseñas peores y más olvidadas. Diez caracteres como
 * mínimo, y fuera las cuatro o cinco sospechosas habituales.
 */
const COMUNES = new Set([
  'contrasena',
  'contraseña',
  'password',
  '1234567890',
  'qwertyuiop',
  'gymbro1234',
  'iloveyou11',
  'administrador',
])

export function validarContrasena(contrasena: string, email?: string): ProblemaContrasena[] {
  const problemas: ProblemaContrasena[] = []
  if (contrasena.trim().length === 0) {
    problemas.push('solo_espacios')
    return problemas
  }
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) problemas.push('corta')
  if (contrasena.length > LONGITUD_MAXIMA_CONTRASENA) problemas.push('larga')

  const normalizada = contrasena.toLowerCase()
  if (COMUNES.has(normalizada)) problemas.push('demasiado_comun')

  if (email) {
    const local = normalizarEmail(email).split('@')[0] ?? ''
    if (local.length >= 4 && normalizada.includes(local)) problemas.push('contiene_email')
  }
  return problemas
}

export const MENSAJES_CONTRASENA: Record<ProblemaContrasena, string> = {
  corta: `La contraseña necesita al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`,
  larga: `La contraseña no puede pasar de ${LONGITUD_MAXIMA_CONTRASENA} caracteres.`,
  solo_espacios: 'La contraseña no puede estar vacía.',
  demasiado_comun: 'Esa contraseña es demasiado común: elegí otra.',
  contiene_email: 'La contraseña no debería contener tu dirección de correo.',
}

export function esRolValido(valor: unknown): valor is Rol {
  return valor === 'entrenado' || valor === 'entrenador'
}

export function limpiarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').slice(0, 80)
}
