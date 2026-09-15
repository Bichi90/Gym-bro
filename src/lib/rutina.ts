import { EJERCICIOS_BASE } from './ejercicios'
import type {
  DiaRutina,
  Ejercicio,
  Equipamiento,
  Experiencia,
  GrupoMuscular,
  Objetivo,
  Patron,
  Perfil,
  Rutina,
  SeriePlanificada,
  TipoObjetivo,
} from './types'

type Rol = 'principal' | 'accesorio' | 'aislamiento'

interface Hueco {
  grupo: GrupoMuscular
  patrones: Patron[]
  rol: Rol
}

interface PlantillaDia {
  nombre: string
  huecos: Hueco[]
}

const h = (grupo: GrupoMuscular, patrones: Patron[], rol: Rol): Hueco => ({ grupo, patrones, rol })

const DIA_EMPUJE: PlantillaDia = {
  nombre: 'Empuje',
  huecos: [
    h('pecho', ['empuje_horizontal'], 'principal'),
    h('hombros', ['empuje_vertical'], 'principal'),
    h('pecho', ['empuje_horizontal'], 'accesorio'),
    h('hombros', ['aislamiento'], 'aislamiento'),
    h('triceps', ['aislamiento'], 'aislamiento'),
    h('pecho', ['aislamiento'], 'aislamiento'),
    h('triceps', ['aislamiento'], 'aislamiento'),
  ],
}

const DIA_TIRON: PlantillaDia = {
  nombre: 'Tirón',
  huecos: [
    h('espalda', ['traccion_vertical'], 'principal'),
    h('espalda', ['traccion_horizontal'], 'principal'),
    h('espalda', ['traccion_vertical', 'traccion_horizontal'], 'accesorio'),
    h('hombros', ['traccion_horizontal', 'aislamiento'], 'aislamiento'),
    h('biceps', ['aislamiento'], 'aislamiento'),
    h('biceps', ['aislamiento'], 'aislamiento'),
    h('antebrazo', ['aislamiento'], 'aislamiento'),
  ],
}

const DIA_PIERNA: PlantillaDia = {
  nombre: 'Pierna',
  huecos: [
    h('cuadriceps', ['rodilla_dominante'], 'principal'),
    h('isquios', ['cadera_dominante'], 'principal'),
    h('cuadriceps', ['rodilla_dominante'], 'accesorio'),
    h('gluteos', ['cadera_dominante', 'aislamiento'], 'accesorio'),
    h('isquios', ['aislamiento'], 'aislamiento'),
    h('gemelos', ['aislamiento'], 'aislamiento'),
    h('core', ['core'], 'aislamiento'),
  ],
}

const DIA_SUPERIOR: PlantillaDia = {
  nombre: 'Superior',
  huecos: [
    h('pecho', ['empuje_horizontal'], 'principal'),
    h('espalda', ['traccion_vertical'], 'principal'),
    h('hombros', ['empuje_vertical'], 'accesorio'),
    h('espalda', ['traccion_horizontal'], 'accesorio'),
    h('biceps', ['aislamiento'], 'aislamiento'),
    h('triceps', ['aislamiento'], 'aislamiento'),
    h('hombros', ['aislamiento'], 'aislamiento'),
  ],
}

const DIA_INFERIOR: PlantillaDia = {
  nombre: 'Inferior',
  huecos: [
    h('cuadriceps', ['rodilla_dominante'], 'principal'),
    h('isquios', ['cadera_dominante'], 'principal'),
    h('gluteos', ['cadera_dominante', 'aislamiento'], 'accesorio'),
    h('cuadriceps', ['rodilla_dominante', 'aislamiento'], 'accesorio'),
    h('isquios', ['aislamiento'], 'aislamiento'),
    h('gemelos', ['aislamiento'], 'aislamiento'),
    h('core', ['core'], 'aislamiento'),
  ],
}

const DIA_FULL_A: PlantillaDia = {
  nombre: 'Full body A',
  huecos: [
    h('cuadriceps', ['rodilla_dominante'], 'principal'),
    h('pecho', ['empuje_horizontal'], 'principal'),
    h('espalda', ['traccion_vertical'], 'principal'),
    h('isquios', ['cadera_dominante'], 'accesorio'),
    h('hombros', ['aislamiento'], 'aislamiento'),
    h('core', ['core'], 'aislamiento'),
  ],
}

