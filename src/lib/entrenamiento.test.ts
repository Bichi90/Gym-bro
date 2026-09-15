import { describe, expect, it } from 'vitest'
import { EJERCICIOS_BASE } from './ejercicios'
import {
  adherencia,
  claveSemana,
  historialEjercicio,
  mejorRm1DeSesion,
  recordsPorEjercicio,
  resumenSemanal,
  rm1Estimado,
  seriesEfectivasSesion,
  seriesPorGrupo,
  sugerirCarga,
  tonelajeSesion,
} from './entrenamiento'
import type { Ejercicio, SerieRegistrada, Sesion } from './types'

const pressBanca = EJERCICIOS_BASE.find((e) => e.id === 'press_banca')!
const buscar = (id: string): Ejercicio | undefined => EJERCICIOS_BASE.find((e) => e.id === id)

function serie(pesoKg: number, reps: number, extra: Partial<SerieRegistrada> = {}): SerieRegistrada {
  return { id: `s-${Math.random()}`, pesoKg, reps, tipo: 'normal', completada: true, ...extra }
}

function sesion(fecha: string, ejercicioId: string, series: SerieRegistrada[]): Sesion {
  return {
    id: `x-${fecha}-${ejercicioId}`,
    fecha,
    inicio: `${fecha}T10:00:00.000Z`,
    fin: `${fecha}T11:00:00.000Z`,
    nombre: 'Test',
    ejercicios: [{ ejercicioId, series }],
  }
}

describe('rm1Estimado', () => {
  it('con una repetición devuelve prácticamente el peso', () => {
    expect(rm1Estimado(100, 1)).toBeCloseTo(103.3, 1)
  })

  it('suma el RIR a las repeticiones porque indica margen', () => {
    expect(rm1Estimado(100, 5, 2)).toBeGreaterThan(rm1Estimado(100, 5, 0)!)
  })

  it('descarta series demasiado largas para ser fiables', () => {
    expect(rm1Estimado(50, 25)).toBeUndefined()
  })

  it('descarta entradas inválidas', () => {
    expect(rm1Estimado(0, 5)).toBeUndefined()
    expect(rm1Estimado(50, 0)).toBeUndefined()
  })
})

describe('series efectivas', () => {
  it('no cuenta calentamientos ni series sin completar', () => {
    const s = sesion('2026-02-02', 'press_banca', [
      serie(60, 10, { tipo: 'calentamiento' }),
      serie(80, 8),
      serie(80, 8, { completada: false }),
    ])
    expect(seriesEfectivasSesion(s)).toBe(1)
    expect(tonelajeSesion(s)).toBe(640)
  })
})

describe('seriesPorGrupo', () => {
  it('cuenta el grupo principal entero y los secundarios a medias', () => {
    const s = sesion('2026-02-02', 'press_banca', [serie(80, 8), serie(80, 8)])
    const grupos = seriesPorGrupo([s], buscar)
    expect(grupos.pecho).toBe(2)
    expect(grupos.triceps).toBe(1)
    expect(grupos.hombros).toBe(1)
  })
})

