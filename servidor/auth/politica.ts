/**
 * Las reglas que hacen seguro un código de seis dígitos: cuánto vive, cuántos
 * intentos admite, cada cuánto se puede reenviar y cuándo se bloquea la cuenta.
 *
 * Todo son funciones puras sobre estado que llega de la base, para poder
 * probarlas sin tocar Postgres ni el reloj del sistema.
 */

export const POLITICA = {
  /** Vida del código de segundo factor. */
  vidaCodigoMs: 10 * 60 * 1000,
  /** Intentos fallidos antes de invalidar el código. */
  intentosMaximosCodigo: 5,
  /** Espera mínima entre reenvíos del mismo código. */
  esperaReenvioMs: 60 * 1000,
  /** Códigos que se pueden pedir dentro de la ventana. */
  reenviosMaximos: 5,
  ventanaReenviosMs: 60 * 60 * 1000,
  /** Intentos de login fallidos por cuenta antes de bloquear. */
  intentosMaximosLogin: 10,
  ventanaLoginMs: 15 * 60 * 1000,
  bloqueoLoginMs: 15 * 60 * 1000,
  /** Peticiones de autenticación por IP dentro de la ventana. */
  peticionesMaximasPorIp: 60,
  ventanaIpMs: 15 * 60 * 1000,
} as const

export interface EstadoCodigo {
  expiraEn: Date
  intentos: number
  consumidoEn?: Date | null
}

export type MotivoRechazo =
  | 'expirado'
  | 'consumido'
  | 'demasiados_intentos'
  | 'formato'
  | 'incorrecto'
  | 'inexistente'

export type ResultadoCodigo = { ok: true } | { ok: false; motivo: MotivoRechazo }

/**
 * Decide si un código puede siquiera intentarse, antes de comparar nada.
 * Separado de la comparación para no gastar HMAC en códigos ya muertos.
 */
export function evaluarCodigo(estado: EstadoCodigo | undefined, ahora: Date): ResultadoCodigo {
  if (!estado) return { ok: false, motivo: 'inexistente' }
  if (estado.consumidoEn) return { ok: false, motivo: 'consumido' }
  if (estado.intentos >= POLITICA.intentosMaximosCodigo) return { ok: false, motivo: 'demasiados_intentos' }
  if (estado.expiraEn.getTime() <= ahora.getTime()) return { ok: false, motivo: 'expirado' }
  return { ok: true }
}

export function calcularExpiracionCodigo(ahora: Date): Date {
  return new Date(ahora.getTime() + POLITICA.vidaCodigoMs)
}

export interface EstadoReenvio {
  ultimoEnvioEn?: Date | null
  enviosEnVentana: number
  ventanaFin?: Date | null
}

export type ResultadoReenvio = { ok: true } | { ok: false; motivo: 'demasiado_pronto' | 'limite_ventana'; esperarSeg: number }

/** Controla la frecuencia con la que se puede pedir un código nuevo. */
export function evaluarReenvio(estado: EstadoReenvio, ahora: Date): ResultadoReenvio {
  if (estado.ultimoEnvioEn) {
    const transcurrido = ahora.getTime() - estado.ultimoEnvioEn.getTime()
    if (transcurrido < POLITICA.esperaReenvioMs) {
      return {
        ok: false,
        motivo: 'demasiado_pronto',
        esperarSeg: Math.ceil((POLITICA.esperaReenvioMs - transcurrido) / 1000),
      }
    }
  }
  const ventanaViva = estado.ventanaFin != null && estado.ventanaFin.getTime() > ahora.getTime()
  if (ventanaViva && estado.enviosEnVentana >= POLITICA.reenviosMaximos) {
    return {
      ok: false,
      motivo: 'limite_ventana',
      esperarSeg: Math.ceil((estado.ventanaFin!.getTime() - ahora.getTime()) / 1000),
    }
  }
  return { ok: true }
}

export interface Contador {
  conteo: number
  ventanaFin: Date
}

/** Incrementa un contador por ventana, reiniciándolo si la ventana ya venció. */
export function incrementarContador(actual: Contador | undefined, ahora: Date, ventanaMs: number): Contador {
  if (!actual || actual.ventanaFin.getTime() <= ahora.getTime()) {
    return { conteo: 1, ventanaFin: new Date(ahora.getTime() + ventanaMs) }
  }
  return { conteo: actual.conteo + 1, ventanaFin: actual.ventanaFin }
}

export function superaLimite(contador: Contador | undefined, ahora: Date, maximo: number): boolean {
  if (!contador) return false
  if (contador.ventanaFin.getTime() <= ahora.getTime()) return false
  return contador.conteo >= maximo
}

/** Momento hasta el que bloquear una cuenta tras agotar los intentos de login. */
export function calcularBloqueo(contador: Contador, ahora: Date): Date | undefined {
  if (!superaLimite(contador, ahora, POLITICA.intentosMaximosLogin)) return undefined
  return new Date(ahora.getTime() + POLITICA.bloqueoLoginMs)
}

export function estaBloqueado(bloqueadoHasta: Date | null | undefined, ahora: Date): boolean {
  return bloqueadoHasta != null && bloqueadoHasta.getTime() > ahora.getTime()
}
