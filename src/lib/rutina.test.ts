import { describe, expect, it } from 'vitest'
import { EJERCICIOS_BASE } from './ejercicios'
import { seriesPlanificadasPorGrupo } from './entrenamiento'
import { elegirPlantilla, generarRutina, volumenRecomendado } from './rutina'
import type { Objetivo, Perfil } from './types'

const perfil: Perfil = {
  nombre: 'Test',
  sexo: 'masculino',
  fechaNacimiento: '1990-06-15',
  alturaCm: 178,
  experiencia: 'intermedio',
  actividad: 'ligero',
  equipamiento: ['barra', 'mancuernas', 'maquina', 'polea', 'peso_corporal'],
  unidad: 'kg',
}

const objetivo: Objetivo = {
  tipo: 'hipertrofia',
  diasPorSemana: 4,
  minutosPorSesion: 75,
  prioridades: [],
  objetivosFuerza: [],
}

const buscar = (id: string) => EJERCICIOS_BASE.find((e) => e.id === id)

describe('elegirPlantilla', () => {
  it('da full body a los principiantes de tres días', () => {
    expect(elegirPlantilla(3, 'principiante').split).toContain('Full body')
  })

  it('da empuje/tirón/pierna a los intermedios de tres días', () => {
    expect(elegirPlantilla(3, 'intermedio').split).toContain('Empuje')
  })

  it('reparte torso y pierna en cuatro días', () => {
    expect(elegirPlantilla(4, 'intermedio').dias).toHaveLength(4)
  })

  it('recorta los días fuera de rango', () => {
    expect(elegirPlantilla(9, 'avanzado').dias).toHaveLength(6)
    expect(elegirPlantilla(0, 'principiante').dias).toHaveLength(1)
  })
})

describe('generarRutina', () => {
  it('crea un día por sesión semanal y ningún día vacío', () => {
    const rutina = generarRutina({ perfil, objetivo })
    expect(rutina.dias).toHaveLength(4)
    for (const dia of rutina.dias) {
      expect(dia.ejercicios.length).toBeGreaterThan(0)
    }
  })

  it('no repite ejercicios dentro del mismo día', () => {
    const rutina = generarRutina({ perfil, objetivo })
    for (const dia of rutina.dias) {
      const ids = dia.ejercicios.map((e) => e.ejercicioId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('solo usa ejercicios del equipamiento disponible', () => {
    const rutina = generarRutina({
      perfil: { ...perfil, equipamiento: ['peso_corporal'] },
      objetivo,
    })
    for (const dia of rutina.dias) {
      for (const item of dia.ejercicios) {
        expect(buscar(item.ejercicioId)?.equipamiento).toBe('peso_corporal')
      }
    }
  })

  it('usa peso corporal si no se marcó ningún equipamiento', () => {
    const rutina = generarRutina({ perfil: { ...perfil, equipamiento: [] }, objetivo })
    expect(rutina.dias.flatMap((d) => d.ejercicios).length).toBeGreaterThan(0)
  })

  it('el objetivo de fuerza usa menos repeticiones que el de hipertrofia', () => {
    const fuerza = generarRutina({ perfil, objetivo: { ...objetivo, tipo: 'fuerza' } })
    const hipertrofia = generarRutina({ perfil, objetivo: { ...objetivo, tipo: 'hipertrofia' } })
    const repsMax = (r: typeof fuerza) =>
      Math.min(...r.dias.flatMap((d) => d.ejercicios).map((e) => e.repsMax))
    expect(repsMax(fuerza)).toBeLessThan(repsMax(hipertrofia))
  })

  it('el objetivo de pérdida de grasa descansa menos', () => {
    const perdida = generarRutina({ perfil, objetivo: { ...objetivo, tipo: 'perdida_grasa' } })
    const fuerza = generarRutina({ perfil, objetivo: { ...objetivo, tipo: 'fuerza' } })
    const medio = (r: typeof perdida) => {
      const items = r.dias.flatMap((d) => d.ejercicios)
      return items.reduce((t, e) => t + e.descansoSeg, 0) / items.length
    }
    expect(medio(perdida)).toBeLessThan(medio(fuerza))
  })

  it('las sesiones caben en el tiempo disponible', () => {
    const rutina = generarRutina({ perfil, objetivo: { ...objetivo, minutosPorSesion: 45 } })
    for (const dia of rutina.dias) {
      const segundos = dia.ejercicios.reduce((t, e) => t + e.series * (45 + e.descansoSeg), 0)
      // Se permiten tres ejercicios mínimos aunque se pasen del presupuesto.
      expect(dia.ejercicios.length <= 3 || segundos <= 45 * 60).toBe(true)
    }
  })

  it('los grupos priorizados reciben más volumen', () => {
    const sinPrioridad = generarRutina({ perfil, objetivo })
    const conPrioridad = generarRutina({ perfil, objetivo: { ...objetivo, prioridades: ['hombros'] } })
    const hombros = (r: typeof sinPrioridad) => seriesPlanificadasPorGrupo(r.dias, buscar).hombros ?? 0
    expect(hombros(conPrioridad)).toBeGreaterThan(hombros(sinPrioridad))
  })

  it('cubre los grandes grupos musculares a lo largo de la semana', () => {
    const rutina = generarRutina({ perfil, objetivo })
    const volumen = seriesPlanificadasPorGrupo(rutina.dias, buscar)
    for (const grupo of ['pecho', 'espalda', 'cuadriceps', 'isquios'] as const) {
      expect(volumen[grupo] ?? 0).toBeGreaterThan(0)
    }
  })

  it('el rango de repeticiones siempre deja margen para progresar', () => {
    const tipos = ['fuerza', 'hipertrofia', 'perdida_grasa', 'recomposicion', 'mantenimiento'] as const
    for (const experiencia of ['principiante', 'intermedio', 'avanzado'] as const) {
      for (const tipo of tipos) {
        const rutina = generarRutina({
          perfil: { ...perfil, experiencia },
          objetivo: { ...objetivo, tipo, prioridades: ['hombros', 'biceps'] },
        })
        for (const item of rutina.dias.flatMap((d) => d.ejercicios)) {
          expect(item.repsMax - item.repsMin).toBeGreaterThanOrEqual(2)
          expect(item.series).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('volumenRecomendado', () => {
  it('sube con la experiencia', () => {
    const principiante = volumenRecomendado('principiante', 'hipertrofia')
    const avanzado = volumenRecomendado('avanzado', 'hipertrofia')
    expect(avanzado.pecho[1]).toBeGreaterThan(principiante.pecho[1])
  })

  it('pide menos volumen a los grupos pequeños', () => {
    const v = volumenRecomendado('intermedio', 'hipertrofia')
    expect(v.biceps[1]).toBeLessThan(v.espalda[1])
  })

  it('sube el rango de los grupos priorizados', () => {
    const normal = volumenRecomendado('intermedio', 'hipertrofia')
    const priorizado = volumenRecomendado('intermedio', 'hipertrofia', ['pecho'])
    expect(priorizado.pecho[1]).toBeGreaterThan(normal.pecho[1])
  })
})