describe('sugerirCarga', () => {
  const plan = { repsMin: 6, repsMax: 10, rir: 1 }

  it('sube el peso cuando se cierra el tope del rango con el RIR previsto', () => {
    const historial = historialEjercicio(
      [sesion('2026-02-02', 'press_banca', [serie(80, 10, { rir: 1 }), serie(80, 10, { rir: 1 })])],
      'press_banca',
    )
    const s = sugerirCarga(historial, plan, pressBanca)
    expect(s?.progresa).toBe(true)
    expect(s?.pesoKg).toBe(82.5)
    expect(s?.reps).toBe(6)
  })

  it('no sube si el RIR fue mayor que el previsto', () => {
    const historial = historialEjercicio(
      [sesion('2026-02-02', 'press_banca', [serie(80, 10, { rir: 3 })])],
      'press_banca',
    )
    const s = sugerirCarga(historial, plan, pressBanca)
    expect(s?.progresa).toBe(false)
  })

  it('mantiene el peso y pide una repetición más dentro del rango', () => {
    const historial = historialEjercicio(
      [sesion('2026-02-02', 'press_banca', [serie(80, 8, { rir: 1 }), serie(80, 7, { rir: 0 })])],
      'press_banca',
    )
    const s = sugerirCarga(historial, plan, pressBanca)
    expect(s?.progresa).toBe(false)
    expect(s?.pesoKg).toBe(80)
    expect(s?.reps).toBe(8)
  })

  it('baja la carga si no se llegó al mínimo del rango', () => {
    const historial = historialEjercicio(
      [sesion('2026-02-02', 'press_banca', [serie(90, 4, { rir: 0 })])],
      'press_banca',
    )
    const s = sugerirCarga(historial, plan, pressBanca)
    expect(s?.pesoKg).toBe(87.5)
    expect(s?.reps).toBe(6)
  })

  it('sin historial no sugiere nada', () => {
    expect(sugerirCarga([], plan, pressBanca)).toBeUndefined()
  })

  it('en ejercicios sin carga añadible sugiere más repeticiones', () => {
    const flexiones = EJERCICIOS_BASE.find((e) => e.id === 'flexiones')!
    const historial = historialEjercicio(
      [sesion('2026-02-02', 'flexiones', [serie(0, 25, { rir: 1 })])],
      'flexiones',
    )
    const s = sugerirCarga(historial, { repsMin: 10, repsMax: 25, rir: 1 }, flexiones)
    expect(s?.progresa).toBe(true)
    expect(s?.reps).toBe(27)
  })
})

describe('recordsPorEjercicio', () => {
  it('se queda con el mejor 1RM estimado de todo el historial', () => {
    const sesiones = [
      sesion('2026-02-02', 'press_banca', [serie(80, 8)]),
      sesion('2026-02-09', 'press_banca', [serie(85, 8)]),
      sesion('2026-02-16', 'press_banca', [serie(82.5, 6)]),
    ]
    const record = recordsPorEjercicio(sesiones).get('press_banca')
    expect(record?.fecha).toBe('2026-02-09')
    expect(record?.pesoKg).toBe(85)
  })

  it('ignora sesiones sin cerrar', () => {
    const abierta: Sesion = { ...sesion('2026-02-20', 'press_banca', [serie(200, 5)]) }
    delete abierta.fin
    expect(recordsPorEjercicio([abierta]).size).toBe(0)
  })
})

describe('mejorRm1DeSesion', () => {
  it('toma la mejor serie del ejercicio', () => {
    const s = sesion('2026-02-02', 'press_banca', [serie(70, 10), serie(90, 5)])
    expect(mejorRm1DeSesion(s.ejercicios[0]!)).toBeCloseTo(105, 0)
  })
})

describe('resumenSemanal y adherencia', () => {
  const hoy = new Date('2026-02-18T12:00:00') // miércoles

  it('agrupa las sesiones por semana natural', () => {
    const sesiones = [
      sesion('2026-02-16', 'press_banca', [serie(80, 8)]), // lunes de esta semana
      sesion('2026-02-17', 'press_banca', [serie(80, 8)]),
      sesion('2026-02-10', 'press_banca', [serie(80, 8)]), // semana anterior
    ]
    const semanas = resumenSemanal(sesiones, 2, hoy)
    expect(semanas).toHaveLength(2)
    expect(semanas[0]!.sesiones).toBe(1)
    expect(semanas[1]!.sesiones).toBe(2)
  })

  it('calcula el porcentaje de cumplimiento del plan', () => {
    const sesiones = ['2026-02-16', '2026-02-17', '2026-02-09', '2026-02-10'].map((f) =>
      sesion(f, 'press_banca', [serie(80, 8)]),
    )
    // 4 sesiones hechas sobre 3/semana × 4 semanas = 12 previstas.
    expect(adherencia(sesiones, 3, 4, hoy)).toBe(33)
  })

  it('sin plan de días no devuelve adherencia', () => {
    expect(adherencia([], 0)).toBeUndefined()
  })
})

describe('claveSemana', () => {
  it('asigna la misma semana ISO a lunes y domingo del mismo bloque', () => {
    expect(claveSemana('2026-02-16')).toBe(claveSemana('2026-02-22'))
    expect(claveSemana('2026-02-16')).not.toBe(claveSemana('2026-02-23'))
  })
})
