import { describe, expect, it } from 'vitest'
import { hashearContrasena, necesitaRehash, verificarContrasena } from './contrasena'
import { esFormatoValido, formatearParaCorreo, generarCodigo, hashearCodigo, normalizar, verificarCodigo } from './codigos'
import {
  cabeceraCookieBorrada,
  cabeceraCookieSesion,
  compararHashes,
  generarToken,
  hashearToken,
  leerTokenDeCookies,
} from './tokens'
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
import {
  esEmailValido,
  esRolValido,
  limpiarNombre,
  normalizarEmail,
  validarContrasena,
} from './validacion'

// scrypt con los parámetros de producción tarda ~100 ms por hash.
const LENTO = 20_000

describe('contraseñas', () => {
  it('acepta la contraseña correcta y rechaza la incorrecta', { timeout: LENTO }, async () => {
    const hash = await hashearContrasena('sentadilla profunda 120')
    expect(await verificarContrasena('sentadilla profunda 120', hash)).toBe(true)
    expect(await verificarContrasena('sentadilla profunda 121', hash)).toBe(false)
  })

  it('dos hashes de la misma contraseña son distintos', { timeout: LENTO }, async () => {
    const a = await hashearContrasena('la misma de siempre')
    const b = await hashearContrasena('la misma de siempre')
    expect(a).not.toBe(b)
    expect(await verificarContrasena('la misma de siempre', b)).toBe(true)
  })

  it('normaliza unicode para que la misma contraseña escrita distinto valga', { timeout: LENTO }, async () => {
    const compuesta = 'café con leche' // e + acento combinante
    const precompuesta = 'café con leche'
    const hash = await hashearContrasena(compuesta)
    expect(await verificarContrasena(precompuesta, hash)).toBe(true)
  })

  it('rechaza hashes con formato inválido sin lanzar', async () => {
    for (const malo of ['', 'texto suelto', 'scrypt$1$2$3', 'bcrypt$1$1$1$c2Fs$aGFzaA==', 'scrypt$x$8$1$c2Fs$aGFzaA==']) {
      expect(await verificarContrasena('lo que sea', malo)).toBe(false)
    }
  })

  it('rechaza N que no sea potencia de dos o esté fuera de rango', async () => {
    expect(await verificarContrasena('x', 'scrypt$1000$8$1$c2Fs$aGFzaA==')).toBe(false)
    expect(await verificarContrasena('x', 'scrypt$4194304$8$1$c2Fs$aGFzaA==')).toBe(false)
  })

  it('marca para rehash los hashes con parámetros flojos', { timeout: LENTO }, async () => {
    expect(necesitaRehash('scrypt$16384$8$1$c2Fs$aGFzaA==')).toBe(true)
    expect(necesitaRehash('no es un hash')).toBe(true)
    expect(necesitaRehash(await hashearContrasena('actual'))).toBe(false)
  })
})

describe('códigos de seis dígitos', () => {
  const secreto = 'secreto-de-prueba'

  it('genera siempre seis dígitos', () => {
    for (let i = 0; i < 200; i++) {
      const c = generarCodigo()
      expect(c).toMatch(/^\d{6}$/)
    }
  })

  it('verifica el código correcto y rechaza el resto', () => {
    const codigo = '048271'
    const hash = hashearCodigo(codigo, secreto)
    expect(verificarCodigo(codigo, hash, secreto)).toBe(true)
    expect(verificarCodigo('048272', hash, secreto)).toBe(false)
  })

  it('acepta el código pegado con espacios o guiones', () => {
    const hash = hashearCodigo('123456', secreto)
    expect(verificarCodigo('123 456', hash, secreto)).toBe(true)
    expect(verificarCodigo('123-456', hash, secreto)).toBe(true)
    expect(normalizar(' 12 34-56 ')).toBe('123456')
  })

  it('un secreto distinto invalida el código', () => {
    const hash = hashearCodigo('123456', secreto)
    expect(verificarCodigo('123456', hash, 'otro-secreto')).toBe(false)
  })

  it('exige secreto para hashear', () => {
    expect(() => hashearCodigo('123456', '')).toThrow()
  })

  it('rechaza formatos que no son seis dígitos', () => {
    for (const malo of ['12345', '1234567', 'abcdef', '', '12a456']) {
      expect(esFormatoValido(malo)).toBe(false)
      expect(verificarCodigo(malo, hashearCodigo('123456', secreto), secreto)).toBe(false)
    }
  })

  it('se presenta en dos bloques para el correo', () => {
    expect(formatearParaCorreo('123456')).toBe('123 456')
  })
})

