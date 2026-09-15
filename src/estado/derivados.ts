import { useMemo } from 'react'
import { resumirMedicion, tendenciaPesoSemanal, ultimaMedicion, type ResumenAntropometrico } from '../lib/antropometria'
import { adherencia, recordsPorEjercicio, resumenSemanal } from '../lib/entrenamiento'
import { planNutricional, proyectar, type PlanNutricional, type Proyeccion } from '../lib/objetivo'
import type { Medicion, Sesion } from '../lib/types'
import { useAlmacen } from './almacen'

export interface Derivados {
  medicionActual?: Medicion
  resumen?: ResumenAntropometrico
  plan?: PlanNutricional
  proyeccion?: Proyeccion
  tendenciaKgSemana?: number
  sesionesCompletadas: Sesion[]
  ultimaSesion?: Sesion
  adherenciaPct?: number
  semanas: ReturnType<typeof resumenSemanal>
  records: ReturnType<typeof recordsPorEjercicio>
}

/** Derivados que casi todas las pantallas necesitan, calculados una sola vez. */
export function useDerivados(): Derivados {
  const { estado } = useAlmacen()

  return useMemo(() => {
    const medicionActual = ultimaMedicion(estado.mediciones)
    const resumen = medicionActual
      ? resumirMedicion(medicionActual, estado.perfil, estado.objetivo.diasPorSemana)
      : undefined
    const tendenciaKgSemana = tendenciaPesoSemanal(estado.mediciones)
    const plan = resumen ? planNutricional(resumen, estado.objetivo) : undefined
    const proyeccion = resumen ? proyectar(resumen, estado.objetivo, plan, tendenciaKgSemana) : undefined

    const sesionesCompletadas = estado.sesiones
      .filter((s) => s.fin)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.inicio ?? '').localeCompare(a.inicio ?? ''))

    return {
      medicionActual,
      resumen,
      plan,
      proyeccion,
      tendenciaKgSemana,
      sesionesCompletadas,
      ultimaSesion: sesionesCompletadas[0],
      adherenciaPct: adherencia(sesionesCompletadas, estado.objetivo.diasPorSemana),
      semanas: resumenSemanal(sesionesCompletadas, 8),
      records: recordsPorEjercicio(sesionesCompletadas),
    }
  }, [estado.mediciones, estado.perfil, estado.objetivo, estado.sesiones])
}