const DIA_FULL_B: PlantillaDia = {
  nombre: 'Full body B',
  huecos: [
    h('isquios', ['cadera_dominante'], 'principal'),
    h('hombros', ['empuje_vertical'], 'principal'),
    h('espalda', ['traccion_horizontal'], 'principal'),
    h('cuadriceps', ['rodilla_dominante'], 'accesorio'),
    h('biceps', ['aislamiento'], 'aislamiento'),
    h('triceps', ['aislamiento'], 'aislamiento'),
  ],
}

const DIA_FULL_C: PlantillaDia = {
  nombre: 'Full body C',
  huecos: [
    h('cuadriceps', ['rodilla_dominante'], 'principal'),
    h('pecho', ['empuje_horizontal'], 'principal'),
    h('espalda', ['traccion_vertical', 'traccion_horizontal'], 'principal'),
    h('gluteos', ['cadera_dominante', 'aislamiento'], 'accesorio'),
    h('gemelos', ['aislamiento'], 'aislamiento'),
    h('core', ['core'], 'aislamiento'),
  ],
}

interface Plantilla {
  split: string
  dias: PlantillaDia[]
}

/** Reparto semanal según los días disponibles y la experiencia. */
export function elegirPlantilla(diasPorSemana: number, experiencia: Experiencia): Plantilla {
  const dias = Math.min(6, Math.max(1, Math.round(diasPorSemana)))
  switch (dias) {
    case 1:
      return { split: 'Full body', dias: [DIA_FULL_A] }
    case 2:
      return { split: 'Full body A/B', dias: [DIA_FULL_A, DIA_FULL_B] }
    case 3:
      return experiencia === 'principiante'
        ? { split: 'Full body A/B/C', dias: [DIA_FULL_A, DIA_FULL_B, DIA_FULL_C] }
        : { split: 'Empuje / Tirón / Pierna', dias: [DIA_EMPUJE, DIA_TIRON, DIA_PIERNA] }
    case 4:
      return {
        split: 'Torso / Pierna x2',
        dias: [
          { ...DIA_SUPERIOR, nombre: 'Superior A' },
          { ...DIA_INFERIOR, nombre: 'Inferior A' },
          { ...DIA_SUPERIOR, nombre: 'Superior B' },
          { ...DIA_INFERIOR, nombre: 'Inferior B' },
        ],
      }
    case 5:
      return {
        split: 'Empuje / Tirón / Pierna + Torso',
        dias: [DIA_EMPUJE, DIA_TIRON, DIA_PIERNA, DIA_SUPERIOR, DIA_INFERIOR],
      }
    default:
      return {
        split: 'Empuje / Tirón / Pierna x2',
        dias: [
          { ...DIA_EMPUJE, nombre: 'Empuje A' },
          { ...DIA_TIRON, nombre: 'Tirón A' },
          { ...DIA_PIERNA, nombre: 'Pierna A' },
          { ...DIA_EMPUJE, nombre: 'Empuje B' },
          { ...DIA_TIRON, nombre: 'Tirón B' },
          { ...DIA_PIERNA, nombre: 'Pierna B' },
        ],
      }
  }
}

interface Esquema {
  series: number
  repsMin: number
  repsMax: number
  rir: number
  descansoSeg: number
}

