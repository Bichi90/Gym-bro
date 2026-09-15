import type { Contador } from './politica'
import type { Rol } from './validacion'

/**
 * Lo que el servicio de autenticación necesita del mundo exterior, expresado
 * como interfaces.
 *
 * El servicio no sabe si detrás hay Postgres o un mapa en memoria, ni si el
 * correo lo manda Resend o una función que anota en un array. Eso permite
 * probar todas las reglas —bloqueos, reenvíos, códigos caducados— sin levantar
 * una base de datos, que es donde esas reglas suelen quedar sin cubrir.
 */

export type Proposito = 'segundo_factor' | 'verificar_email' | 'restablecer_contrasena'

export interface UsuarioAuth {
  id: string
  email: string
  nombre: string
  hashContrasena: string
  rol: Rol
  emailVerificado: boolean
  bloqueadoHasta?: Date | null
}

export interface CodigoGuardado {
  id: string
  usuarioId: string
  proposito: Proposito
  hashCodigo: string
  expiraEn: Date
  intentos: number
  consumidoEn?: Date | null
  creadoEn: Date
}

export interface SesionGuardada {
  id: string
  usuarioId: string
  expiraEn: Date
  revocadaEn?: Date | null
}

export interface RepositorioAuth {
  buscarUsuarioPorEmail(email: string): Promise<UsuarioAuth | undefined>
  buscarUsuarioPorId(id: string): Promise<UsuarioAuth | undefined>
  crearUsuario(datos: {
    email: string
    nombre: string
    hashContrasena: string
    rol: Rol
  }): Promise<UsuarioAuth>
  actualizarHashContrasena(usuarioId: string, hash: string): Promise<void>
  marcarEmailVerificado(usuarioId: string): Promise<void>
  fijarBloqueo(usuarioId: string, hasta: Date | null): Promise<void>

  crearCodigo(datos: {
    usuarioId: string
    proposito: Proposito
    hashCodigo: string
    expiraEn: Date
    creadoEn: Date
  }): Promise<CodigoGuardado>
  ultimoCodigoVigente(usuarioId: string, proposito: Proposito): Promise<CodigoGuardado | undefined>
  sumarIntentoCodigo(codigoId: string): Promise<void>
  consumirCodigo(codigoId: string, ahora: Date): Promise<void>
  /** Códigos creados desde `desde`, para controlar la frecuencia de reenvío. */
  codigosDesde(usuarioId: string, proposito: Proposito, desde: Date): Promise<CodigoGuardado[]>

  crearSesion(datos: {
    usuarioId: string
    hashToken: string
    expiraEn: Date
    agente?: string
    ip?: string
  }): Promise<SesionGuardada>
  buscarSesionPorHash(hashToken: string): Promise<SesionGuardada | undefined>
  revocarSesion(hashToken: string, ahora: Date): Promise<void>
  revocarSesionesDe(usuarioId: string, ahora: Date): Promise<void>

  leerContador(clave: string): Promise<Contador | undefined>
  guardarContador(clave: string, contador: Contador): Promise<void>
}

export interface CorreoSaliente {
  para: string
  asunto: string
  html: string
  texto: string
}

export interface EnviadorCorreo {
  enviar(correo: CorreoSaliente): Promise<void>
}

/** Reloj inyectable: sin esto, probar caducidades obliga a esperar de verdad. */
export interface Reloj {
  ahora(): Date
}

export const RELOJ_SISTEMA: Reloj = { ahora: () => new Date() }
