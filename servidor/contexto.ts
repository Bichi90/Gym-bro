import type { Dependencias } from './auth/servicio'
import { EnviadorConsola, EnviadorResend } from './correo/resend'
import { RepositorioPostgres } from './db/repositorio'
import { entorno } from './entorno'

/**
 * Arma las dependencias del servicio de acceso a partir del entorno.
 *
 * Se construye una sola vez por proceso: en serverless eso significa una vez
 * por instancia caliente, y la validación del entorno falla temprano y con un
 * mensaje que nombra lo que falta.
 */

let cache: Dependencias | null = null

export function dependencias(): Dependencias {
  if (cache) return cache
  const env = entorno()
  cache = {
    repo: new RepositorioPostgres(),
    // Sin clave de Resend en desarrollo, el código sale por consola en vez de
    // romper el arranque: se puede probar el flujo entero sin cuenta de correo.
    correo: env.resendApiKey ? new EnviadorResend() : new EnviadorConsola(),
    secreto: env.authSecret,
  }
  return cache
}

/** Solo para tests. */
export function olvidarContexto(): void {
  cache = null
}
