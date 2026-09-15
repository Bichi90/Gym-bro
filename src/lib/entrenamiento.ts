import { redondear } from './antropometria'
import type {
  Ejercicio,
  EjercicioRegistrado,
  GrupoMuscular,
  SeriePlanificada,
  SerieRegistrada,
  Sesion,
} from './types'

/** Serie que cuenta para el volumen: efectiva y completada. */
export function esSerieEfectiva(s: SerieRegistrada): boolean {
  return s.completada && s.tipo !== 'calentamiento' && s.reps > 0
}

/**
 * 1RM estimado (Epley). Si se registró RIR, las repeticiones en reserva se suman
 * porque indican cuántas más se podrían haber hecho.
 */
export function rm1Estimado(pesoKg: number, reps: number, rir = 0): number | undefined {
  if (pesoKg <= 0 || reps <= 0) return undefined
  const repsEfectivas = reps + Math.max(0, rir)
  if (repsEfectivas > 20) return undefined // fuera de rango fiable
  return redondear(pesoKg * (1 + repsEfectivas / 30), 1)
}

/** Peso estimado para un número de repeticiones dado, a partir de un 1RM. */
export function pesoPara(rm1Kg: number, reps: number): number {
  return redondear(rm1Kg / (1 + reps / 30), 1)
}

/** Mejor 1RM estimado de un ejercicio dentro de una sesión. */
export function mejorRm1DeSesion(reg: EjercicioRegistrado): number | undefined {
  let mejor: number | undefined
  for (const s of reg.series) {
    if (!esSerieEfectiva(s)) continue
    const e = rm1Estimado(s.pesoKg, s.reps, s.rir ?? 0)
    if (e != null && (mejor == null || e > mejor)) mejor = e
  }
  return mejor
}

/** Tonelaje de una serie (kg levantados). */
export function tonelajeSerie(s: SerieRegistrada): number {
  return esSerieEfectiva(s) ? s.pesoKg * s.reps : 0
}

export function tonelajeSesion(sesion: Sesion): number {
  return sesion.ejercicios.reduce(
    (total, e) => total + e.series.reduce((t, s) => t + tonelajeSerie(s), 0),
    0,
  )
}

export function seriesEfectivasSesion(sesion: Sesion): number {
  return sesion.ejercicios.reduce((total, e) => total + e.series.filter(esSerieEfectiva).length, 0)
}

/**
 * Series por grupo muscular. El grupo principal suma 1 por serie y los
 * secundarios 0,5, que es la convención habitual para contar volumen efectivo.
 */
export function seriesPorGrupo(
  sesiones: Sesion[],
  buscar: (id: string) => Ejercicio | undefined,
): Record<GrupoMuscular, number> {
  const acc = {} as Record<GrupoMuscular, number>
  for (const sesion of sesiones) {
    for (const reg of sesion.ejercicios) {
      const ej = buscar(reg.ejercicioId)
      if (!ej) continue
      const n = reg.series.filter(esSerieEfectiva).length
      if (!n) continue
      acc[ej.principal] = (acc[ej.principal] ?? 0) + n
      for (const sec of ej.secundarios) acc[sec] = (acc[sec] ?? 0) + n * 0.5
    }
  }
  return acc
}

/** Series semanales planificadas por grupo muscular en una rutina. */
export function seriesPlanificadasPorGrupo(
  dias: { ejercicios: SeriePlanificada[] }[],
  buscar: (id: string) => Ejercicio | undefined,
): Record<GrupoMuscular, number> {
  const acc = {} as Record<GrupoMuscular, number>
  for (const dia of dias) {
    for (const item of dia.ejercicios) {
      const ej = buscar(item.ejercicioId)
      if (!ej) continue
      acc[ej.principal] = (acc[ej.principal] ?? 0) + item.series
      for (const sec of ej.secundarios) acc[sec] = (acc[sec] ?? 0) + item.series * 0.5
    }
  }
  return acc
}

export interface RegistroHistorico {
  fecha: string
  sesionId: string
  registro: EjercicioRegistrado
}