const ESQUEMAS: Record<TipoObjetivo, Record<Rol, Esquema>> = {
  fuerza: {
    principal: { series: 5, repsMin: 3, repsMax: 5, rir: 1, descansoSeg: 180 },
    accesorio: { series: 3, repsMin: 6, repsMax: 8, rir: 2, descansoSeg: 120 },
    aislamiento: { series: 3, repsMin: 10, repsMax: 12, rir: 1, descansoSeg: 60 },
  },
  hipertrofia: {
    principal: { series: 4, repsMin: 6, repsMax: 10, rir: 1, descansoSeg: 150 },
    accesorio: { series: 3, repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 90 },
    aislamiento: { series: 3, repsMin: 12, repsMax: 15, rir: 0, descansoSeg: 60 },
  },
  perdida_grasa: {
    principal: { series: 3, repsMin: 8, repsMax: 12, rir: 2, descansoSeg: 90 },
    accesorio: { series: 3, repsMin: 10, repsMax: 15, rir: 1, descansoSeg: 60 },
    aislamiento: { series: 3, repsMin: 12, repsMax: 20, rir: 0, descansoSeg: 45 },
  },
  recomposicion: {
    principal: { series: 4, repsMin: 6, repsMax: 10, rir: 1, descansoSeg: 150 },
    accesorio: { series: 3, repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 90 },
    aislamiento: { series: 3, repsMin: 12, repsMax: 15, rir: 1, descansoSeg: 60 },
  },
  mantenimiento: {
    principal: { series: 3, repsMin: 6, repsMax: 10, rir: 2, descansoSeg: 120 },
    accesorio: { series: 3, repsMin: 8, repsMax: 12, rir: 2, descansoSeg: 90 },
    aislamiento: { series: 2, repsMin: 12, repsMax: 15, rir: 1, descansoSeg: 60 },
  },
}

/** Ejercicios que cabe hacer por sesión según la experiencia. */
const LIMITE_EJERCICIOS: Record<Experiencia, number> = {
  principiante: 5,
  intermedio: 6,
  avanzado: 7,
}

/** Segundos aproximados que ocupa una serie además del descanso. */
const SEGUNDOS_POR_SERIE = 45

function duracionEstimadaSeg(items: SeriePlanificada[]): number {
  return items.reduce((t, i) => t + i.series * (SEGUNDOS_POR_SERIE + i.descansoSeg), 0)
}

function puntuar(ej: Ejercicio, hueco: Hueco, rol: Rol, yaUsados: Set<string>, enRutina: Set<string>): number {
  let p = 0
  if (ej.principal === hueco.grupo) p += 10
  else if (ej.secundarios.includes(hueco.grupo)) p += 3
  else return -Infinity

  if (hueco.patrones.includes(ej.patron)) p += 8

  if (rol === 'principal') p += ej.compuesto ? 6 : -6
  if (rol === 'accesorio' && ej.compuesto) p += 2
  if (rol === 'aislamiento' && !ej.compuesto) p += 3

  // Barra y mancuernas primero para los básicos; máquinas y poleas para accesorios.
  if (rol === 'principal' && (ej.equipamiento === 'barra' || ej.equipamiento === 'mancuernas')) p += 3

  if (yaUsados.has(ej.id)) p -= 100 // nunca repetir dentro del mismo día
  if (enRutina.has(ej.id)) p -= 5 // variar entre días de la misma rutina

  return p
}

/** Ajusta el rango de repeticiones del esquema al del ejercicio (plancha, gemelos, etc.). */
function rangoAjustado(esquema: Esquema, ej: Ejercicio): { repsMin: number; repsMax: number } {
  const [ejMin, ejMax] = ej.repsDefecto
  const min = Math.max(esquema.repsMin, ejMin)
  const max = Math.min(esquema.repsMax, ejMax)
  // Sin solape (isométricos o ejercicios de repeticiones muy altas) manda el ejercicio.
  if (min > max) return { repsMin: ejMin, repsMax: ejMax }
  // Un rango de una sola repetición no deja margen para la doble progresión.
  return { repsMin: min, repsMax: max - min >= 2 ? max : min + 2 }
}

export interface OpcionesRutina {
  perfil: Perfil
  objetivo: Objetivo
  ejercicios?: Ejercicio[]
  nombre?: string
  ahora?: Date
}

/**
 * Construye una rutina completa a partir del objetivo, los días disponibles,
 * el equipamiento, la experiencia y los grupos priorizados.
 */
