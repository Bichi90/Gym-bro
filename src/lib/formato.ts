const KG_POR_LB = 0.45359237

export function kgALb(kg: number): number {
  return kg / KG_POR_LB
}

export function lbAKg(lb: number): number {
  return lb * KG_POR_LB
}

/** Muestra un peso en la unidad elegida por el usuario (los datos siempre viven en kg). */
export function mostrarPeso(kg: number | undefined, unidad: 'kg' | 'lb', decimales = 1): string {
  if (kg == null || Number.isNaN(kg)) return '—'
  const valor = unidad === 'lb' ? kgALb(kg) : kg
  return `${numero(valor, decimales)} ${unidad}`
}

export function numero(v: number | undefined, decimales = 1): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: decimales })
}

export function porcentaje(v: number | undefined, decimales = 1): string {
  if (v == null || Number.isNaN(v)) return '—'
  return `${numero(v, decimales)} %`
}

export function fechaCorta(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

export function fechaLarga(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })
}

export function hoyISO(d = new Date()): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function duracion(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  const m = Math.floor(s / 60)
  const resto = s % 60
  if (m >= 60) {
    const horas = Math.floor(m / 60)
    return `${horas} h ${m % 60} min`
  }
  return m > 0 ? `${m}:${String(resto).padStart(2, '0')}` : `${resto} s`
}

export function diferenciaConSigno(v: number | undefined, decimales = 1, sufijo = ''): string {
  if (v == null || Number.isNaN(v)) return '—'
  const signo = v > 0 ? '+' : ''
  return `${signo}${numero(v, decimales)}${sufijo}`
}