describe('tokens de sesión', () => {
  it('genera tokens únicos y largos', () => {
    const vistos = new Set<string>()
    for (let i = 0; i < 500; i++) vistos.add(generarToken())
    expect(vistos.size).toBe(500)
    expect(generarToken().length).toBeGreaterThanOrEqual(43)
  })

  it('el hash es estable y comparable', () => {
    const t = generarToken()
    expect(hashearToken(t)).toBe(hashearToken(t))
    expect(compararHashes(hashearToken(t), hashearToken(t))).toBe(true)
    expect(compararHashes(hashearToken(t), hashearToken(generarToken()))).toBe(false)
  })

  it('comparar hashes no lanza con basura', () => {
    expect(compararHashes('zz', 'zz')).toBe(false)
    expect(compararHashes('', '')).toBe(false)
  })

  it('la cookie es httpOnly, con SameSite y Secure en producción', () => {
    const c = cabeceraCookieSesion('abc', { maxEdadSeg: 3600, seguro: true })
    expect(c).toContain('gb_sesion=abc')
    expect(c).toContain('HttpOnly')
    expect(c).toContain('SameSite=Lax')
    expect(c).toContain('Secure')
    expect(c).toContain('Max-Age=3600')
    expect(cabeceraCookieSesion('abc', { maxEdadSeg: 10, seguro: false })).not.toContain('Secure')
  })

  it('la cookie de borrado caduca de inmediato', () => {
    expect(cabeceraCookieBorrada(true)).toContain('Max-Age=0')
  })

  it('lee el token entre otras cookies', () => {
    expect(leerTokenDeCookies('a=1; gb_sesion=eltoken; b=2')).toBe('eltoken')
    expect(leerTokenDeCookies('gb_sesion=eltoken')).toBe('eltoken')
    expect(leerTokenDeCookies('otra=1')).toBeUndefined()
    expect(leerTokenDeCookies(undefined)).toBeUndefined()
    expect(leerTokenDeCookies('gb_sesion=')).toBeUndefined()
  })
})

describe('política de códigos', () => {
  const ahora = new Date('2026-03-01T12:00:00Z')

  it('acepta un código vivo y sin intentos gastados', () => {
    const estado = { expiraEn: new Date(ahora.getTime() + 60_000), intentos: 0 }
    expect(evaluarCodigo(estado, ahora)).toEqual({ ok: true })
  })

  it('rechaza el expirado, el consumido y el que agotó intentos', () => {
    expect(evaluarCodigo({ expiraEn: new Date(ahora.getTime() - 1), intentos: 0 }, ahora)).toEqual({
      ok: false,
      motivo: 'expirado',
    })
    expect(
      evaluarCodigo({ expiraEn: new Date(ahora.getTime() + 60_000), intentos: 0, consumidoEn: ahora }, ahora),
    ).toEqual({ ok: false, motivo: 'consumido' })
    expect(
      evaluarCodigo(
        { expiraEn: new Date(ahora.getTime() + 60_000), intentos: POLITICA.intentosMaximosCodigo },
        ahora,
      ),
    ).toEqual({ ok: false, motivo: 'demasiados_intentos' })
    expect(evaluarCodigo(undefined, ahora)).toEqual({ ok: false, motivo: 'inexistente' })
  })

  it('el código caduca a los diez minutos', () => {
    expect(calcularExpiracionCodigo(ahora).getTime() - ahora.getTime()).toBe(10 * 60 * 1000)
  })
})

describe('política de reenvíos', () => {
  const ahora = new Date('2026-03-01T12:00:00Z')

  it('obliga a esperar entre reenvíos seguidos', () => {
    const r = evaluarReenvio({ ultimoEnvioEn: new Date(ahora.getTime() - 10_000), enviosEnVentana: 1 }, ahora)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.motivo).toBe('demasiado_pronto')
      expect(r.esperarSeg).toBe(50)
    }
  })

  it('permite reenviar pasada la espera', () => {
    expect(
      evaluarReenvio({ ultimoEnvioEn: new Date(ahora.getTime() - 61_000), enviosEnVentana: 1 }, ahora),
    ).toEqual({ ok: true })
  })

  it('corta al llegar al tope de la ventana', () => {
    const r = evaluarReenvio(
      {
        ultimoEnvioEn: new Date(ahora.getTime() - 120_000),
        enviosEnVentana: POLITICA.reenviosMaximos,
        ventanaFin: new Date(ahora.getTime() + 600_000),
      },
      ahora,
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toBe('limite_ventana')
  })

  it('una ventana ya vencida no cuenta', () => {
    expect(
      evaluarReenvio(
        {
          ultimoEnvioEn: new Date(ahora.getTime() - 120_000),
          enviosEnVentana: 99,
          ventanaFin: new Date(ahora.getTime() - 1),
        },
        ahora,
      ),
    ).toEqual({ ok: true })
  })

  it('el primer envío nunca se frena', () => {
    expect(evaluarReenvio({ enviosEnVentana: 0 }, ahora)).toEqual({ ok: true })
  })
})