/** Historial de un ejercicio, de la sesión más reciente a la más antigua. */
export function historialEjercicio(sesiones: Sesion[], ejercicioId: string): RegistroHistorico[] {
  return sesiones
    .filter((s) => s.fin)
    .flatMap((s) =>
      s.ejercicios
        .filter((e) => e.ejercicioId === ejercicioId && e.series.some(esSerieEfectiva))
        .map((registro) => ({ fecha: s.fecha, sesionId: s.id, registro })),
    )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

/** Número con separador decimal español, para los textos de las sugerencias. */
function fmt(v: number): string {
  return v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export interface Sugerencia {
  pesoKg: number
  reps: number
  motivo: string
  progresa: boolean
}

/**
 * Doble progresión: se sube el peso cuando todas las series efectivas llegaron
 * al tope del rango cumpliendo el RIR objetivo; si no, se repite el peso
 * buscando una repetición más.
 */
export function sugerirCarga(
  historial: RegistroHistorico[],
  plan: { repsMin: number; repsMax: number; rir: number },
  ejercicio: Ejercicio,
): Sugerencia | undefined {
  const ultima = historial[0]
  if (!ultima) return undefined

  const efectivas = ultima.registro.series.filter(esSerieEfectiva)
  if (!efectivas.length) return undefined

  const pesoBase = Math.max(...efectivas.map((s) => s.pesoKg))
  const seriesAlPeso = efectivas.filter((s) => s.pesoKg === pesoBase)
  const minReps = Math.min(...seriesAlPeso.map((s) => s.reps))
  const rirOk = seriesAlPeso.every((s) => (s.rir ?? 0) <= plan.rir)

  if (minReps >= plan.repsMax && rirOk) {
    const incremento = ejercicio.incrementoKg
    if (incremento === 0) {
      return {
        pesoKg: pesoBase,
        reps: plan.repsMax + 2,
        motivo: `Completaste ${plan.repsMax} repeticiones en todas las series. Sin carga que añadir, sumá repeticiones o hacelo más lento.`,
        progresa: true,
      }
    }
    return {
      pesoKg: redondear(pesoBase + incremento, 2),
      reps: plan.repsMin,
      motivo: `Cerraste ${minReps} repeticiones en todas las series con RIR ${plan.rir} o menos: subí ${fmt(incremento)} kg y volvé a ${plan.repsMin}.`,
      progresa: true,
    }
  }

  if (minReps < plan.repsMin) {
    const bajado = redondear(Math.max(0, pesoBase - ejercicio.incrementoKg), 2)
    return {
      pesoKg: bajado || pesoBase,
      reps: plan.repsMin,
      motivo: `La última vez te quedaste en ${minReps} repeticiones, por debajo del rango. Bajá algo la carga y consolidá ${plan.repsMin}.`,
      progresa: false,
    }
  }

  return {
    pesoKg: pesoBase,
    reps: Math.min(plan.repsMax, minReps + 1),
    motivo: `Mantené ${fmt(pesoBase)} kg y buscá ${Math.min(plan.repsMax, minReps + 1)} repeticiones en todas las series.`,
    progresa: false,
  }
}

/** Récord personal de 1RM estimado por ejercicio. */
export interface Record1RM {
  ejercicioId: string
  rm1Kg: number
  fecha: string
  pesoKg: number
  reps: number
}

export function recordsPorEjercicio(sesiones: Sesion[]): Map<string, Record1RM> {
  const mapa = new Map<string, Record1RM>()
  for (const sesion of sesiones) {
    if (!sesion.fin) continue
    for (const reg of sesion.ejercicios) {
      for (const s of reg.series) {
        if (!esSerieEfectiva(s)) continue
        const e = rm1Estimado(s.pesoKg, s.reps, s.rir ?? 0)
        if (e == null) continue
        const actual = mapa.get(reg.ejercicioId)
        if (!actual || e > actual.rm1Kg) {
          mapa.set(reg.ejercicioId, {
            ejercicioId: reg.ejercicioId,
            rm1Kg: e,
            fecha: sesion.fecha,
            pesoKg: s.pesoKg,
            reps: s.reps,
          })
        }
      }
    }
  }
  return mapa
}

/** Clave ISO de semana (por ejemplo `2026-W07`) para agrupar sesiones. */
export function claveSemana(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00')
  const jueves = new Date(d)
  jueves.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const primeroDeAnio = new Date(jueves.getFullYear(), 0, 1)
  const semana = Math.ceil(((jueves.getTime() - primeroDeAnio.getTime()) / 86400000 + 1) / 7)
  return `${jueves.getFullYear()}-W${String(semana).padStart(2, '0')}`
}

export function inicioDeSemana(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const dia = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - dia)
  return d
}

export function aFechaISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export interface ResumenSemana {
  semana: string
  inicio: string
  sesiones: number
  seriesEfectivas: number
  tonelajeKg: number
}

/** Resumen por semana de las últimas `semanas` semanas, de la más antigua a la actual. */
export function resumenSemanal(sesiones: Sesion[], semanas = 8, hoy = new Date()): ResumenSemana[] {
  const salida: ResumenSemana[] = []
  const lunesActual = inicioDeSemana(hoy)
  for (let i = semanas - 1; i >= 0; i--) {
    const inicio = new Date(lunesActual.getTime() - i * 7 * 86400000)
    const fin = new Date(inicio.getTime() + 7 * 86400000)
    const dentro = sesiones.filter((s) => {
      if (!s.fin) return false
      const t = new Date(s.fecha + 'T00:00:00').getTime()
      return t >= inicio.getTime() && t < fin.getTime()
    })
    salida.push({
      semana: claveSemana(aFechaISO(inicio)),
      inicio: aFechaISO(inicio),
      sesiones: dentro.length,
      seriesEfectivas: dentro.reduce((t, s) => t + seriesEfectivasSesion(s), 0),
      tonelajeKg: Math.round(dentro.reduce((t, s) => t + tonelajeSesion(s), 0)),
    })
  }
  return salida
}

/** Adherencia: sesiones completadas frente a las planificadas en el periodo. */
export function adherencia(sesiones: Sesion[], diasPorSemana: number, semanas = 4, hoy = new Date()): number | undefined {
  if (diasPorSemana <= 0) return undefined
  const resumen = resumenSemanal(sesiones, semanas, hoy)
  const hechas = resumen.reduce((t, s) => t + s.sesiones, 0)
  const previstas = diasPorSemana * semanas
  return previstas ? Math.round((hechas / previstas) * 100) : undefined
}
