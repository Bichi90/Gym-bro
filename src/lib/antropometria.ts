import type { Medicion, NivelActividad, Perfil, Sexo } from './types'

/** Índice de masa corporal. */
export function imc(pesoKg: number, alturaCm: number): number | undefined {
  if (!pesoKg || !alturaCm) return undefined
  const m = alturaCm / 100
  return pesoKg / (m * m)
}

export function clasificacionImc(valor: number): string {
  if (valor < 18.5) return 'Bajo peso'
  if (valor < 25) return 'Normal'
  if (valor < 30) return 'Sobrepeso'
  return 'Obesidad'
}

/**
 * % de grasa estimado por el método de la US Navy (circunferencias, en cm).
 * Hombres: cuello + cintura. Mujeres: cuello + cintura + cadera.
 */
export function grasaNavy(m: Medicion, sexo: Sexo, alturaCm: number): number | undefined {
  if (!alturaCm || !m.cuelloCm || !m.cinturaCm) return undefined
  if (sexo === 'masculino') {
    const base = m.cinturaCm - m.cuelloCm
    if (base <= 0) return undefined
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(base) + 0.15456 * Math.log10(alturaCm)) - 450
    return redondear(clamp(bf, 2, 60), 1)
  }
  if (!m.caderaCm) return undefined
  const base = m.cinturaCm + m.caderaCm - m.cuelloCm
  if (base <= 0) return undefined
  const bf = 495 / (1.29579 - 0.35004 * Math.log10(base) + 0.221 * Math.log10(alturaCm)) - 450
  return redondear(clamp(bf, 5, 65), 1)
}

/** % de grasa a usar: el medido si existe, si no el estimado por circunferencias. */
export function grasaEfectiva(
  m: Medicion,
  sexo: Sexo,
  alturaCm: number,
): { valor: number; fuente: 'medido' | 'estimado' } | undefined {
  if (m.grasaPct != null) return { valor: m.grasaPct, fuente: 'medido' }
  const navy = grasaNavy(m, sexo, alturaCm)
  return navy == null ? undefined : { valor: navy, fuente: 'estimado' }
}

/** Masa magra (kg) a partir del peso y el % de grasa. */
export function masaMagra(pesoKg: number, grasaPct: number): number {
  return pesoKg * (1 - grasaPct / 100)
}

/** Masa grasa (kg). */
export function masaGrasa(pesoKg: number, grasaPct: number): number {
  return pesoKg * (grasaPct / 100)
}

export function edadDesde(fechaNacimiento: string | undefined, hoy = new Date()): number | undefined {
  if (!fechaNacimiento) return undefined
  const n = new Date(fechaNacimiento + 'T00:00:00')
  if (Number.isNaN(n.getTime())) return undefined
  let edad = hoy.getFullYear() - n.getFullYear()
  const mes = hoy.getMonth() - n.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < n.getDate())) edad--
  return edad >= 0 && edad < 130 ? edad : undefined
}

/** Metabolismo basal por Mifflin-St Jeor (kcal/día). */
export function tmbMifflin(pesoKg: number, alturaCm: number, edad: number, sexo: Sexo): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad
  return base + (sexo === 'masculino' ? 5 : -161)
}

/** Metabolismo basal por Katch-McArdle (kcal/día); necesita masa magra. */
export function tmbKatch(masaMagraKg: number): number {
  return 370 + 21.6 * masaMagraKg
}

const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  alto: 1.725,
}

export const ETIQUETA_ACTIVIDAD: Record<NivelActividad, string> = {
  sedentario: 'Sedentario (trabajo de oficina)',
  ligero: 'Ligero (camino algo, de pie a ratos)',
  moderado: 'Moderado (bastante movimiento diario)',
  alto: 'Alto (trabajo físico)',
}

/**
 * Gasto energético diario. El factor de actividad cubre el día a día y se suma
 * un extra por cada sesión de gimnasio semanal (~0,025 por sesión).
 */
export function gastoDiario(tmb: number, actividad: NivelActividad, diasEntreno: number): number {
  const factor = (FACTOR_ACTIVIDAD[actividad] ?? 1.375) + Math.min(diasEntreno, 7) * 0.025
  return tmb * factor
}

