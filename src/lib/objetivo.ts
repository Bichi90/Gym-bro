import { clamp, redondear, type ResumenAntropometrico } from './antropometria'
import type { Objetivo, TipoObjetivo } from './types'

export const ETIQUETA_OBJETIVO: Record<TipoObjetivo, string> = {
  perdida_grasa: 'Perder grasa',
  hipertrofia: 'Ganar músculo',
  fuerza: 'Ganar fuerza',
  recomposicion: 'Recomposición',
  mantenimiento: 'Mantenimiento',
}

export const DESCRIPCION_OBJETIVO: Record<TipoObjetivo, string> = {
  perdida_grasa: 'Déficit calórico moderado, volumen alto y cargas suficientes para conservar músculo.',
  hipertrofia: 'Superávit controlado y volumen progresivo en rangos de 6 a 15 repeticiones.',
  fuerza: 'Calorías de mantenimiento o algo más, series pesadas de 3 a 6 repeticiones y descansos largos.',
  recomposicion: 'Calorías cerca del mantenimiento, proteína alta y progresión de cargas constante.',
  mantenimiento: 'Sostener peso y rendimiento con un volumen de mantenimiento.',
}

const KCAL_POR_KG_GRASA = 7700

/** kg por semana que es razonable perder o ganar, como % del peso corporal. */
const RITMO_SEGURO = {
  perdida_grasa: { min: 0.0025, max: 0.01 }, // 0,25 % a 1 % del peso por semana
  ganancia: { min: 0.001, max: 0.005 }, // 0,1 % a 0,5 % del peso por semana
}

export interface PlanNutricional {
  mantenimientoKcal: number
  objetivoKcal: number
  deltaKcal: number
  proteinaG: number
  grasaG: number
  carbohidratoG: number
  /** Ritmo de cambio de peso implícito (kg/semana, negativo = bajada). */
  ritmoSemanalKg: number
}

/** Ajuste calórico por defecto según el tipo de objetivo (fracción sobre el mantenimiento). */
function ajustePorTipo(tipo: TipoObjetivo): number {
  switch (tipo) {
    case 'perdida_grasa':
      return -0.2
    case 'hipertrofia':
      return 0.1
    case 'fuerza':
      return 0.05
    case 'recomposicion':
      return -0.05
    case 'mantenimiento':
      return 0
  }
}

/** Proteína en g por kg de masa magra (si se conoce) o de peso corporal. */
function proteinaPorKg(tipo: TipoObjetivo, sobreMagra: boolean): number {
  const base: Record<TipoObjetivo, number> = {
    perdida_grasa: sobreMagra ? 2.6 : 2.2,
    hipertrofia: sobreMagra ? 2.4 : 2.0,
    fuerza: sobreMagra ? 2.2 : 1.9,
    recomposicion: sobreMagra ? 2.6 : 2.2,
    mantenimiento: sobreMagra ? 2.0 : 1.7,
  }
  return base[tipo]
}

/**
 * Calorías y macros. Si hay peso y fecha objetivo, el déficit o superávit se
 * calcula a partir del ritmo necesario, recortado siempre al rango seguro.
 */
export function planNutricional(
  resumen: ResumenAntropometrico,
  objetivo: Objetivo,
  hoy = new Date(),
): PlanNutricional | undefined {
  if (!resumen.tdee) return undefined
  const mantenimiento = resumen.tdee
  const peso = resumen.pesoKg

  let deltaKcal = mantenimiento * ajustePorTipo(objetivo.tipo)

  const ritmoNecesario = ritmoRequeridoKgSemana(resumen, objetivo, hoy)
  if (ritmoNecesario != null && ritmoNecesario !== 0) {
    const limites = ritmoNecesario < 0 ? RITMO_SEGURO.perdida_grasa : RITMO_SEGURO.ganancia
    const magnitud = clamp(Math.abs(ritmoNecesario), peso * limites.min, peso * limites.max)
    const ritmo = Math.sign(ritmoNecesario) * magnitud
    deltaKcal = (ritmo * KCAL_POR_KG_GRASA) / 7
  }

  const objetivoKcal = Math.max(mantenimiento * 0.6, mantenimiento + deltaKcal)
  const deltaReal = objetivoKcal - mantenimiento

  const sobreMagra = resumen.masaMagraKg != null
  const baseProteina = resumen.masaMagraKg ?? peso
  const proteinaG = Math.round(baseProteina * proteinaPorKg(objetivo.tipo, sobreMagra))
  const grasaG = Math.round(Math.max(peso * 0.7, (objetivoKcal * 0.22) / 9))
  const carbohidratoG = Math.max(0, Math.round((objetivoKcal - proteinaG * 4 - grasaG * 9) / 4))

  return {
    mantenimientoKcal: Math.round(mantenimiento),
    objetivoKcal: Math.round(objetivoKcal),
    deltaKcal: Math.round(deltaReal),
    proteinaG,
    grasaG,
    carbohidratoG,
    ritmoSemanalKg: redondear((deltaReal * 7) / KCAL_POR_KG_GRASA, 2),
  }
}

/** Ritmo (kg/semana) que haría falta para llegar al peso objetivo en la fecha objetivo. */
export function ritmoRequeridoKgSemana(
  resumen: ResumenAntropometrico,
  objetivo: Objetivo,
  hoy = new Date(),
): number | undefined {
  const destino = pesoObjetivoEfectivo(resumen, objetivo)
  if (destino == null || !objetivo.fechaObjetivo) return undefined
  const semanas = semanasHasta(objetivo.fechaObjetivo, hoy)
  if (semanas == null || semanas <= 0) return undefined
  return (destino - resumen.pesoKg) / semanas
}

