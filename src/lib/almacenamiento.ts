import type { Estado } from './types'

export const CLAVE_ALMACEN = 'gym-bro:estado'
export const VERSION_ESTADO = 1

export function estadoInicial(): Estado {
  return {
    version: VERSION_ESTADO,
    perfil: {
      nombre: '',
      sexo: 'masculino',
      alturaCm: 175,
      experiencia: 'principiante',
      actividad: 'ligero',
      equipamiento: ['barra', 'mancuernas', 'maquina', 'polea', 'peso_corporal'],
      unidad: 'kg',
    },
    mediciones: [],
    objetivo: {
      tipo: 'hipertrofia',
      diasPorSemana: 3,
      minutosPorSesion: 60,
      prioridades: [],
      objetivosFuerza: [],
    },
    rutinas: [],
    sesiones: [],
    ejerciciosPropios: [],
  }
}

/** Completa lo que falte para que un estado viejo o manipulado siga siendo usable. */
export function migrar(bruto: unknown): Estado {
  const inicial = estadoInicial()
  if (!bruto || typeof bruto !== 'object') return inicial
  const e = bruto as Partial<Estado>
  return {
    version: VERSION_ESTADO,
    perfil: { ...inicial.perfil, ...(e.perfil ?? {}) },
    mediciones: Array.isArray(e.mediciones) ? e.mediciones : [],
    objetivo: { ...inicial.objetivo, ...(e.objetivo ?? {}) },
    rutinas: Array.isArray(e.rutinas) ? e.rutinas : [],
    sesiones: Array.isArray(e.sesiones) ? e.sesiones : [],
    ejerciciosPropios: Array.isArray(e.ejerciciosPropios) ? e.ejerciciosPropios : [],
    sesionActiva: e.sesionActiva,
  }
}

export function cargarEstado(): Estado {
  try {
    const bruto = localStorage.getItem(CLAVE_ALMACEN)
    if (!bruto) return estadoInicial()
    return migrar(JSON.parse(bruto))
  } catch {
    return estadoInicial()
  }
}

export function guardarEstado(estado: Estado): void {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(estado))
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue funcionando en memoria.
  }
}

export function exportarJson(estado: Estado): string {
  return JSON.stringify(estado, null, 2)
}

export function importarJson(texto: string): Estado {
  return migrar(JSON.parse(texto))
}

export function nuevoId(prefijo = 'id'): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefijo}-${Date.now().toString(36)}-${aleatorio}`
}
