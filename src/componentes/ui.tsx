'use client'

import { useEffect, type ReactNode } from 'react'

export function Tarjeta({
  titulo,
  subtitulo,
  accion,
  children,
}: {
  titulo?: ReactNode
  subtitulo?: ReactNode
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="tarjeta">
      {(titulo || accion) && (
        <header>
          <div>
            {titulo && <h2>{titulo}</h2>}
            {subtitulo && <div className="subtitulo">{subtitulo}</div>}
          </div>
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}

export function Metrica({
  etiqueta,
  valor,
  pie,
}: {
  etiqueta: ReactNode
  valor: ReactNode
  pie?: ReactNode
}) {
  return (
    <div className="metrica">
      <div className="clave">{etiqueta}</div>
      <div className="valor">{valor}</div>
      {pie && <div className="pie">{pie}</div>}
    </div>
  )
}

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: ReactNode
  ayuda?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <span className="ayuda">{ayuda}</span>}
    </label>
  )
}

/** Input numérico que deja el campo vacío en vez de forzar un 0. */
export function CampoNumero({
  valor,
  alCambiar,
  paso = 1,
  min,
  max,
  marcador,
  id,
}: {
  valor: number | undefined
  alCambiar(v: number | undefined): void
  paso?: number
  min?: number
  max?: number
  marcador?: string
  id?: string
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      step={paso}
      min={min}
      max={max}
      placeholder={marcador}
      value={valor ?? ''}
      onChange={(e) => {
        const bruto = e.target.value
        if (bruto === '') return alCambiar(undefined)
        const n = Number(bruto)
        alCambiar(Number.isNaN(n) ? undefined : n)
      }}
    />
  )
}

export function Aviso({
  tono = 'info',
  children,
}: {
  tono?: 'info' | 'ok' | 'alerta' | 'error'
  children: ReactNode
}) {
  return <div className={`aviso ${tono}`}>{children}</div>
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="vacio">{children}</div>
}

export function Etiqueta({
  tono,
  children,
}: {
  tono?: 'acento' | 'ok' | 'alerta'
  children: ReactNode
}) {
  return <span className={`etiqueta ${tono ?? ''}`}>{children}</span>
}

export function Barra({ valor, maximo, tono }: { valor: number; maximo: number; tono?: 'ok' | 'alerta' }) {
  const pct = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  return (
    <div className="barra" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i className={tono ?? ''} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({
  titulo,
  alCerrar,
  children,
}: {
  titulo: ReactNode
  alCerrar(): void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [alCerrar])

  return (
    <div
      className="capa-modal"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar()
      }}
    >
      <div className="modal">
        <header>
          <h2>{titulo}</h2>
          <button type="button" className="boton sutil" onClick={alCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}

/** Grupo de chips de selección múltiple. */
export function Chips<T extends string>({
  opciones,
  seleccion,
  alCambiar,
  etiquetas,
}: {
  opciones: readonly T[]
  seleccion: T[]
  alCambiar(v: T[]): void
  etiquetas: Record<T, string>
}) {
  return (
    <div className="opciones">
      {opciones.map((o) => {
        const activo = seleccion.includes(o)
        return (
          <button
            key={o}
            type="button"
            className="chip"
            aria-pressed={activo}
            onClick={() => alCambiar(activo ? seleccion.filter((x) => x !== o) : [...seleccion, o])}
          >
            {etiquetas[o]}
          </button>
        )
      })}
    </div>
  )
}
