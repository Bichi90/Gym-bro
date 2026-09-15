import { beforeEach, describe, expect, it } from 'vitest'
import { BuzonMemoria, RelojFalso, RepositorioMemoria } from './memoria'
import { POLITICA } from './politica'
import {
  cerrarSesion,
  iniciarSesion,
  registrar,
  sesionDesdeToken,
  verificarSegundoFactor,
  type Dependencias,
} from './servicio'

// scrypt real: cada alta o login cuesta medio segundo. Vale la pena, porque es
// justo la pieza que no conviene simular en las pruebas del camino de acceso.
const LENTO = 60_000

const EMAIL = 'rami@ejemplo.com'
const CLAVE = 'una frase larga y tranquila'

let repo: RepositorioMemoria
let correo: BuzonMemoria
let reloj: RelojFalso
let deps: Dependencias

beforeEach(() => {
  repo = new RepositorioMemoria()
  correo = new BuzonMemoria()
  reloj = new RelojFalso(new Date('2026-03-01T12:00:00Z'))
  deps = { repo, correo, secreto: 'secreto-de-prueba-largo', reloj }
})

/** Alta completa: registro, código y verificación. Devuelve el token. */
async function altaCompleta(email = EMAIL, clave = CLAVE): Promise<string> {
  await registrar(deps, { email, contrasena: clave, nombre: 'Rami' })
  const codigo = correo.codigoDelUltimo()!
  const r = await verificarSegundoFactor(deps, { email, codigo })
  if (r.estado !== 'ok') throw new Error('el alta debería haber funcionado: ' + r.estado)
  return r.token
}

describe('registro', () => {
  it('crea el usuario y manda un código de verificación', { timeout: LENTO }, async () => {
    const r = await registrar(deps, { email: EMAIL, contrasena: CLAVE, nombre: '  Rami  Test ' })
    expect(r).toEqual({ estado: 'codigo_enviado' })
    expect(correo.enviados).toHaveLength(1)
    expect(correo.ultimo!.para).toBe(EMAIL)
    expect(correo.ultimo!.asunto).toMatch(/\d{3} \d{3}/)

    const usuario = await repo.buscarUsuarioPorEmail(EMAIL)
    expect(usuario?.nombre).toBe('Rami Test')
    expect(usuario?.emailVerificado).toBe(false)
    expect(usuario?.rol).toBe('entrenado')
  })

  it('nunca guarda la contraseña en claro', { timeout: LENTO }, async () => {
    await registrar(deps, { email: EMAIL, contrasena: CLAVE })
    const usuario = await repo.buscarUsuarioPorEmail(EMAIL)
    expect(usuario!.hashContrasena).not.toContain(CLAVE)
    expect(usuario!.hashContrasena.startsWith('scrypt$')).toBe(true)
  })

  it('el código no viaja en claro a la base', { timeout: LENTO }, async () => {
    await registrar(deps, { email: EMAIL, contrasena: CLAVE })
    const codigo = correo.codigoDelUltimo()!
    const guardado = [...repo.codigos.values()][0]!
    expect(guardado.hashCodigo).not.toContain(codigo)
  })

  it('rechaza correo y contraseña inválidos, juntando los mensajes', async () => {
    const r = await registrar(deps, { email: 'no-es-correo', contrasena: 'corta' })
    expect(r.estado).toBe('datos_invalidos')
    if (r.estado === 'datos_invalidos') expect(r.mensajes.length).toBeGreaterThanOrEqual(2)
    expect(repo.usuarios.size).toBe(0)
  })

  it('acepta el rol de entrenador', { timeout: LENTO }, async () => {
    await registrar(deps, { email: EMAIL, contrasena: CLAVE, rol: 'entrenador' })
    expect((await repo.buscarUsuarioPorEmail(EMAIL))?.rol).toBe('entrenador')
  })

  it('rechaza un rol inventado', async () => {
    const r = await registrar(deps, { email: EMAIL, contrasena: CLAVE, rol: 'admin' })
    expect(r.estado).toBe('datos_invalidos')
  })

  it('no revela que un correo ya está registrado', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()

    const r = await registrar(deps, { email: EMAIL, contrasena: 'otra frase distinta larga' })
    // Misma respuesta que un alta nueva...
    expect(r).toEqual({ estado: 'codigo_enviado' })
    // ...pero no se crea un segundo usuario ni se manda un código utilizable:
    // al dueño le llega un aviso, no una forma de entrar.
    expect(repo.usuarios.size).toBe(1)
    expect(correo.ultimo!.asunto).toMatch(/inició sesión/i)
    expect(correo.codigoDelUltimo()).toBeUndefined()
  })
})

