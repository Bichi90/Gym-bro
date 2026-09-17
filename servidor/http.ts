import { NextResponse } from 'next/server'
import { cabeceraCookieBorrada, cabeceraCookieSesion, leerTokenDeCookies } from './auth/tokens'

/**
 * Utilidades compartidas por los endpoints de acceso.
 *
 * Los errores internos nunca llegan al cliente con su mensaje original: un
 * fallo de base de datos puede contener nombres de tablas, la cadena de
 * conexión o datos de otro usuario. Se registra completo en el servidor y se
 * responde con algo genérico.
 */

export function json(datos: unknown, estado = 200, cookie?: string): NextResponse {
  const respuesta = NextResponse.json(datos, { status: estado })
  if (cookie) respuesta.headers.append('Set-Cookie', cookie)
  respuesta.headers.set('Cache-Control', 'no-store')
  return respuesta
}

export function conSesion(datos: unknown, token: string, maxEdadSeg: number): NextResponse {
  return json(datos, 200, cabeceraCookieSesion(token, { maxEdadSeg, seguro: esProduccion() }))
}

export function sinSesion(datos: unknown): NextResponse {
  return json(datos, 200, cabeceraCookieBorrada(esProduccion()))
}

export function esProduccion(): boolean {
  return process.env.NODE_ENV === 'production'
}

export async function cuerpo(peticion: Request): Promise<Record<string, unknown>> {
  try {
    const datos = await peticion.json()
    return datos && typeof datos === 'object' ? (datos as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

export function tokenDe(peticion: Request): string | undefined {
  return leerTokenDeCookies(peticion.headers.get('cookie') ?? undefined)
}

/**
 * IP del cliente. En Vercel la real viene en x-forwarded-for; se toma la
 * primera, que es la del cliente, y no la última, que es la del proxy.
 */
export function ipDe(peticion: Request): string | undefined {
  const reenviada = peticion.headers.get('x-forwarded-for')
  const primera = reenviada?.split(',')[0]?.trim()
  return primera || peticion.headers.get('x-real-ip') || undefined
}

export function agenteDe(peticion: Request): string | undefined {
  return peticion.headers.get('user-agent')?.slice(0, 200) || undefined
}

/** Envuelve un manejador para que ningún detalle interno se filtre al cliente. */
export async function protegido(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn()
  } catch (error) {
    console.error('[auth] fallo no controlado', error)
    return json({ error: 'No pudimos procesar la solicitud. Probá de nuevo en un momento.' }, 500)
  }
}
