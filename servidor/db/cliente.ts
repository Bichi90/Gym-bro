import { neon } from '@neondatabase/serverless'
import { entorno } from '../entorno'

/**
 * Acceso a Postgres desde funciones serverless.
 *
 * Se usa el driver HTTP de Neon en vez de una conexión TCP con pool: cada
 * invocación es un proceso efímero, y un pool por invocación agota el límite de
 * conexiones en cuanto hay algo de tráfico. El driver HTTP no mantiene estado
 * entre llamadas, así que ese problema no existe.
 *
 * `sql` es una etiqueta de plantilla que parametriza: `sql\`... ${valor}\`` NO
 * interpola el valor en el texto de la consulta, lo manda como parámetro. Por
 * eso no hay riesgo de inyección mientras no se construya SQL concatenando.
 */

type Consulta = ReturnType<typeof neon>

let cache: Consulta | null = null

export function sql(): Consulta {
  if (!cache) cache = neon(entorno().databaseUrl)
  return cache
}

/** Solo para tests: olvida el cliente cacheado. */
export function olvidarCliente(): void {
  cache = null
}

/**
 * Convierte a Date lo que Postgres devuelve como timestamp. El driver ya suele
 * dar Date, pero según el tipo de columna puede llegar texto; esto lo normaliza
 * en un solo sitio en vez de en cada consulta.
 */
export function aFecha(valor: unknown): Date | undefined {
  if (valor == null) return undefined
  if (valor instanceof Date) return valor
  if (typeof valor === 'string' || typeof valor === 'number') {
    const d = new Date(valor)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

export function aFechaObligatoria(valor: unknown, campo: string): Date {
  const d = aFecha(valor)
  if (!d) throw new Error(`Se esperaba una fecha en ${campo} y llegó ${typeof valor}`)
  return d
}
