import { generarCodigo, hashearCodigo, verificarCodigo } from './codigos'
import { hashearContrasena, necesitaRehash, verificarContrasena } from './contrasena'
import {
  POLITICA,
  calcularBloqueo,
  calcularExpiracionCodigo,
  estaBloqueado,
  evaluarCodigo,
  evaluarReenvio,
  incrementarContador,
  superaLimite,
} from './politica'
import type { EnviadorCorreo, Reloj, RepositorioAuth, UsuarioAuth } from './puertos'
import { RELOJ_SISTEMA } from './puertos'
import { DURACION_SESION_MS, generarToken, hashearToken } from './tokens'
import { MENSAJES_CONTRASENA, esEmailValido, esRolValido, limpiarNombre, normalizarEmail, validarContrasena } from './validacion'
import { correoSegundoFactor, correoSesionNueva, correoVerificarEmail } from '../correo/plantillas'

/**
 * Orquestación del acceso: registro, login, segundo factor y cierre de sesión.
 *
 * Dos principios recorren todo el archivo:
 *
 *  1. **No revelar qué correos existen.** Registro y login devuelven la misma
 *     respuesta haya o no una cuenta detrás. Si alguien intenta registrarse con
 *     un correo ya usado, el aviso le llega al dueño de la cuenta, no a quien
 *     lo intentó.
 *  2. **Tiempos parejos.** Cuando no hay usuario se calcula igualmente un hash
 *     descartable, para que la respuesta no tarde notoriamente menos y delate
 *     que el correo no está registrado.
 */

export interface Dependencias {
  repo: RepositorioAuth
  correo: EnviadorCorreo
  secreto: string
  reloj?: Reloj
}

export type ResultadoAcceso =
  | { estado: 'codigo_enviado' }
  | { estado: 'datos_invalidos'; mensajes: string[] }
  | { estado: 'demasiados_intentos'; esperarSeg: number }

export type ResultadoVerificacion =
  | { estado: 'ok'; token: string; expiraEn: Date; usuario: { id: string; email: string; nombre: string; rol: string } }
  | { estado: 'codigo_invalido' }
  | { estado: 'codigo_expirado' }
  | { estado: 'demasiados_intentos'; esperarSeg: number }

/** Hash de referencia para gastar el mismo tiempo cuando el usuario no existe. */
const HASH_SENUELO =
  'scrypt$131072$8$1$c2VudWVsb3NhbHRlYWRvMTIz$ZGVzY2FydGFibGVkZXNjYXJ0YWJsZWRlc2NhcnRhYmxlMDA='

async function gastarTiempoEquivalente(contrasena: string): Promise<void> {
  await verificarContrasena(contrasena, HASH_SENUELO)
}

function clave(...partes: string[]): string {
  return partes.join(':')
}

/** Comprueba y suma un contador por ventana; devuelve los segundos a esperar si se pasó. */
async function limitar(
  repo: RepositorioAuth,
  llave: string,
  maximo: number,
  ventanaMs: number,
  ahora: Date,
): Promise<number | undefined> {
  const actual = await repo.leerContador(llave)
  if (superaLimite(actual, ahora, maximo)) {
    return Math.ceil((actual!.ventanaFin.getTime() - ahora.getTime()) / 1000)
  }
  await repo.guardarContador(llave, incrementarContador(actual, ahora, ventanaMs))
  return undefined
}

async function emitirCodigo(
  { repo, correo, secreto, reloj = RELOJ_SISTEMA }: Dependencias,
  usuario: UsuarioAuth,
  proposito: 'segundo_factor' | 'verificar_email',
): Promise<{ ok: true } | { ok: false; esperarSeg: number }> {
  const ahora = reloj.ahora()

  const previos = await repo.codigosDesde(
    usuario.id,
    proposito,
    new Date(ahora.getTime() - POLITICA.ventanaReenviosMs),
  )
  const ultimo = previos.at(-1)
  const permiso = evaluarReenvio(
    {
      ultimoEnvioEn: ultimo?.creadoEn ?? null,
      enviosEnVentana: previos.length,
      ventanaFin: previos[0] ? new Date(previos[0].creadoEn.getTime() + POLITICA.ventanaReenviosMs) : null,
    },
    ahora,
  )
  if (!permiso.ok) return { ok: false, esperarSeg: permiso.esperarSeg }

  const codigo = generarCodigo()
  await repo.crearCodigo({
    usuarioId: usuario.id,
    proposito,
    hashCodigo: hashearCodigo(codigo, secreto),
    expiraEn: calcularExpiracionCodigo(ahora),
    creadoEn: ahora,
  })

  const mensaje =
    proposito === 'verificar_email'
      ? correoVerificarEmail(usuario.email, usuario.nombre, codigo)
      : correoSegundoFactor(usuario.email, usuario.nombre, codigo)
  await correo.enviar(mensaje)

  return { ok: true }
}

