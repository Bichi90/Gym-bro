/**
 * Lectura y validación de la configuración del entorno.
 *
 * Se valida al arrancar y no al usar cada variable: si falta la clave de
 * correo, conviene saberlo en el primer despliegue y no la primera vez que
 * alguien intenta iniciar sesión un domingo por la noche.
 *
 * Ningún mensaje de error incluye el valor de una variable, solo su nombre.
 */

export interface Entorno {
  databaseUrl: string
  authSecret: string
  resendApiKey: string
  /** Remitente de los correos, en formato `Nombre <buzon@dominio>` o solo la dirección. */
  correoRemitente: string
  /** URL pública sin barra final, para construir enlaces en los correos. */
  urlPublica: string
  esProduccion: boolean
}

export type Problema = { variable: string; motivo: string }

export type Resultado = { ok: true; entorno: Entorno } | { ok: false; problemas: Problema[] }

const LONGITUD_MINIMA_SECRETO = 32

function obligatoria(
  bruto: Record<string, string | undefined>,
  nombre: string,
  problemas: Problema[],
): string {
  const valor = bruto[nombre]?.trim()
  if (!valor) {
    problemas.push({ variable: nombre, motivo: 'falta o está vacía' })
    return ''
  }
  return valor
}

/** Extrae la dirección de `Nombre <buzon@dominio>` o devuelve la cadena tal cual. */
export function direccionDe(remitente: string): string {
  const conNombre = /<([^>]+)>\s*$/.exec(remitente.trim())
  return (conNombre?.[1] ?? remitente).trim()
}

/**
 * Valida sin lanzar, devolviendo todos los problemas a la vez: arreglar la
 * configuración de a un error por despliegue es una pérdida de tiempo.
 */
export function validarEntorno(
  bruto: Record<string, string | undefined>,
  esProduccion = bruto.NODE_ENV === 'production',
): Resultado {
  const problemas: Problema[] = []

  const databaseUrl = obligatoria(bruto, 'DATABASE_URL', problemas)
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    problemas.push({ variable: 'DATABASE_URL', motivo: 'debe empezar por postgres:// o postgresql://' })
  } else if (databaseUrl && esProduccion && !/sslmode=require/.test(databaseUrl)) {
    // Sin SSL las credenciales y los datos de salud viajarían en claro.
    problemas.push({ variable: 'DATABASE_URL', motivo: 'en producción debe incluir sslmode=require' })
  }

  const authSecret = obligatoria(bruto, 'AUTH_SECRET', problemas)
  if (authSecret && authSecret.length < LONGITUD_MINIMA_SECRETO) {
    problemas.push({
      variable: 'AUTH_SECRET',
      motivo: `necesita al menos ${LONGITUD_MINIMA_SECRETO} caracteres (generalo con: openssl rand -base64 32)`,
    })
  }

  const resendApiKey = obligatoria(bruto, 'RESEND_API_KEY', problemas)
  if (resendApiKey && !resendApiKey.startsWith('re_')) {
    problemas.push({ variable: 'RESEND_API_KEY', motivo: 'las claves de Resend empiezan por re_' })
  }

  const correoRemitente = obligatoria(bruto, 'CORREO_REMITENTE', problemas)
  if (correoRemitente) {
    const direccion = direccionDe(correoRemitente)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direccion)) {
      problemas.push({ variable: 'CORREO_REMITENTE', motivo: 'no contiene una dirección válida' })
    }
  }

  const urlBruta = obligatoria(bruto, 'URL_PUBLICA', problemas)
  let urlPublica = ''
  if (urlBruta) {
    try {
      const url = new URL(urlBruta)
      if (esProduccion && url.protocol !== 'https:') {
        problemas.push({ variable: 'URL_PUBLICA', motivo: 'en producción debe ser https' })
      }
      // Sin barra final, para poder concatenar rutas sin duplicarla.
      urlPublica = url.origin + url.pathname.replace(/\/$/, '')
    } catch {
      problemas.push({ variable: 'URL_PUBLICA', motivo: 'no es una URL válida' })
    }
  }

  if (problemas.length) return { ok: false, problemas }

  return {
    ok: true,
    entorno: { databaseUrl, authSecret, resendApiKey, correoRemitente, urlPublica, esProduccion },
  }
}

export function describirProblemas(problemas: Problema[]): string {
  const lineas = problemas.map((p) => `  · ${p.variable}: ${p.motivo}`)
  return `Configuración incompleta:\n${lineas.join('\n')}\n\nRevisá .env.example y las variables del proyecto en Vercel.`
}

let memoria: Entorno | null = null

/**
 * Entorno ya validado. Cachea el resultado porque la validación se repite en
 * cada invocación de función serverless y no cambia dentro del mismo proceso.
 */
export function entorno(bruto: Record<string, string | undefined> = process.env): Entorno {
  if (memoria) return memoria
  const resultado = validarEntorno(bruto)
  if (!resultado.ok) throw new Error(describirProblemas(resultado.problemas))
  memoria = resultado.entorno
  return memoria
}

/** Solo para tests: olvida el entorno cacheado. */
export function olvidarEntorno(): void {
  memoria = null
}