describe('login y segundo factor', () => {
  it('con la contraseña correcta manda un código y lo acepta', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()

    expect(await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })).toEqual({ estado: 'codigo_enviado' })
    const codigo = correo.codigoDelUltimo()!
    const r = await verificarSegundoFactor(deps, { email: EMAIL, codigo, agente: 'Chrome', ip: '1.2.3.4' })

    expect(r.estado).toBe('ok')
    if (r.estado === 'ok') {
      expect(r.usuario.email).toBe(EMAIL)
      expect(r.token.length).toBeGreaterThan(40)
      expect(r.expiraEn.getTime()).toBeGreaterThan(reloj.ahora().getTime())
    }
  })

  it('responde igual con contraseña equivocada que con correo inexistente', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()

    const malaClave = await iniciarSesion(deps, { email: EMAIL, contrasena: 'equivocada del todo' })
    const sinCuenta = await iniciarSesion(deps, { email: 'nadie@ejemplo.com', contrasena: CLAVE })

    expect(malaClave).toEqual({ estado: 'codigo_enviado' })
    expect(sinCuenta).toEqual({ estado: 'codigo_enviado' })
    // Ninguno de los dos manda código: la respuesta es igual, el efecto no.
    expect(correo.enviados).toHaveLength(0)
  })

  it('un código equivocado no abre sesión y gasta un intento', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()
    await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })

    const r = await verificarSegundoFactor(deps, { email: EMAIL, codigo: '000000' })
    expect(r.estado).toBe('codigo_invalido')

    const usuario = await repo.buscarUsuarioPorEmail(EMAIL)
    const guardado = await repo.ultimoCodigoVigente(usuario!.id, 'segundo_factor')
    expect(guardado?.intentos).toBe(1)
  })

  it('el código caduca a los diez minutos', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()
    await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })
    const codigo = correo.codigoDelUltimo()!

    reloj.avanzarMinutos(11)
    expect((await verificarSegundoFactor(deps, { email: EMAIL, codigo })).estado).toBe('codigo_expirado')
  })

  it('el código se consume: no sirve dos veces', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()
    await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })
    const codigo = correo.codigoDelUltimo()!

    expect((await verificarSegundoFactor(deps, { email: EMAIL, codigo })).estado).toBe('ok')
    expect((await verificarSegundoFactor(deps, { email: EMAIL, codigo })).estado).toBe('codigo_invalido')
  })

  it('tras agotar los intentos el código deja de admitirse', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()
    await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })
    const codigo = correo.codigoDelUltimo()!

    for (let i = 0; i < POLITICA.intentosMaximosCodigo; i++) {
      await verificarSegundoFactor(deps, { email: EMAIL, codigo: '000000' })
    }
    // Ni siquiera el código correcto pasa ya.
    expect((await verificarSegundoFactor(deps, { email: EMAIL, codigo })).estado).toBe('demasiados_intentos')
  })

  it('un correo sin cuenta no distingue su respuesta al verificar', async () => {
    const r = await verificarSegundoFactor(deps, { email: 'nadie@ejemplo.com', codigo: '123456' })
    expect(r.estado).toBe('codigo_invalido')
  })
})