export interface ResumenAntropometrico {
  pesoKg: number
  alturaCm: number
  edad?: number
  imc?: number
  grasaPct?: number
  fuenteGrasa?: 'medido' | 'estimado'
  masaMagraKg?: number
  masaGrasaKg?: number
  tmb?: number
  fuenteTmb?: 'Katch-McArdle' | 'Mifflin-St Jeor'
  tdee?: number
  cinturaAltura?: number
  ratioCinturaCadera?: number
}

/** Calcula todos los derivados de una medición. */
export function resumirMedicion(
  m: Medicion,
  perfil: Perfil,
  diasEntreno: number,
  hoy = new Date(),
): ResumenAntropometrico {
  const edad = edadDesde(perfil.fechaNacimiento, hoy)
  const grasa = grasaEfectiva(m, perfil.sexo, perfil.alturaCm)
  const magra = grasa ? masaMagra(m.pesoKg, grasa.valor) : undefined

  let tmb: number | undefined
  let fuenteTmb: ResumenAntropometrico['fuenteTmb']
  if (magra != null) {
    tmb = tmbKatch(magra)
    fuenteTmb = 'Katch-McArdle'
  } else if (edad != null && perfil.alturaCm) {
    tmb = tmbMifflin(m.pesoKg, perfil.alturaCm, edad, perfil.sexo)
    fuenteTmb = 'Mifflin-St Jeor'
  }

  return {
    pesoKg: m.pesoKg,
    alturaCm: perfil.alturaCm,
    edad,
    imc: imc(m.pesoKg, perfil.alturaCm),
    grasaPct: grasa?.valor,
    fuenteGrasa: grasa?.fuente,
    masaMagraKg: magra,
    masaGrasaKg: grasa ? masaGrasa(m.pesoKg, grasa.valor) : undefined,
    tmb,
    fuenteTmb,
    tdee: tmb != null ? gastoDiario(tmb, perfil.actividad, diasEntreno) : undefined,
    cinturaAltura: m.cinturaCm && perfil.alturaCm ? m.cinturaCm / perfil.alturaCm : undefined,
    ratioCinturaCadera: m.cinturaCm && m.caderaCm ? m.cinturaCm / m.caderaCm : undefined,
  }
}

/** Mediciones ordenadas de la más antigua a la más reciente. */
export function ordenarMediciones(ms: Medicion[]): Medicion[] {
  return [...ms].sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function ultimaMedicion(ms: Medicion[]): Medicion | undefined {
  return ordenarMediciones(ms).at(-1)
}

/**
 * Media móvil del peso para filtrar el ruido diario (agua, comida, sal).
 * Devuelve un punto por medición con la media de los últimos `ventana` días.
 */
export function mediaMovilPeso(ms: Medicion[], ventana = 7): { fecha: string; valor: number }[] {
  const orden = ordenarMediciones(ms)
  return orden.map((m, i) => {
    const limite = new Date(m.fecha + 'T00:00:00').getTime() - (ventana - 1) * 86400000
    let suma = 0
    let n = 0
    for (let j = i; j >= 0; j--) {
      const item = orden[j]!
      if (new Date(item.fecha + 'T00:00:00').getTime() < limite) break
      suma += item.pesoKg
      n++
    }
    return { fecha: m.fecha, valor: suma / n }
  })
}

/** Cambio de peso por semana (kg) usando regresión lineal sobre las mediciones del periodo. */
export function tendenciaPesoSemanal(ms: Medicion[], dias = 28, hoy = new Date()): number | undefined {
  const desde = hoy.getTime() - dias * 86400000
  const puntos = ordenarMediciones(ms)
    .map((m) => ({ t: new Date(m.fecha + 'T00:00:00').getTime(), y: m.pesoKg }))
    .filter((p) => p.t >= desde)
  if (puntos.length < 2) return undefined

  const n = puntos.length
  const mediaT = puntos.reduce((s, p) => s + p.t, 0) / n
  const mediaY = puntos.reduce((s, p) => s + p.y, 0) / n
  let num = 0
  let den = 0
  for (const p of puntos) {
    num += (p.t - mediaT) * (p.y - mediaY)
    den += (p.t - mediaT) ** 2
  }
  if (den === 0) return undefined
  const pendientePorMs = num / den
  return pendientePorMs * 7 * 86400000
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function redondear(v: number, decimales = 1): number {
  const f = 10 ** decimales
  return Math.round(v * f) / f
}