export async function registrar(
  deps: Dependencias,
  entrada: { email: string; contrasena: string; nombre?: string; rol?: string; ip?: string },
): Promise<ResultadoAcceso> {
  const { repo, reloj = RELOJ_SISTEMA } = deps
  const ahora = reloj.ahora()

  const mensajes: string[] = []
  const email = normalizarEmail(entrada.email ?? '')
  if (!esEmailValido(email)) mensajes.push('El correo no parece válido.')
  for (const problema of validarContrasena(entrada.contrasena ?? '', email)) {
    mensajes.push(MENSAJES_CONTRASENA[problema])
  }
  const rolBruto = entrada.rol ?? 'entrenado'
  if (!esRolValido(rolBruto)) mensajes.push('El rol no es válido.')
  // La segunda comprobación no es redundante: es la que deja a TypeScript
  // estrechar `rolBruto` al tipo Rol a partir de aquí, sin recurrir a un cast.
  if (mensajes.length || !esRolValido(rolBruto)) return { estado: 'datos_invalidos', mensajes }

  if (entrada.ip) {
    const espera = await limitar(
      repo,
      clave('ip', entrada.ip),
      POLITICA.peticionesMaximasPorIp,
      POLITICA.ventanaIpMs,
      ahora,
    )
    if (espera != null) return { estado: 'demasiados_intentos', esperarSeg: espera }
  }

  const existente = await repo.buscarUsuarioPorEmail(email)
  if (existente) {
    // El correo ya tiene cuenta. No se lo decimos a quien lo intentó: le
    // avisamos al dueño, que es el único con derecho a enterarse.
    await deps.correo.enviar(correoSesionNueva(existente.email, { fecha: ahora }))
    return { estado: 'codigo_enviado' }
  }

  const usuario = await repo.crearUsuario({
    email,
    nombre: limpiarNombre(entrada.nombre ?? ''),
    hashContrasena: await hashearContrasena(entrada.contrasena),
    rol: rolBruto,
  })

  const emitido = await emitirCodigo(deps, usuario, 'verificar_email')
  if (!emitido.ok) return { estado: 'demasiados_intentos', esperarSeg: emitido.esperarSeg }
  return { estado: 'codigo_enviado' }
}

export async function iniciarSesion(
  deps: Dependencias,
  entrada: { email: string; contrasena: string; ip?: string },
): Promise<ResultadoAcceso> {
  const { repo, reloj = RELOJ_SISTEMA } = deps
  const ahora = reloj.ahora()
  const email = normalizarEmail(entrada.email ?? '')

  if (entrada.ip) {
    const espera = await limitar(
      repo,
      clave('ip', entrada.ip),
      POLITICA.peticionesMaximasPorIp,
      POLITICA.ventanaIpMs,
      ahora,
    )
    if (espera != null) return { estado: 'demasiados_intentos', esperarSeg: espera }
  }

  const usuario = await repo.buscarUsuarioPorEmail(email)
  if (!usuario) {
    await gastarTiempoEquivalente(entrada.contrasena ?? '')
    return { estado: 'codigo_enviado' }
  }

  if (estaBloqueado(usuario.bloqueadoHasta, ahora)) {
    const esperarSeg = Math.ceil((usuario.bloqueadoHasta!.getTime() - ahora.getTime()) / 1000)
    return { estado: 'demasiados_intentos', esperarSeg }
  }

  const correcta = await verificarContrasena(entrada.contrasena ?? '', usuario.hashContrasena)
  if (!correcta) {
    const llave = clave('login', usuario.id)
    const contador = incrementarContador(await repo.leerContador(llave), ahora, POLITICA.ventanaLoginMs)
    await repo.guardarContador(llave, contador)
    const bloqueo = calcularBloqueo(contador, ahora)
    if (bloqueo) await repo.fijarBloqueo(usuario.id, bloqueo)
    // Misma respuesta que en el camino correcto: no se distingue una
    // contraseña equivocada de un correo inexistente.
    return { estado: 'codigo_enviado' }
  }

  // Los parámetros de scrypt pueden haberse endurecido desde el alta; este es
  // el único momento en que se tiene la contraseña en claro para rehacerlo.
  if (necesitaRehash(usuario.hashContrasena)) {
    await repo.actualizarHashContrasena(usuario.id, await hashearContrasena(entrada.contrasena))
  }

  const emitido = await emitirCodigo(deps, usuario, usuario.emailVerificado ? 'segundo_factor' : 'verificar_email')
  if (!emitido.ok) return { estado: 'demasiados_intentos', esperarSeg: emitido.esperarSeg }
  return { estado: 'codigo_enviado' }
}