describe('contadores y bloqueo', () => {
  const ahora = new Date('2026-03-01T12:00:00Z')

  it('abre ventana nueva cuando no hay contador', () => {
    const c = incrementarContador(undefined, ahora, 60_000)
    expect(c.conteo).toBe(1)
    expect(c.ventanaFin.getTime()).toBe(ahora.getTime() + 60_000)
  })

  it('suma dentro de la ventana y reinicia al vencer', () => {
    const viva = { conteo: 3, ventanaFin: new Date(ahora.getTime() + 30_000) }
    expect(incrementarContador(viva, ahora, 60_000).conteo).toBe(4)
    const vencida = { conteo: 9, ventanaFin: new Date(ahora.getTime() - 1) }
    expect(incrementarContador(vencida, ahora, 60_000).conteo).toBe(1)
  })

  it('detecta el límite solo dentro de la ventana', () => {
    expect(superaLimite({ conteo: 10, ventanaFin: new Date(ahora.getTime() + 1000) }, ahora, 10)).toBe(true)
    expect(superaLimite({ conteo: 10, ventanaFin: new Date(ahora.getTime() - 1) }, ahora, 10)).toBe(false)
    expect(superaLimite(undefined, ahora, 10)).toBe(false)
  })

  it('bloquea la cuenta al agotar los intentos de login', () => {
    const lleno = { conteo: POLITICA.intentosMaximosLogin, ventanaFin: new Date(ahora.getTime() + 1000) }
    const hasta = calcularBloqueo(lleno, ahora)
    expect(hasta).toBeDefined()
    expect(hasta!.getTime()).toBe(ahora.getTime() + POLITICA.bloqueoLoginMs)
    expect(calcularBloqueo({ conteo: 1, ventanaFin: new Date(ahora.getTime() + 1000) }, ahora)).toBeUndefined()
  })

  it('reconoce un bloqueo vigente y uno ya vencido', () => {
    expect(estaBloqueado(new Date(ahora.getTime() + 1000), ahora)).toBe(true)
    expect(estaBloqueado(new Date(ahora.getTime() - 1), ahora)).toBe(false)
    expect(estaBloqueado(null, ahora)).toBe(false)
  })
})

describe('validación de entradas', () => {
  it('normaliza el correo sin destrozar la parte local', () => {
    expect(normalizarEmail('  Rami+Gym@Ejemplo.COM ')).toBe('rami+gym@ejemplo.com')
  })

  it('acepta correos razonables', () => {
    for (const e of ['a@b.co', 'rami+gym@ejemplo.com.ar', 'nombre.apellido@sub.dominio.io']) {
      expect(esEmailValido(e)).toBe(true)
    }
  })

  it('rechaza los que no lo son', () => {
    for (const e of ['', 'sinarroba', 'a@b', 'a@@b.com', 'a b@c.com', 'a@.com', 'a@b.', 'a@b..com']) {
      expect(esEmailValido(e)).toBe(false)
    }
  })

  it('exige longitud en la contraseña y avisa de las comunes', () => {
    expect(validarContrasena('corta')).toContain('corta')
    expect(validarContrasena('   ')).toContain('solo_espacios')
    expect(validarContrasena('password')).toContain('corta')
    expect(validarContrasena('1234567890')).toContain('demasiado_comun')
    expect(validarContrasena('x'.repeat(201))).toContain('larga')
    expect(validarContrasena('una frase larga y tranquila')).toEqual([])
  })

  it('no deja meter el propio correo en la contraseña', () => {
    expect(validarContrasena('ramiro12345', 'ramiro@ejemplo.com')).toContain('contiene_email')
    expect(validarContrasena('otra cosa distinta', 'ramiro@ejemplo.com')).toEqual([])
  })

  it('valida el rol', () => {
    expect(esRolValido('entrenador')).toBe(true)
    expect(esRolValido('entrenado')).toBe(true)
    expect(esRolValido('admin')).toBe(false)
  })

  it('limpia el nombre', () => {
    expect(limpiarNombre('  Rami   Test  ')).toBe('Rami Test')
    expect(limpiarNombre('x'.repeat(200)).length).toBe(80)
  })
})
