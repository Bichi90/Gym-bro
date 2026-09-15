/** Modelo de dominio de Gym Bro. Todo se guarda en el navegador (localStorage). */

export type Sexo = 'masculino' | 'femenino'

export type Experiencia = 'principiante' | 'intermedio' | 'avanzado'

export type Equipamiento =
  | 'barra'
  | 'mancuernas'
  | 'maquina'
  | 'polea'
  | 'peso_corporal'
  | 'kettlebell'
  | 'banda'

export type GrupoMuscular =
  | 'pecho'
  | 'espalda'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'cuadriceps'
  | 'isquios'
  | 'gluteos'
  | 'gemelos'
  | 'core'
  | 'antebrazo'

export type Patron =
  | 'empuje_horizontal'
  | 'empuje_vertical'
  | 'traccion_horizontal'
  | 'traccion_vertical'
  | 'rodilla_dominante'
  | 'cadera_dominante'
  | 'aislamiento'
  | 'core'

export type TipoObjetivo =
  | 'perdida_grasa'
  | 'hipertrofia'
  | 'fuerza'
  | 'recomposicion'
  | 'mantenimiento'

/** Actividad diaria fuera del gimnasio (NEAT + trabajo). */
export type NivelActividad = 'sedentario' | 'ligero' | 'moderado' | 'alto'

export interface Ejercicio {
  id: string
  nombre: string
  patron: Patron
  /** Grupo muscular que recibe el estímulo principal (cuenta como 1 serie efectiva). */
  principal: GrupoMuscular
  /** Grupos secundarios (cuentan como media serie efectiva). */
  secundarios: GrupoMuscular[]
  equipamiento: Equipamiento
  compuesto: boolean
  unilateral: boolean
  /** Rango de repeticiones por defecto [min, max]. */
  repsDefecto: [number, number]
  /** Incremento de carga habitual en kg (los ejercicios de tren inferior suben más rápido). */
  incrementoKg: number
  /** true si viene del catálogo base; los creados por el usuario son false. */
  base?: boolean
  notas?: string
}

export interface Perfil {
  nombre: string
  sexo: Sexo
  fechaNacimiento?: string // YYYY-MM-DD
  alturaCm: number
  experiencia: Experiencia
  actividad: NivelActividad
  equipamiento: Equipamiento[]
  unidad: 'kg' | 'lb'
}

export interface Medicion {
  id: string
  fecha: string // YYYY-MM-DD
  pesoKg: number
  cuelloCm?: number
  cinturaCm?: number
  caderaCm?: number
  pechoCm?: number
  brazoCm?: number
  antebrazoCm?: number
  musloCm?: number
  gemeloCm?: number
  hombroCm?: number
  /** % de grasa medido (balanza, plicómetro, DEXA). Si existe, tiene prioridad sobre el estimado. */
  grasaPct?: number
  notas?: string
}

export interface ObjetivoFuerza {
  ejercicioId: string
  rm1Kg: number
}

export interface Objetivo {
  tipo: TipoObjetivo
  pesoObjetivoKg?: number
  grasaObjetivoPct?: number
  fechaObjetivo?: string // YYYY-MM-DD
  diasPorSemana: number
  minutosPorSesion: number
  /** Grupos musculares a priorizar (reciben volumen extra). */
  prioridades: GrupoMuscular[]
  objetivosFuerza: ObjetivoFuerza[]
  notas?: string
}

export interface SeriePlanificada {
  ejercicioId: string
  series: number
  repsMin: number
  repsMax: number
  /** Repeticiones en reserva objetivo. */
  rir: number
  descansoSeg: number
}

export interface DiaRutina {
  id: string
  nombre: string
  /** Día de la semana sugerido (0 = domingo). undefined = flexible. */
  diaSemana?: number
  ejercicios: SeriePlanificada[]
}

export interface Rutina {
  id: string
  nombre: string
  split: string
  creada: string // ISO
  objetivoTipo: TipoObjetivo
  diasPorSemana: number
  dias: DiaRutina[]
  /** true para la rutina que se está siguiendo ahora. */
  activa: boolean
  notas?: string
}

export type TipoSerie = 'calentamiento' | 'normal' | 'fallo'

export interface SerieRegistrada {
  id: string
  pesoKg: number
  reps: number
  rir?: number
  tipo: TipoSerie
  completada: boolean
}

export interface EjercicioRegistrado {
  ejercicioId: string
  /** Prescripción del plan, copiada al iniciar la sesión (para comparar plan vs real). */
  plan?: { series: number; repsMin: number; repsMax: number; rir: number }
  series: SerieRegistrada[]
  notas?: string
}

export interface Sesion {
  id: string
  fecha: string // YYYY-MM-DD
  inicio: string // ISO
  fin?: string // ISO
  rutinaId?: string
  diaId?: string
  nombre: string
  ejercicios: EjercicioRegistrado[]
  pesoCorporalKg?: number
  /** Percepción de esfuerzo de la sesión completa (1-10). */
  rpe?: number
  notas?: string
}

export interface Estado {
  version: number
  perfil: Perfil
  mediciones: Medicion[]
  objetivo: Objetivo
  rutinas: Rutina[]
  sesiones: Sesion[]
  ejerciciosPropios: Ejercicio[]
  /** Sesión en curso todavía sin cerrar. */
  sesionActiva?: Sesion
}
