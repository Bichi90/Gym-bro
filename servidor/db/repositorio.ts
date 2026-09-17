import type { Contador } from '../auth/politica'
import type {
  CodigoGuardado,
  Proposito,
  RepositorioAuth,
  SesionGuardada,
  UsuarioAuth,
} from '../auth/puertos'
import type { Rol } from '../auth/validacion'
import { aFecha, aFechaObligatoria, sql } from './cliente'

/**
 * Implementación de RepositorioAuth sobre Postgres.
 *
 * Es la única capa que sabe SQL. La lógica de acceso vive en
 * `servidor/auth/servicio.ts` y se prueba contra `RepositorioMemoria`; aquí
 * solo se traducen filas a objetos y viceversa.
 *
 * Todas las consultas usan la etiqueta `sql` con parámetros: nada de concatenar
 * texto.
 */

type Fila = Record<string, unknown>

function aUsuario(f: Fila): UsuarioAuth {
  return {
    id: String(f.id),
    email: String(f.email),
    nombre: String(f.nombre ?? ''),
    hashContrasena: String(f.hash_contrasena),
    rol: String(f.rol) as Rol,
    emailVerificado: Boolean(f.email_verificado),
    bloqueadoHasta: aFecha(f.bloqueado_hasta) ?? null,
  }
}

function aCodigo(f: Fila): CodigoGuardado {
  return {
    id: String(f.id),
    usuarioId: String(f.usuario_id),
    proposito: String(f.proposito) as Proposito,
    hashCodigo: String(f.hash_codigo),
    expiraEn: aFechaObligatoria(f.expira_en, 'expira_en'),
    intentos: Number(f.intentos ?? 0),
    consumidoEn: aFecha(f.consumido_en) ?? null,
    creadoEn: aFechaObligatoria(f.creado_en, 'creado_en'),
  }
}

function aSesion(f: Fila): SesionGuardada {
  return {
    id: String(f.id),
    usuarioId: String(f.usuario_id),
    expiraEn: aFechaObligatoria(f.expira_en, 'expira_en'),
    revocadaEn: aFecha(f.revocada_en) ?? null,
  }
}

export class RepositorioPostgres implements RepositorioAuth {
  async buscarUsuarioPorEmail(email: string): Promise<UsuarioAuth | undefined> {
    const filas = (await sql()`
      SELECT id, email, nombre, hash_contrasena, rol, email_verificado, bloqueado_hasta
        FROM usuarios WHERE email = ${email} LIMIT 1
    `) as Fila[]
    return filas[0] ? aUsuario(filas[0]) : undefined
  }

  async buscarUsuarioPorId(id: string): Promise<UsuarioAuth | undefined> {
    const filas = (await sql()`
      SELECT id, email, nombre, hash_contrasena, rol, email_verificado, bloqueado_hasta
        FROM usuarios WHERE id = ${id}::uuid LIMIT 1
    `) as Fila[]
    return filas[0] ? aUsuario(filas[0]) : undefined
  }

  async crearUsuario(datos: {
    email: string
    nombre: string
    hashContrasena: string
    rol: Rol
  }): Promise<UsuarioAuth> {
    const filas = (await sql()`
      INSERT INTO usuarios (email, nombre, hash_contrasena, rol)
      VALUES (${datos.email}, ${datos.nombre}, ${datos.hashContrasena}, ${datos.rol}::rol_usuario)
      RETURNING id, email, nombre, hash_contrasena, rol, email_verificado, bloqueado_hasta
    `) as Fila[]
    if (!filas[0]) throw new Error('No se pudo crear el usuario')
    return aUsuario(filas[0])
  }

  async actualizarHashContrasena(usuarioId: string, hash: string): Promise<void> {
    await sql()`UPDATE usuarios SET hash_contrasena = ${hash} WHERE id = ${usuarioId}::uuid`
  }

  async marcarEmailVerificado(usuarioId: string): Promise<void> {
    await sql()`UPDATE usuarios SET email_verificado = true WHERE id = ${usuarioId}::uuid`
  }

  async fijarBloqueo(usuarioId: string, hasta: Date | null): Promise<void> {
    await sql()`UPDATE usuarios SET bloqueado_hasta = ${hasta} WHERE id = ${usuarioId}::uuid`
  }

  async crearCodigo(datos: {
    usuarioId: string
    proposito: Proposito
    hashCodigo: string
    expiraEn: Date
    creadoEn: Date
  }): Promise<CodigoGuardado> {
    const filas = (await sql()`
      INSERT INTO codigos_verificacion (usuario_id, proposito, hash_codigo, expira_en, creado_en)
      VALUES (${datos.usuarioId}::uuid, ${datos.proposito}::proposito_codigo,
              ${datos.hashCodigo}, ${datos.expiraEn}, ${datos.creadoEn})
      RETURNING id, usuario_id, proposito, hash_codigo, expira_en, intentos, consumido_en, creado_en
    `) as Fila[]
    if (!filas[0]) throw new Error('No se pudo crear el código')
    return aCodigo(filas[0])
  }

