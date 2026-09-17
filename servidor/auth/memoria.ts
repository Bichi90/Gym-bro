import type { Contador } from './politica'
import type {
  CodigoGuardado,
  CorreoSaliente,
  EnviadorCorreo,
  Proposito,
  RepositorioAuth,
  Reloj,
  SesionGuardada,
  UsuarioAuth,
} from './puertos'
import type { Rol } from './validacion'

/**
 * Implementaciones en memoria de los puertos, para los tests.
 *
 * No son un atajo: permiten ejercitar reglas que contra una base de datos real
 * serían lentas o incómodas de montar, como agotar intentos o adelantar el
 * reloj once minutos para ver caducar un código.
 */

export class RepositorioMemoria implements RepositorioAuth {
  usuarios = new Map<string, UsuarioAuth>()
  codigos = new Map<string, CodigoGuardado>()
  sesiones = new Map<string, SesionGuardada>()
  contadores = new Map<string, Contador>()
  private secuencia = 0

  private id(prefijo: string): string {
    this.secuencia += 1
    return `${prefijo}-${this.secuencia}`
  }

  async buscarUsuarioPorEmail(email: string): Promise<UsuarioAuth | undefined> {
    for (const u of this.usuarios.values()) if (u.email === email) return { ...u }
    return undefined
  }

  async buscarUsuarioPorId(id: string): Promise<UsuarioAuth | undefined> {
    const u = this.usuarios.get(id)
    return u ? { ...u } : undefined
  }

  async crearUsuario(datos: {
    email: string
    nombre: string
    hashContrasena: string
    rol: Rol
  }): Promise<UsuarioAuth> {
    const usuario: UsuarioAuth = { id: this.id('usr'), emailVerificado: false, bloqueadoHasta: null, ...datos }
    this.usuarios.set(usuario.id, usuario)
    return { ...usuario }
  }

  async actualizarHashContrasena(usuarioId: string, hash: string): Promise<void> {
    const u = this.usuarios.get(usuarioId)
    if (u) u.hashContrasena = hash
  }

  async marcarEmailVerificado(usuarioId: string): Promise<void> {
    const u = this.usuarios.get(usuarioId)
    if (u) u.emailVerificado = true
  }

  async fijarBloqueo(usuarioId: string, hasta: Date | null): Promise<void> {
    const u = this.usuarios.get(usuarioId)
    if (u) u.bloqueadoHasta = hasta
  }

  async crearCodigo(datos: {
    usuarioId: string
    proposito: Proposito
    hashCodigo: string
    expiraEn: Date
    creadoEn: Date
  }): Promise<CodigoGuardado> {
    const codigo: CodigoGuardado = { id: this.id('cod'), intentos: 0, consumidoEn: null, ...datos }
    this.codigos.set(codigo.id, codigo)
    return { ...codigo }
  }

  async ultimoCodigoVigente(usuarioId: string, proposito: Proposito): Promise<CodigoGuardado | undefined> {
    const propios = [...this.codigos.values()]
      .filter((c) => c.usuarioId === usuarioId && c.proposito === proposito && !c.consumidoEn)
      .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime())
    const ultimo = propios.at(-1)
    return ultimo ? { ...ultimo } : undefined
  }

  async sumarIntentoCodigo(codigoId: string): Promise<void> {
    const c = this.codigos.get(codigoId)
    if (c) c.intentos += 1
  }

  async consumirCodigo(codigoId: string, ahora: Date): Promise<void> {
    const c = this.codigos.get(codigoId)
    if (c) c.consumidoEn = ahora
  }

  async codigosDesde(usuarioId: string, proposito: Proposito, desde: Date): Promise<CodigoGuardado[]> {
    return [...this.codigos.values()]
      .filter(
        (c) => c.usuarioId === usuarioId && c.proposito === proposito && c.creadoEn.getTime() >= desde.getTime(),
      )
      .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime())
      .map((c) => ({ ...c }))
  }

  async crearSesion(datos: {
    usuarioId: string
    hashToken: string
    expiraEn: Date
    agente?: string
    ip?: string
  }): Promise<SesionGuardada> {
    const sesion: SesionGuardada = {
      id: this.id('ses'),
      usuarioId: datos.usuarioId,
      expiraEn: datos.expiraEn,
      revocadaEn: null,
    }
    this.sesiones.set(datos.hashToken, sesion)
    return { ...sesion }
  }

  async buscarSesionPorHash(hashToken: string): Promise<SesionGuardada | undefined> {
    const s = this.sesiones.get(hashToken)
    return s ? { ...s } : undefined
  }

  async revocarSesion(hashToken: string, ahora: Date): Promise<void> {
    const s = this.sesiones.get(hashToken)
    if (s) s.revocadaEn = ahora
  }

  async revocarSesionesDe(usuarioId: string, ahora: Date): Promise<void> {
    for (const s of this.sesiones.values()) if (s.usuarioId === usuarioId) s.revocadaEn = ahora
  }

  async leerContador(clave: string): Promise<Contador | undefined> {
    const c = this.contadores.get(clave)
    return c ? { ...c } : undefined
  }

  async guardarContador(clave: string, contador: Contador): Promise<void> {
    this.contadores.set(clave, { ...contador })
  }
}

export class BuzonMemoria implements EnviadorCorreo {
  enviados: CorreoSaliente[] = []

  async enviar(correo: CorreoSaliente): Promise<void> {
    this.enviados.push(correo)
  }

  get ultimo(): CorreoSaliente | undefined {
    return this.enviados.at(-1)
  }

  /** Extrae el código de seis dígitos del cuerpo de texto del último correo. */
  codigoDelUltimo(): string | undefined {
    const cuerpo = this.ultimo?.texto ?? ''
    return /(\d{3})\s?(\d{3})/.exec(cuerpo)?.slice(1, 3).join('')
  }

  vaciar(): void {
    this.enviados = []
  }
}

/** Reloj manejable, para adelantar el tiempo sin esperarlo. */
export class RelojFalso implements Reloj {
  constructor(private momento: Date) {}

  ahora(): Date {
    return new Date(this.momento)
  }

  avanzarMs(ms: number): void {
    this.momento = new Date(this.momento.getTime() + ms)
  }

  avanzarMinutos(minutos: number): void {
    this.avanzarMs(minutos * 60_000)
  }
}
