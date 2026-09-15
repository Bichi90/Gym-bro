import type { Ejercicio, Equipamiento, GrupoMuscular, Patron } from './types'

type Def = [
  id: string,
  nombre: string,
  patron: Patron,
  principal: GrupoMuscular,
  secundarios: GrupoMuscular[],
  equipamiento: Equipamiento,
  compuesto: boolean,
  unilateral: boolean,
  repsMin: number,
  repsMax: number,
  incrementoKg: number,
]

// Catálogo base. Tren inferior sube de 5 en 5 kg, tren superior de 2,5 en 2,5.
const DEFS: Def[] = [
  // --- Empuje horizontal ---
  ['press_banca', 'Press banca', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'barra', true, false, 5, 10, 2.5],
  ['press_banca_inclinado', 'Press banca inclinado', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'barra', true, false, 6, 12, 2.5],
  ['press_mancuernas', 'Press con mancuernas', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'mancuernas', true, false, 8, 12, 2],
  ['press_inclinado_mancuernas', 'Press inclinado con mancuernas', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'mancuernas', true, false, 8, 12, 2],
  ['press_maquina', 'Press de pecho en máquina', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'maquina', true, false, 8, 15, 5],
  ['fondos', 'Fondos en paralelas', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'peso_corporal', true, false, 6, 12, 2.5],
  ['flexiones', 'Flexiones', 'empuje_horizontal', 'pecho', ['triceps', 'core'], 'peso_corporal', true, false, 10, 25, 0],
  ['aperturas_polea', 'Aperturas en polea', 'aislamiento', 'pecho', [], 'polea', false, false, 12, 20, 2.5],
  ['aperturas_mancuernas', 'Aperturas con mancuernas', 'aislamiento', 'pecho', [], 'mancuernas', false, false, 10, 15, 2],

  // --- Empuje vertical ---
  ['press_militar', 'Press militar', 'empuje_vertical', 'hombros', ['triceps'], 'barra', true, false, 5, 10, 2.5],
  ['press_hombro_mancuernas', 'Press de hombro con mancuernas', 'empuje_vertical', 'hombros', ['triceps'], 'mancuernas', true, false, 8, 12, 2],
  ['press_hombro_maquina', 'Press de hombro en máquina', 'empuje_vertical', 'hombros', ['triceps'], 'maquina', true, false, 8, 15, 5],
  ['elevaciones_laterales', 'Elevaciones laterales', 'aislamiento', 'hombros', [], 'mancuernas', false, false, 12, 20, 1],
  ['elevaciones_laterales_polea', 'Elevaciones laterales en polea', 'aislamiento', 'hombros', [], 'polea', false, true, 12, 20, 1],
  ['pajaros', 'Pájaros / deltoide posterior', 'aislamiento', 'hombros', ['espalda'], 'mancuernas', false, false, 12, 20, 1],
  ['face_pull', 'Face pull', 'traccion_horizontal', 'hombros', ['espalda'], 'polea', false, false, 12, 20, 2.5],

  // --- Tracción vertical ---
  ['dominadas', 'Dominadas', 'traccion_vertical', 'espalda', ['biceps', 'antebrazo'], 'peso_corporal', true, false, 5, 12, 2.5],
  ['jalon_pecho', 'Jalón al pecho', 'traccion_vertical', 'espalda', ['biceps', 'antebrazo'], 'polea', true, false, 8, 15, 5],
  ['jalon_agarre_neutro', 'Jalón agarre neutro', 'traccion_vertical', 'espalda', ['biceps'], 'polea', true, false, 8, 15, 5],
  ['pullover_polea', 'Pullover en polea', 'aislamiento', 'espalda', [], 'polea', false, false, 12, 20, 2.5],

  // --- Tracción horizontal ---
  ['remo_barra', 'Remo con barra', 'traccion_horizontal', 'espalda', ['biceps', 'isquios'], 'barra', true, false, 6, 12, 2.5],
  ['remo_mancuerna', 'Remo con mancuerna', 'traccion_horizontal', 'espalda', ['biceps'], 'mancuernas', true, true, 8, 12, 2],
  ['remo_polea', 'Remo en polea baja', 'traccion_horizontal', 'espalda', ['biceps'], 'polea', true, false, 8, 15, 5],
  ['remo_maquina', 'Remo en máquina', 'traccion_horizontal', 'espalda', ['biceps'], 'maquina', true, false, 8, 15, 5],
  ['remo_invertido', 'Remo invertido', 'traccion_horizontal', 'espalda', ['biceps', 'core'], 'peso_corporal', true, false, 8, 15, 0],

  // --- Rodilla dominante ---
  ['sentadilla', 'Sentadilla trasera', 'rodilla_dominante', 'cuadriceps', ['gluteos', 'core'], 'barra', true, false, 5, 10, 5],
  ['sentadilla_frontal', 'Sentadilla frontal', 'rodilla_dominante', 'cuadriceps', ['gluteos', 'core'], 'barra', true, false, 5, 10, 5],
  ['prensa', 'Prensa de piernas', 'rodilla_dominante', 'cuadriceps', ['gluteos'], 'maquina', true, false, 8, 15, 10],
  ['sentadilla_goblet', 'Sentadilla goblet', 'rodilla_dominante', 'cuadriceps', ['gluteos', 'core'], 'mancuernas', true, false, 8, 15, 2],
  ['zancadas', 'Zancadas', 'rodilla_dominante', 'cuadriceps', ['gluteos'], 'mancuernas', true, true, 8, 12, 2],
  ['bulgara', 'Sentadilla búlgara', 'rodilla_dominante', 'cuadriceps', ['gluteos'], 'mancuernas', true, true, 8, 12, 2],
  ['extension_cuadriceps', 'Extensión de cuádriceps', 'aislamiento', 'cuadriceps', [], 'maquina', false, false, 12, 20, 5],
  ['sentadilla_peso_corporal', 'Sentadilla con peso corporal', 'rodilla_dominante', 'cuadriceps', ['gluteos'], 'peso_corporal', true, false, 15, 30, 0],

  // --- Cadera dominante ---
  ['peso_muerto', 'Peso muerto', 'cadera_dominante', 'isquios', ['espalda', 'gluteos', 'antebrazo'], 'barra', true, false, 3, 8, 5],
  ['peso_muerto_rumano', 'Peso muerto rumano', 'cadera_dominante', 'isquios', ['gluteos', 'espalda'], 'barra', true, false, 6, 12, 5],
  ['hip_thrust', 'Hip thrust', 'cadera_dominante', 'gluteos', ['isquios'], 'barra', true, false, 8, 15, 5],
  ['buenos_dias', 'Buenos días', 'cadera_dominante', 'isquios', ['gluteos', 'espalda'], 'barra', true, false, 8, 12, 2.5],
  ['swing_kettlebell', 'Swing con kettlebell', 'cadera_dominante', 'gluteos', ['isquios', 'core'], 'kettlebell', true, false, 12, 20, 4],
  ['curl_femoral', 'Curl femoral', 'aislamiento', 'isquios', [], 'maquina', false, false, 10, 15, 5],
  ['patada_gluteo_polea', 'Patada de glúteo en polea', 'aislamiento', 'gluteos', [], 'polea', false, true, 12, 20, 2.5],
  ['puente_gluteo', 'Puente de glúteo', 'cadera_dominante', 'gluteos', ['isquios'], 'peso_corporal', false, false, 15, 25, 0],

  // --- Brazos ---
  ['curl_barra', 'Curl con barra', 'aislamiento', 'biceps', ['antebrazo'], 'barra', false, false, 8, 12, 2.5],
  ['curl_mancuernas', 'Curl con mancuernas', 'aislamiento', 'biceps', ['antebrazo'], 'mancuernas', false, true, 10, 15, 2],
  ['curl_martillo', 'Curl martillo', 'aislamiento', 'biceps', ['antebrazo'], 'mancuernas', false, true, 10, 15, 2],
  ['curl_polea', 'Curl en polea', 'aislamiento', 'biceps', [], 'polea', false, false, 10, 15, 2.5],
  ['extension_triceps_polea', 'Extensión de tríceps en polea', 'aislamiento', 'triceps', [], 'polea', false, false, 10, 15, 2.5],
  ['press_frances', 'Press francés', 'aislamiento', 'triceps', [], 'barra', false, false, 8, 12, 2.5],
  ['extension_triceps_sobre_cabeza', 'Extensión de tríceps sobre la cabeza', 'aislamiento', 'triceps', [], 'mancuernas', false, false, 10, 15, 2],
  ['fondos_banco', 'Fondos en banco', 'aislamiento', 'triceps', ['pecho'], 'peso_corporal', false, false, 10, 20, 0],

  // --- Core y gemelos ---
  ['elevacion_gemelos', 'Elevación de gemelos', 'aislamiento', 'gemelos', [], 'maquina', false, false, 12, 20, 5],
  ['elevacion_gemelos_pie', 'Elevación de gemelos de pie', 'aislamiento', 'gemelos', [], 'peso_corporal', false, false, 15, 25, 0],
  ['plancha', 'Plancha', 'core', 'core', [], 'peso_corporal', false, false, 30, 60, 0],
  ['rueda_abdominal', 'Rueda abdominal', 'core', 'core', [], 'peso_corporal', false, false, 8, 15, 0],
  ['crunch_polea', 'Crunch en polea', 'core', 'core', [], 'polea', false, false, 12, 20, 2.5],
  ['elevacion_piernas', 'Elevación de piernas colgado', 'core', 'core', [], 'peso_corporal', false, false, 8, 15, 0],
  ['pallof_press', 'Pallof press', 'core', 'core', [], 'polea', false, true, 10, 15, 2.5],
  ['curl_muneca', 'Curl de muñeca', 'aislamiento', 'antebrazo', [], 'mancuernas', false, false, 12, 20, 1],

  // --- Bandas (equipamiento mínimo) ---
  ['press_banda', 'Press con banda', 'empuje_horizontal', 'pecho', ['triceps', 'hombros'], 'banda', true, false, 12, 20, 0],
  ['remo_banda', 'Remo con banda', 'traccion_horizontal', 'espalda', ['biceps'], 'banda', true, false, 12, 20, 0],
  ['jalon_banda', 'Jalón con banda', 'traccion_vertical', 'espalda', ['biceps'], 'banda', true, false, 12, 20, 0],
  ['abduccion_banda', 'Abducción de cadera con banda', 'aislamiento', 'gluteos', [], 'banda', false, false, 15, 25, 0],
]