  async ultimoCodigoVigente(usuarioId: string, proposito: Proposito): Promise<CodigoGuardado | undefined> {
    const filas = (await sql()`
      SELECT id, usuario_id, proposito, hash_codigo, expira_en, intentos, consumido_en, creado_en
        FROM codigos_verificacion
       WHERE usuario_id = ${usuarioId}::uuid
         AND proposito = ${proposito}::proposito_codigo
         AND consumido_en IS NULL
       ORDER BY creado_en DESC
       LIMIT 1
    `) as Fila[]
    return filas[0] ? aCodigo(filas[0]) : undefined
  }

  async sumarIntentoCodigo(codigoId: string): Promise<void> {
    await sql()`UPDATE codigos_verificacion SET intentos = intentos + 1 WHERE id = ${codigoId}::uuid`
  }

  async consumirCodigo(codigoId: string, ahora: Date): Promise<void> {
    await sql()`UPDATE codigos_verificacion SET consumido_en = ${ahora} WHERE id = ${codigoId}::uuid`
  }

  async codigosDesde(usuarioId: string, proposito: Proposito, desde: Date): Promise<CodigoGuardado[]> {
    const filas = (await sql()`
      SELECT id, usuario_id, proposito, hash_codigo, expira_en, intentos, consumido_en, creado_en
        FROM codigos_verificacion
       WHERE usuario_id = ${usuarioId}::uuid
         AND proposito = ${proposito}::proposito_codigo
         AND creado_en >= ${desde}
       ORDER BY creado_en ASC
    `) as Fila[]
    return filas.map(aCodigo)
  }

  async crearSesion(datos: {
    usuarioId: string
    hashToken: string
    expiraEn: Date
    agente?: string
    ip?: string
  }): Promise<SesionGuardada> {
    // La IP se guarda como inet; una cadena vacía o inválida rompería el cast,
    // así que se manda null salvo que venga algo.
    const ip = datos.ip?.trim() || null
    const filas = (await sql()`
      INSERT INTO sesiones_auth (usuario_id, hash_token, expira_en, agente, ip)
      VALUES (${datos.usuarioId}::uuid, ${datos.hashToken}, ${datos.expiraEn},
              ${datos.agente ?? null}, ${ip}::inet)
      RETURNING id, usuario_id, expira_en, revocada_en
    `) as Fila[]
    if (!filas[0]) throw new Error('No se pudo crear la sesión')
    return aSesion(filas[0])
  }

  async buscarSesionPorHash(hashToken: string): Promise<SesionGuardada | undefined> {
    const filas = (await sql()`
      SELECT id, usuario_id, expira_en, revocada_en
        FROM sesiones_auth WHERE hash_token = ${hashToken} LIMIT 1
    `) as Fila[]
    if (!filas[0]) return undefined
    // Marca de uso, para poder mostrar sesiones activas y caducar las olvidadas.
    await sql()`UPDATE sesiones_auth SET ultimo_uso_en = now() WHERE hash_token = ${hashToken}`
    return aSesion(filas[0])
  }

  async revocarSesion(hashToken: string, ahora: Date): Promise<void> {
    await sql()`
      UPDATE sesiones_auth SET revocada_en = ${ahora}
       WHERE hash_token = ${hashToken} AND revocada_en IS NULL
    `
  }

  async revocarSesionesDe(usuarioId: string, ahora: Date): Promise<void> {
    await sql()`
      UPDATE sesiones_auth SET revocada_en = ${ahora}
       WHERE usuario_id = ${usuarioId}::uuid AND revocada_en IS NULL
    `
  }

  async leerContador(clave: string): Promise<Contador | undefined> {
    const filas = (await sql()`
      SELECT conteo, ventana_fin FROM limites_intentos WHERE clave = ${clave} LIMIT 1
    `) as Fila[]
    const f = filas[0]
    if (!f) return undefined
    return { conteo: Number(f.conteo), ventanaFin: aFechaObligatoria(f.ventana_fin, 'ventana_fin') }
  }

  async guardarContador(clave: string, contador: Contador): Promise<void> {
    await sql()`
      INSERT INTO limites_intentos (clave, conteo, ventana_fin)
      VALUES (${clave}, ${contador.conteo}, ${contador.ventanaFin})
      ON CONFLICT (clave) DO UPDATE
        SET conteo = EXCLUDED.conteo, ventana_fin = EXCLUDED.ventana_fin
    `
  }
}
