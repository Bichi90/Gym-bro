import { describe, expect, it } from 'vitest'
import { describirProblemas, direccionDe, validarEntorno } from './entorno'

const COMPLETO = {
  DATABASE_URL: 'postgresql://u:c@ep-abc.eu-central-1.aws.neon.tech/gymbro?sslmode=require',
  AUTH_SECRET: 'x'.repeat(44),
  RESEND_API_KEY: 're_1234567890abcdef',
  CORREO_REMITENTE: 'Gym Bro <acceso@gymbro.app>',
  URL_PUBLICA: 'https://gymbro.vercel.app',
}

const problemasDe = (bruto: Record<string, string | undefined>, prod = false) => {
  const r = validarEntorno(bruto, prod)
  return r.ok ? [] : r.problemas.map((p) => `${p.variable}:${p.motivo}`)
}

describe('validarEntorno', () => {
  it('acepta una configuración completa', () => {
    const r = validarEntorno(COMPLETO, true)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.entorno.urlPublica).toBe('https://gymbro.vercel.app')
      expect(r.entorno.esProduccion).toBe(true)
    }
  })

  it('reúne todos los problemas en una sola pasada', () => {
    const r = validarEntorno({}, false)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.problemas.map((p) => p.variable).sort()).toEqual([
        'AUTH_SECRET',
        'CORREO_REMITENTE',
        'DATABASE_URL',
        'RESEND_API_KEY',
        'URL_PUBLICA',
      ])
    }
  })

  it('trata el espacio en blanco como ausencia', () => {
    expect(problemasDe({ ...COMPLETO, AUTH_SECRET: '   ' })).toContain('AUTH_SECRET:falta o está vacía')
  })

  it('exige un esquema de Postgres', () => {
    expect(problemasDe({ ...COMPLETO, DATABASE_URL: 'mysql://u:c@host/db' })[0]).toMatch(/postgres/)
    expect(problemasDe({ ...COMPLETO, DATABASE_URL: 'postgres://u:c@host/db' })).toEqual([])
  })

  it('exige SSL solo en producción', () => {
    const sinSsl = { ...COMPLETO, DATABASE_URL: 'postgresql://u:c@host/db' }
    expect(problemasDe(sinSsl, true)[0]).toMatch(/sslmode=require/)
    expect(problemasDe(sinSsl, false)).toEqual([])
  })

  it('rechaza secretos cortos', () => {
    expect(problemasDe({ ...COMPLETO, AUTH_SECRET: 'corto' })[0]).toMatch(/32 caracteres/)
    expect(problemasDe({ ...COMPLETO, AUTH_SECRET: 'y'.repeat(32) })).toEqual([])
  })

  it('reconoce el formato de las claves de Resend', () => {
    expect(problemasDe({ ...COMPLETO, RESEND_API_KEY: 'sk_loquesea' })[0]).toMatch(/re_/)
  })

  it('valida la dirección del remitente, con nombre o sin él', () => {
    expect(problemasDe({ ...COMPLETO, CORREO_REMITENTE: 'acceso@gymbro.app' })).toEqual([])
    expect(problemasDe({ ...COMPLETO, CORREO_REMITENTE: 'Gym Bro <no-es-un-correo>' })[0]).toMatch(/dirección/)
  })

  it('exige https en producción pero deja http en local', () => {
    const local = { ...COMPLETO, URL_PUBLICA: 'http://localhost:3000' }
    expect(problemasDe(local, true)[0]).toMatch(/https/)
    expect(problemasDe(local, false)).toEqual([])
  })

  it('normaliza la URL quitando la barra final', () => {
    const r = validarEntorno({ ...COMPLETO, URL_PUBLICA: 'https://gymbro.vercel.app/' }, true)
    expect(r.ok && r.entorno.urlPublica).toBe('https://gymbro.vercel.app')
  })

  it('rechaza una URL que no lo es', () => {
    expect(problemasDe({ ...COMPLETO, URL_PUBLICA: 'gymbro punto app' })[0]).toMatch(/URL válida/)
  })

  it('deduce producción de NODE_ENV cuando no se le dice', () => {
    const r = validarEntorno({ ...COMPLETO, DATABASE_URL: 'postgresql://u:c@host/db', NODE_ENV: 'production' })
    expect(r.ok).toBe(false)
  })
})

describe('direccionDe', () => {
  it('extrae la dirección del formato con nombre', () => {
    expect(direccionDe('Gym Bro <acceso@gymbro.app>')).toBe('acceso@gymbro.app')
    expect(direccionDe('  acceso@gymbro.app  ')).toBe('acceso@gymbro.app')
  })
})

describe('describirProblemas', () => {
  it('lista los problemas sin filtrar ningún valor', () => {
    const texto = describirProblemas([{ variable: 'AUTH_SECRET', motivo: 'falta o está vacía' }])
    expect(texto).toContain('AUTH_SECRET')
    expect(texto).toContain('.env.example')
  })

  it('nunca incluye el valor de una variable', () => {
    const r = validarEntorno({ ...COMPLETO, RESEND_API_KEY: 'sk_secretisimo_12345' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(describirProblemas(r.problemas)).not.toContain('secretisimo')
  })
})