export const EJERCICIOS_BASE: Ejercicio[] = DEFS.map(
  ([id, nombre, patron, principal, secundarios, equipamiento, compuesto, unilateral, repsMin, repsMax, incrementoKg]) => ({
    id,
    nombre,
    patron,
    principal,
    secundarios,
    equipamiento,
    compuesto,
    unilateral,
    repsDefecto: [repsMin, repsMax],
    incrementoKg,
    base: true,
  }),
)

export const GRUPOS: GrupoMuscular[] = [
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

export const ETIQUETA_GRUPO: Record<GrupoMuscular, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  isquios: 'Isquios',
  gluteos: 'Glúteos',
  gemelos: 'Gemelos',
  core: 'Core',
  antebrazo: 'Antebrazo',
}

export const ETIQUETA_EQUIPO: Record<Equipamiento, string> = {
  barra: 'Barra',
  mancuernas: 'Mancuernas',
  maquina: 'Máquinas',
  polea: 'Poleas',
  peso_corporal: 'Peso corporal',
  kettlebell: 'Kettlebell',
  banda: 'Bandas',
}

export const ETIQUETA_PATRON: Record<Patron, string> = {
  empuje_horizontal: 'Empuje horizontal',
  empuje_vertical: 'Empuje vertical',
  traccion_horizontal: 'Tracción horizontal',
  traccion_vertical: 'Tracción vertical',
  rodilla_dominante: 'Rodilla dominante',
  cadera_dominante: 'Cadera dominante',
  aislamiento: 'Aislamiento',
  core: 'Core',
}
