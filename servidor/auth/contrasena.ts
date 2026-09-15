import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * Hashing de contraseñas con scrypt, que viene en Node y no necesita binarios
 * nativos. Los parámetros siguen la recomendación de OWASP (N=2^17, r=8, p=1).
 * Medido en este entorno cuesta entre 0,4 y 0,6 s por hash: es lento a
 * propósito, y solo se paga en registro y login, no en cada petición. Si en
 * producción resultara excesivo, bajar N a 2^16 se hace sin migrar nada,
 * porque cada hash lleva sus propios parámetros.
 *
 * El formato guardado incluye los parámetros, así que subirlos en el futuro no
 * invalida los hashes viejos: se reconocen por su propia cabecera.
 */

export const PARAMETROS = { N: 131072, r: 8, p: 1, longitudBytes: 32, longitudSal: 16 } as const

/** Coste máximo aceptado al verificar, para que un hash manipulado no agote la memoria. */
const N_MAXIMO = 1 << 20

function derivar(contrasena: string, sal: Buffer, N: number, r: number, p: number, longitud: number): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    // scrypt necesita `maxmem` explícito: el valor por defecto de Node se queda
    // corto para N grandes y lanza "Invalid scrypt params".
    const maxmem = 256 * N * r + 1024 * 1024
    scrypt(contrasena.normalize('NFKC'), sal, longitud, { N, r, p, maxmem }, (error, clave) => {
      if (error) rechazar(error)
      else resolver(clave)
    })
  })
}

export async function hashearContrasena(contrasena: string): Promise<string> {
  const { N, r, p, longitudBytes, longitudSal } = PARAMETROS
  const sal = randomBytes(longitudSal)
  const clave = await derivar(contrasena, sal, N, r, p, longitudBytes)
  return `scrypt$${N}$${r}$${p}$${sal.toString('base64')}$${clave.toString('base64')}`
}

/**
 * Verifica en tiempo constante. Devuelve false ante cualquier hash con formato
 * inválido en vez de lanzar, para que la ruta de login no distinga casos.
 */
export async function verificarContrasena(contrasena: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split('$')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false

  const N = Number(partes[1])
  const r = Number(partes[2])
  const p = Number(partes[3])
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false
  if (N < 1024 || N > N_MAXIMO || r < 1 || r > 32 || p < 1 || p > 16) return false
  // scrypt exige que N sea potencia de dos.
  if ((N & (N - 1)) !== 0) return false

  let sal: Buffer
  let esperado: Buffer
  try {
    sal = Buffer.from(partes[4]!, 'base64')
    esperado = Buffer.from(partes[5]!, 'base64')
  } catch {
    return false
  }
  if (sal.length === 0 || esperado.length === 0) return false

  try {
    const calculado = await derivar(contrasena, sal, N, r, p, esperado.length)
    return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
  } catch {
    return false
  }
}

/** true si el hash se generó con parámetros más flojos que los actuales y conviene rehacerlo al iniciar sesión. */
export function necesitaRehash(almacenado: string): boolean {
  const partes = almacenado.split('$')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return true
  return Number(partes[1]) < PARAMETROS.N || Number(partes[2]) < PARAMETROS.r
}
