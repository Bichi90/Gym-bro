import { describe, expect, it } from 'vitest'
import {
  edadDesde,
  gastoDiario,
  grasaNavy,
  imc,
  masaMagra,
  mediaMovilPeso,
  resumirMedicion,
  tendenciaPesoSemanal,
  tmbKatch,
  tmbMifflin,
} from './antropometria'
import type { Medicion, Perfil } from './types'

const perfil: Perfil = {
  nombre: 'Test',
  sexo: 'masculino',
  fechaNacimiento: '1990-06-15',
  alturaCm: 178,
  experiencia: 'intermedio',
  actividad: 'ligero',
  equipamiento: ['barra', 'mancuernas'],
  unidad: 'kg',
}

describe('imc', () => {
  it('calcula el índice con peso y altura', () => {
    expect(imc(80, 180)).toBeCloseTo(24.69, 2)
  })

  it('devuelve undefined si falta algún dato', () => {
    expect(imc(0, 180)).toBeUndefined()
    expect(imc(80, 0)).toBeUndefined()
  })
})

describe('grasaNavy', () => {
  it('estima el % de grasa en hombres con cuello y cintura', () => {
    const m: Medicion = { id: '1', fecha: '2026-01-01', pesoKg: 80, cuelloCm: 38, cinturaCm: 85 }
    const bf = grasaNavy(m, 'masculino', 178)
    expect(bf).toBeDefined()
    expect(bf!).toBeGreaterThan(12)
    expect(bf!).toBeLessThan(20)
  })

  it('en mujeres necesita también la cadera', () => {
    const sinCadera: Medicion = { id: '1', fecha: '2026-01-01', pesoKg: 62, cuelloCm: 32, cinturaCm: 72 }
    expect(grasaNavy(sinCadera, 'femenino', 165)).toBeUndefined()
    const conCadera: Medicion = { ...sinCadera, caderaCm: 96 }
    const bf = grasaNavy(conCadera, 'femenino', 165)
    expect(bf).toBeDefined()
    expect(bf!).toBeGreaterThan(18)
    expect(bf!).toBeLessThan(35)
  })

  it('una cintura mayor sube el % de grasa', () => {
    const base: Medicion = { id: '1', fecha: '2026-01-01', pesoKg: 80, cuelloCm: 38, cinturaCm: 80 }
    const gordo = { ...base, cinturaCm: 100 }
    expect(grasaNavy(gordo, 'masculino', 178)!).toBeGreaterThan(grasaNavy(base, 'masculino', 178)!)
  })

  it('devuelve undefined con medidas imposibles', () => {
    const m: Medicion = { id: '1', fecha: '2026-01-01', pesoKg: 80, cuelloCm: 90, cinturaCm: 80 }
    expect(grasaNavy(m, 'masculino', 178)).toBeUndefined()
  })
})

describe('masaMagra', () => {
  it('descuenta la grasa del peso total', () => {
    expect(masaMagra(80, 20)).toBeCloseTo(64, 5)
  })
})

describe('metabolismo', () => {
  it('Mifflin-St Jeor da valores distintos por sexo', () => {
    const hombre = tmbMifflin(80, 178, 35, 'masculino')
    const mujer = tmbMifflin(80, 178, 35, 'femenino')
    expect(hombre - mujer).toBeCloseTo(166, 5)
    // 10×80 + 6,25×178 − 5×35 + 5
    expect(hombre).toBeCloseTo(1742.5, 1)
  })

  it('Katch-McArdle depende solo de la masa magra', () => {
    expect(tmbKatch(64)).toBeCloseTo(1752.4, 1)
  })

  it('el gasto diario crece con los entrenos semanales', () => {
    expect(gastoDiario(1700, 'ligero', 5)).toBeGreaterThan(gastoDiario(1700, 'ligero', 2))
  })
})

describe('edadDesde', () => {
  it('no cuenta el cumpleaños si todavía no llegó', () => {
    expect(edadDesde('1990-06-15', new Date('2026-06-14T12:00:00'))).toBe(35)
    expect(edadDesde('1990-06-15', new Date('2026-06-15T12:00:00'))).toBe(36)
  })

  it('devuelve undefined sin fecha', () => {
    expect(edadDesde(undefined)).toBeUndefined()
  })
})

describe('resumirMedicion', () => {
  it('prefiere Katch-McArdle cuando hay % de grasa', () => {
    const m: Medicion = { id: '1', fecha: '2026-01-01', pesoKg: 80, grasaPct: 20 }
    const r = resumirMedicion(m, perfil, 3, new Date('2026-01-01T12:00:00'))
    expect(r.fuenteTmb).toBe('Katch-McArdle')
    expect(r.fuenteGrasa).toBe('medido')
    expect(r.masaMagraKg).toBeCloseTo(64, 5)
    expect(r.tdee!).toBeGreaterThan(r.tmb!)
  })

  it('cae a Mifflin-St Jeor si no puede estimar la grasa', () => {
    const m: Medicion = { id: '1', fecha: '2026-01-01', pesoKg: 80 }
    const r = resumirMedicion(m, perfil, 3, new Date('2026-01-01T12:00:00'))
    expect(r.fuenteTmb).toBe('Mifflin-St Jeor')
    expect(r.grasaPct).toBeUndefined()
  })
})

describe('tendenciaPesoSemanal', () => {
  it('detecta una bajada sostenida', () => {
    const mediciones: Medicion[] = [
      { id: '1', fecha: '2026-01-01', pesoKg: 84 },
      { id: '2', fecha: '2026-01-08', pesoKg: 83.4 },
      { id: '3', fecha: '2026-01-15', pesoKg: 82.8 },
      { id: '4', fecha: '2026-01-22', pesoKg: 82.2 },
    ]
    const t = tendenciaPesoSemanal(mediciones, 28, new Date('2026-01-22T12:00:00'))
    expect(t).toBeDefined()
    expect(t!).toBeCloseTo(-0.6, 1)
  })

  it('necesita al menos dos puntos', () => {
    expect(tendenciaPesoSemanal([{ id: '1', fecha: '2026-01-01', pesoKg: 84 }])).toBeUndefined()
  })
})

describe('mediaMovilPeso', () => {
  it('promedia solo los días dentro de la ventana', () => {
    const mediciones: Medicion[] = [
      { id: '1', fecha: '2026-01-01', pesoKg: 80 },
      { id: '2', fecha: '2026-01-02', pesoKg: 82 },
      { id: '3', fecha: '2026-01-20', pesoKg: 70 },
    ]
    const media = mediaMovilPeso(mediciones, 7)
    expect(media[1]!.valor).toBeCloseTo(81, 5)
    // El tercer punto queda fuera de la ventana de los dos primeros.
    expect(media[2]!.valor).toBeCloseTo(70, 5)
  })
})