/**
 * Peso objetivo. Si el usuario fijó un % de grasa en vez de un peso, se estima
 * el peso final asumiendo que la masa magra se conserva.
 */
export function pesoObjetivoEfectivo(resumen: ResumenAntropometrico, objetivo: Objetivo): number | undefined {
  if (objetivo.pesoObjetivoKg) return objetivo.pesoObjetivoKg
  if (objetivo.grasaObjetivoPct != null && resumen.masaMagraKg != null) {
    return redondear(resumen.masaMagraKg / (1 - objetivo.grasaObjetivoPct / 100), 1)
  }
  return undefined
}

export function semanasHasta(fecha: string, hoy = new Date()): number | undefined {
  const destino = new Date(fecha + 'T00:00:00').getTime()
  if (Number.isNaN(destino)) return undefined
  const dias = (destino - inicioDelDia(hoy).getTime()) / 86400000
  return dias / 7
}

function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export type Viabilidad = 'sin_fecha' | 'comodo' | 'exigente' | 'inviable' | 'vencido'

export interface Proyeccion {
  pesoObjetivoKg?: number
  ritmoRequeridoKgSemana?: number
  ritmoRealKgSemana?: number
  ritmoPlanKgSemana?: number
  semanasRestantes?: number
  /** Semanas que hacen falta al ritmo recomendado (plan) para llegar al objetivo. */
  semanasEstimadas?: number
  fechaEstimada?: string
  viabilidad: Viabilidad
  mensaje: string
}

/**
 * Compara lo que el objetivo exige con lo que el plan permite y con la tendencia
 * real de las mediciones.
 */
export function proyectar(
  resumen: ResumenAntropometrico,
  objetivo: Objetivo,
  plan: PlanNutricional | undefined,
  tendenciaRealKgSemana: number | undefined,
  hoy = new Date(),
): Proyeccion {
  const destino = pesoObjetivoEfectivo(resumen, objetivo)
  const requerido = ritmoRequeridoKgSemana(resumen, objetivo, hoy)
  const semanasRestantes = objetivo.fechaObjetivo ? semanasHasta(objetivo.fechaObjetivo, hoy) : undefined
  const ritmoPlan = plan?.ritmoSemanalKg

  const base: Proyeccion = {
    pesoObjetivoKg: destino,
    ritmoRequeridoKgSemana: requerido != null ? redondear(requerido, 2) : undefined,
    ritmoRealKgSemana: tendenciaRealKgSemana != null ? redondear(tendenciaRealKgSemana, 2) : undefined,
    ritmoPlanKgSemana: ritmoPlan,
    semanasRestantes: semanasRestantes != null ? redondear(semanasRestantes, 1) : undefined,
    viabilidad: 'sin_fecha',
    mensaje: '',
  }

  if (destino == null) {
    return { ...base, mensaje: 'Definí un peso objetivo o un % de grasa objetivo para ver la proyección.' }
  }

  const faltan = destino - resumen.pesoKg
  if (Math.abs(faltan) < 0.3) {
    return { ...base, viabilidad: 'comodo', mensaje: 'Ya estás en tu peso objetivo. Toca sostenerlo.' }
  }

  // Semanas necesarias al ritmo del plan.
  if (ritmoPlan && Math.sign(ritmoPlan) === Math.sign(faltan) && ritmoPlan !== 0) {
    const semanas = faltan / ritmoPlan
    base.semanasEstimadas = redondear(semanas, 1)
    base.fechaEstimada = sumarSemanas(hoy, semanas)
  }

  if (semanasRestantes == null) {
    return {
      ...base,
      viabilidad: 'sin_fecha',
      mensaje: base.fechaEstimada
        ? `Al ritmo del plan llegarías alrededor del ${formatoFecha(base.fechaEstimada)}.`
        : 'Definí una fecha objetivo para saber si el ritmo alcanza.',
    }
  }

  if (semanasRestantes <= 0) {
    return { ...base, viabilidad: 'vencido', mensaje: 'La fecha objetivo ya pasó. Actualizala para recalcular el plan.' }
  }

  const limites = faltan < 0 ? RITMO_SEGURO.perdida_grasa : RITMO_SEGURO.ganancia
  const maxSeguro = resumen.pesoKg * limites.max
  const exigencia = Math.abs(requerido ?? 0)

  if (exigencia > maxSeguro) {
    const semanasMin = Math.abs(faltan) / maxSeguro
    return {
      ...base,
      viabilidad: 'inviable',
      mensaje: `Harían falta ${fmt(exigencia)} kg/semana y el máximo razonable es ${fmt(maxSeguro)} kg/semana. Con un ritmo sano necesitás unas ${Math.ceil(semanasMin)} semanas (hasta el ${formatoFecha(sumarSemanas(hoy, semanasMin))}).`,
    }
  }

  if (exigencia > maxSeguro * 0.7) {
    return {
      ...base,
      viabilidad: 'exigente',
      mensaje: `Es alcanzable pero exigente: ${fmt(exigencia)} kg/semana durante ${Math.ceil(semanasRestantes)} semanas. Cuidá la proteína y el sueño para no perder músculo.`,
    }
  }

  return {
    ...base,
    viabilidad: 'comodo',
    mensaje: `Ritmo cómodo: ${fmt(exigencia)} kg/semana durante ${Math.ceil(semanasRestantes)} semanas.`,
  }
}

/** Número con separador decimal español, para los mensajes de la proyección. */
function fmt(v: number, decimales = 2): string {
  return v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: decimales })
}

export function sumarSemanas(desde: Date, semanas: number): string {
  const d = new Date(desde.getTime() + semanas * 7 * 86400000)
  return d.toISOString().slice(0, 10)
}

export function formatoFecha(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
