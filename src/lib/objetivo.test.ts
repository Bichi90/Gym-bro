import { describe, expect, it } from 'vitest'
import type { ResumenAntropometrico } from './antropometria'
import { pesoObjetivoEfectivo, planNutricional, proyectar, ritmoRequeridoKgSemana, semanasHasta } from './objetivo'
import type { Objetivo } from './types'

const resumen: ResumenAntropometrico = {
  pesoKg: 85,
  alturaCm: 178,
  edad: 35,
  imc: 26.8,
  grasaPct: 22,
  fuenteGrasa: 'medido',
  masaMagraKg: 66.3,
  masaGrasaKg: 18.7,
  tmb: 1802,
  fuenteTmb: 'Katch-McArdle',
  tdee: 2700,
}

const base: Objetivo = {
  tipo: 'perdida_grasa',
  diasPorSemana: 4,
  minutosPorSesion: 60,
  prioridades: [],
  objetivosFuerza: [],
}

const hoy = new Date('2026-03-01T12:00:00')

describe('planNutricional', () => {
  it('aplica déficit para perder grasa y superávit para ganar músculo', () => {
    const deficit = planNutricional(resumen, base, hoy)!
    expect(deficit.objetivoKcal).toBeLessThan(deficit.mantenimientoKcal)
    expect(deficit.ritmoSemanalKg).toBeLessThan(0)

    const superavit = planNutricional(resumen, { ...base, tipo: 'hipertrofia' }, hoy)!
    expect(superavit.objetivoKcal).toBeGreaterThan(superavit.mantenimientoKcal)
    expect(superavit.ritmoSemanalKg).toBeGreaterThan(0)
  })

  it('deja el mantenimiento sin ajuste', () => {
    const plan = planNutricional(resumen, { ...base, tipo: 'mantenimiento' }, hoy)!
    expect(plan.deltaKcal).toBe(0)
  })

  it('los macros suman aproximadamente las calorías objetivo', () => {
    const plan = planNutricional(resumen, base, hoy)!
    const suma = plan.proteinaG * 4 + plan.grasaG * 9 + plan.carbohidratoG * 4
    expect(Math.abs(suma - plan.objetivoKcal)).toBeLessThan(25)
  })

  it('recorta el déficit al máximo seguro aunque la fecha apriete', () => {
    // 10 kg en 4 semanas serían 2,5 kg/semana: imposible de forma sana.
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 75, fechaObjetivo: '2026-03-29' }
    const plan = planNutricional(resumen, objetivo, hoy)!
    expect(Math.abs(plan.ritmoSemanalKg)).toBeLessThanOrEqual(85 * 0.01 + 0.01)
  })

  it('sin gasto diario no hay plan', () => {
    const { tdee: _tdee, ...sinTdee } = resumen
    expect(planNutricional(sinTdee as ResumenAntropometrico, base, hoy)).toBeUndefined()
  })
})

describe('pesoObjetivoEfectivo', () => {
  it('usa el peso objetivo si está definido', () => {
    expect(pesoObjetivoEfectivo(resumen, { ...base, pesoObjetivoKg: 78 })).toBe(78)
  })

  it('traduce un % de grasa objetivo a peso manteniendo la masa magra', () => {
    const destino = pesoObjetivoEfectivo(resumen, { ...base, grasaObjetivoPct: 15 })
    expect(destino).toBeCloseTo(78, 0)
  })

  it('sin ninguno de los dos no hay destino', () => {
    expect(pesoObjetivoEfectivo(resumen, base)).toBeUndefined()
  })
})

describe('ritmoRequeridoKgSemana', () => {
  it('reparte la diferencia entre las semanas que quedan', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 80, fechaObjetivo: '2026-04-26' }
    const ritmo = ritmoRequeridoKgSemana(resumen, objetivo, hoy)!
    expect(semanasHasta('2026-04-26', hoy)).toBeCloseTo(8, 1)
    expect(ritmo).toBeCloseTo(-0.625, 2)
  })

  it('devuelve undefined si la fecha ya pasó', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 80, fechaObjetivo: '2026-02-01' }
    expect(ritmoRequeridoKgSemana(resumen, objetivo, hoy)).toBeUndefined()
  })
})

describe('proyectar', () => {
  it('marca como inviable un plazo imposible', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 75, fechaObjetivo: '2026-03-29' }
    const plan = planNutricional(resumen, objetivo, hoy)
    const p = proyectar(resumen, objetivo, plan, undefined, hoy)
    expect(p.viabilidad).toBe('inviable')
    expect(p.mensaje).toMatch(/semanas/)
  })

  it('marca como cómodo un plazo holgado', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 80, fechaObjetivo: '2026-09-01' }
    const plan = planNutricional(resumen, objetivo, hoy)
    expect(proyectar(resumen, objetivo, plan, undefined, hoy).viabilidad).toBe('comodo')
  })

  it('avisa si la fecha objetivo ya venció', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 80, fechaObjetivo: '2026-01-01' }
    expect(proyectar(resumen, objetivo, undefined, undefined, hoy).viabilidad).toBe('vencido')
  })

  it('sin fecha estima la llegada al ritmo del plan', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 80 }
    const plan = planNutricional(resumen, objetivo, hoy)
    const p = proyectar(resumen, objetivo, plan, undefined, hoy)
    expect(p.viabilidad).toBe('sin_fecha')
    expect(p.fechaEstimada).toBeDefined()
    expect(p.semanasEstimadas!).toBeGreaterThan(0)
  })

  it('reconoce cuando ya se alcanzó el objetivo', () => {
    const objetivo: Objetivo = { ...base, pesoObjetivoKg: 85.1 }
    expect(proyectar(resumen, objetivo, undefined, undefined, hoy).viabilidad).toBe('comodo')
  })
})