export function generarRutina(opciones: OpcionesRutina): Rutina {
  const { perfil, objetivo } = opciones
  const catalogo = opciones.ejercicios ?? EJERCICIOS_BASE
  const ahora = opciones.ahora ?? new Date()

  const equipo = new Set<Equipamiento>(
    perfil.equipamiento.length ? perfil.equipamiento : (['peso_corporal'] as Equipamiento[]),
  )
  const disponibles = catalogo.filter((e) => equipo.has(e.equipamiento))
  const fondo = disponibles.length ? disponibles : catalogo.filter((e) => e.equipamiento === 'peso_corporal')

  const plantilla = elegirPlantilla(objetivo.diasPorSemana, perfil.experiencia)
  const esquemas = ESQUEMAS[objetivo.tipo]
  const prioridades = new Set(objetivo.prioridades)
  const limite = LIMITE_EJERCICIOS[perfil.experiencia]
  const presupuestoSeg = Math.max(20, objetivo.minutosPorSesion) * 60
  const enRutina = new Set<string>()

  const dias: DiaRutina[] = plantilla.dias.map((pd, indiceDia) => {
    // Los grupos priorizados se colocan primero para asegurarles el tiempo.
    const huecos = [...pd.huecos].sort((a, b) => {
      const pa = prioridades.has(a.grupo) ? 1 : 0
      const pb = prioridades.has(b.grupo) ? 1 : 0
      if (pa !== pb) return pb - pa
      return 0
    })

    const yaUsados = new Set<string>()
    const ejercicios: SeriePlanificada[] = []

    for (const hueco of huecos) {
      if (ejercicios.length >= limite) break

      let mejor: Ejercicio | undefined
      let mejorPuntos = -Infinity
      for (const ej of fondo) {
        const puntos = puntuar(ej, hueco, hueco.rol, yaUsados, enRutina)
        if (puntos > mejorPuntos) {
          mejorPuntos = puntos
          mejor = ej
        }
      }
      if (!mejor || mejorPuntos === -Infinity) continue

      const esquema = esquemas[hueco.rol]
      const rango = rangoAjustado(esquema, mejor)
      const extra = prioridades.has(hueco.grupo) ? 1 : 0
      const candidato: SeriePlanificada = {
        ejercicioId: mejor.id,
        series: esquema.series + extra,
        repsMin: rango.repsMin,
        repsMax: rango.repsMax,
        rir: esquema.rir,
        descansoSeg: esquema.descansoSeg,
      }

      // Solo se añade si entra en el tiempo de sesión; si no, se corta aquí.
      if (duracionEstimadaSeg([...ejercicios, candidato]) > presupuestoSeg && ejercicios.length >= 3) break

      ejercicios.push(candidato)
      yaUsados.add(mejor.id)
      enRutina.add(mejor.id)
    }

    return {
      id: `dia-${indiceDia + 1}`,
      nombre: pd.nombre,
      ejercicios,
    }
  })

  return {
    id: `rutina-${ahora.getTime()}`,
    nombre: opciones.nombre ?? `${plantilla.split} · ${objetivo.diasPorSemana} días`,
    split: plantilla.split,
    creada: ahora.toISOString(),
    objetivoTipo: objetivo.tipo,
    diasPorSemana: plantilla.dias.length,
    dias,
    activa: true,
  }
}

/** Series semanales recomendadas por grupo muscular, como referencia del plan. */
export function volumenRecomendado(
  experiencia: Experiencia,
  tipo: TipoObjetivo,
  prioridades: GrupoMuscular[] = [],
): Record<GrupoMuscular, [number, number]> {
  const baseSegunExperiencia: Record<Experiencia, [number, number]> = {
    principiante: [8, 12],
    intermedio: [12, 18],
    avanzado: [14, 22],
  }
  const [min, max] = baseSegunExperiencia[experiencia]
  const factor = tipo === 'hipertrofia' ? 1.1 : tipo === 'fuerza' ? 0.85 : 1
  const pequenos = 0.75

  const grupos: GrupoMuscular[] = [
    'pecho',
    'espalda',
    'hombros',
    'biceps',
    'triceps',
    'cuadriceps',
    'isquios',
    'gluteos',
    'gemelos',
    'core',
    'antebrazo',
  ]
  const esPequeno = new Set<GrupoMuscular>(['biceps', 'triceps', 'gemelos', 'core', 'antebrazo'])

  const salida = {} as Record<GrupoMuscular, [number, number]>
  for (const g of grupos) {
    const escala = (esPequeno.has(g) ? pequenos : 1) * factor * (prioridades.includes(g) ? 1.2 : 1)
    salida[g] = [Math.round(min * escala), Math.round(max * escala)]
  }
  return salida
}