export async function verificarSegundoFactor(
  deps: Dependencias,
  entrada: { email: string; codigo: string; agente?: string; ip?: string },
): Promise<ResultadoVerificacion> {
  const { repo, secreto, reloj = RELOJ_SISTEMA } = deps
  const ahora = reloj.ahora()
  const email = normalizarEmail(entrada.email ?? '')

  if (entrada.ip) {
    const espera = await limitar(
      repo,
      clave('ip', entrada.ip),
      POLITICA.peticionesMaximasPorIp,
      POLITICA.ventanaIpMs,
      ahora,
    )
    if (espera != null) return { estado: 'demasiados_intentos', esperarSeg: espera }
  }

  const usuario = await repo.buscarUsuarioPorEmail(email)
  if (!usuario) return { estado: 'codigo_invalido' }

  const proposito = usuario.emailVerificado ? 'segundo_factor' : 'verificar_email'
  const guardado = await repo.ultimoCodigoVigente(usuario.id, proposito)

  const evaluacion = evaluarCodigo(guardado, ahora)
  if (!evaluacion.ok) {
    if (evaluacion.motivo === 'expirado') return { estado: 'codigo_expirado' }
    if (evaluacion.motivo === 'demasiados_intentos') {
      return { estado: 'demasiados_intentos', esperarSeg: Math.ceil(POLITICA.vidaCodigoMs / 1000) }
    }
    return { estado: 'codigo_invalido' }
  }

  if (!verificarCodigo(entrada.codigo ?? '', guardado!.hashCodigo, secreto)) {
    await repo.sumarIntentoCodigo(guardado!.id)
    return { estado: 'codigo_invalido' }
  }

  await repo.consumirCodigo(guardado!.id, ahora)
  if (!usuario.emailVerificado) await repo.marcarEmailVerificado(usuario.id)
  await repo.fijarBloqueo(usuario.id, null)

  const token = generarToken()
  const expiraEn = new Date(ahora.getTime() + DURACION_SESION_MS)
  await repo.crearSesion({
    usuarioId: usuario.id,
    hashToken: hashearToken(token),
    expiraEn,
    ...(entrada.agente ? { agente: entrada.agente } : {}),
    ...(entrada.ip ? { ip: entrada.ip } : {}),
  })

  return {
    estado: 'ok',
    token,
    expiraEn,
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
  }
}

export async function cerrarSesion(deps: Dependencias, token: string | undefined): Promise<void> {
  if (!token) return
  const { repo, reloj = RELOJ_SISTEMA } = deps
  await repo.revocarSesion(hashearToken(token), reloj.ahora())
}

export interface SesionActiva {
  usuario: UsuarioAuth
  expiraEn: Date
}

/** Resuelve el token de la cookie a un usuario, o undefined si no vale. */
export async function sesionDesdeToken(
  deps: Dependencias,
  token: string | undefined,
): Promise<SesionActiva | undefined> {
  if (!token) return undefined
  const { repo, reloj = RELOJ_SISTEMA } = deps
  const ahora = reloj.ahora()

  const sesion = await repo.buscarSesionPorHash(hashearToken(token))
  if (!sesion) return undefined
  if (sesion.revocadaEn) return undefined
  if (sesion.expiraEn.getTime() <= ahora.getTime()) return undefined

  const usuario = await repo.buscarUsuarioPorId(sesion.usuarioId)
  if (!usuario) return undefined

  return { usuario, expiraEn: sesion.expiraEn }
}