describe('reenvíos', () => {
  it('obliga a esperar entre códigos seguidos', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()

    expect((await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })).estado).toBe('codigo_enviado')
    const r = await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })
    expect(r.estado).toBe('demasiados_intentos')
    if (r.estado === 'demasiados_intentos') expect(r.esperarSeg).toBeGreaterThan(0)
    expect(correo.enviados).toHaveLength(1)
  })

  it('deja reenviar pasada la espera', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()
    await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })

    reloj.avanzarMs(POLITICA.esperaReenvioMs + 1000)
    expect((await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })).estado).toBe('codigo_enviado')
    expect(correo.enviados).toHaveLength(2)
  })
})

describe('bloqueo por intentos de contraseña', () => {
  it('bloquea la cuenta tras demasiados fallos y la libera al entrar bien', { timeout: LENTO }, async () => {
    await altaCompleta()
    correo.vaciar()

    for (let i = 0; i < POLITICA.intentosMaximosLogin; i++) {
      await iniciarSesion(deps, { email: EMAIL, contrasena: 'no es' })
    }

    const bloqueado = await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })
    expect(bloqueado.estado).toBe('demasiados_intentos')

    // Pasado el bloqueo, la contraseña correcta vuelve a funcionar.
    reloj.avanzarMs(POLITICA.bloqueoLoginMs + 1000)
    expect((await iniciarSesion(deps, { email: EMAIL, contrasena: CLAVE })).estado).toBe('codigo_enviado')
  })
})

describe('sesiones', () => {
  it('el token resuelve al usuario', { timeout: LENTO }, async () => {
    const token = await altaCompleta()
    const sesion = await sesionDesdeToken(deps, token)
    expect(sesion?.usuario.email).toBe(EMAIL)
  })

  it('la base guarda el hash del token, no el token', { timeout: LENTO }, async () => {
    const token = await altaCompleta()
    expect([...repo.sesiones.keys()]).not.toContain(token)
  })

  it('un token inventado no vale', { timeout: LENTO }, async () => {
    await altaCompleta()
    expect(await sesionDesdeToken(deps, 'token-falso')).toBeUndefined()
    expect(await sesionDesdeToken(deps, undefined)).toBeUndefined()
  })

  it('cerrar sesión revoca el token', { timeout: LENTO }, async () => {
    const token = await altaCompleta()
    await cerrarSesion(deps, token)
    expect(await sesionDesdeToken(deps, token)).toBeUndefined()
  })

  it('la sesión caduca', { timeout: LENTO }, async () => {
    const token = await altaCompleta()
    reloj.avanzarMs(31 * 24 * 60 * 60 * 1000)
    expect(await sesionDesdeToken(deps, token)).toBeUndefined()
  })

  it('verificar el alta marca el correo como verificado', { timeout: LENTO }, async () => {
    await altaCompleta()
    expect((await repo.buscarUsuarioPorEmail(EMAIL))?.emailVerificado).toBe(true)
  })
})

describe('límite por IP', () => {
  // Se ejercita con verificarSegundoFactor y no con iniciarSesion: el limitador
  // es el mismo, pero aquí no se paga un scrypt señuelo por iteración.
  const insistir = async (ip: string, veces: number) => {
    for (let i = 0; i < veces; i++) {
      await verificarSegundoFactor(deps, { email: 'nadie@ejemplo.com', codigo: '123456', ip })
    }
  }

  it('corta cuando una misma IP insiste demasiado', async () => {
    await insistir('9.9.9.9', POLITICA.peticionesMaximasPorIp)
    const r = await verificarSegundoFactor(deps, { email: 'nadie@ejemplo.com', codigo: '123456', ip: '9.9.9.9' })
    expect(r.estado).toBe('demasiados_intentos')
  })

  it('no afecta a otra IP', async () => {
    await insistir('9.9.9.9', POLITICA.peticionesMaximasPorIp)
    const otra = await verificarSegundoFactor(deps, { email: 'nadie@ejemplo.com', codigo: '123456', ip: '8.8.8.8' })
    expect(otra.estado).toBe('codigo_invalido')
  })
})
