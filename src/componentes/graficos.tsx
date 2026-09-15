import { useId } from 'react'
import { fechaCorta, numero } from '../lib/formato'

export interface Punto {
  fecha: string
  valor: number
}

export interface Serie {
  nombre: string
  color: string
  puntos: Punto[]
  /** Dibuja la línea discontinua (para medias móviles o proyecciones). */
  discontinua?: boolean
}

const MARGEN = { arriba: 12, derecha: 12, abajo: 22, izquierda: 40 }

function escala(valor: number, min: number, max: number, desde: number, hasta: number): number {
  if (max === min) return (desde + hasta) / 2
  return desde + ((valor - min) / (max - min)) * (hasta - desde)
}

function tiempo(fecha: string): number {
  return new Date(fecha.length === 10 ? fecha + 'T00:00:00' : fecha).getTime()
}

/** Gráfico de líneas sobre un eje temporal, con línea de objetivo opcional. */
export function GraficoLineas({
  series,
  altura = 200,
  objetivo,
  etiquetaObjetivo,
  sufijo = '',
}: {
  series: Serie[]
  altura?: number
  objetivo?: number
  etiquetaObjetivo?: string
  sufijo?: string
}) {
  const idRecorte = useId()
  const ancho = 640
  const puntos = series.flatMap((s) => s.puntos)
  if (puntos.length === 0) {
    return <div className="vacio">Sin datos suficientes todavía.</div>
  }

  const xs = puntos.map((p) => tiempo(p.fecha))
  const ys = puntos.map((p) => p.valor)
  if (objetivo != null) ys.push(objetivo)

  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  let minY = Math.min(...ys)
  let maxY = Math.max(...ys)
  const margenY = (maxY - minY) * 0.12 || Math.max(1, Math.abs(maxY) * 0.05)
  minY -= margenY
  maxY += margenY

  const x = (f: string) => escala(tiempo(f), minX, maxX, MARGEN.izquierda, ancho - MARGEN.derecha)
  const y = (v: number) => escala(v, minY, maxY, altura - MARGEN.abajo, MARGEN.arriba)

  const lineasY = 4
  const marcasY = Array.from({ length: lineasY + 1 }, (_, i) => minY + ((maxY - minY) * i) / lineasY)
  const fechasOrdenadas = [...new Set(puntos.map((p) => p.fecha))].sort()
  const marcasX =
    fechasOrdenadas.length <= 4
      ? fechasOrdenadas
      : [0, 1, 2, 3].map((i) => fechasOrdenadas[Math.round((i * (fechasOrdenadas.length - 1)) / 3)]!)

  return (
    <div>
      <svg
        className="grafico"
        viewBox={`0 0 ${ancho} ${altura}`}
        preserveAspectRatio="none"
        style={{ height: altura }}
        role="img"
        aria-label={series.map((s) => s.nombre).join(', ')}
      >
        <clipPath id={idRecorte}>
          <rect
            x={MARGEN.izquierda}
            y={MARGEN.arriba}
            width={ancho - MARGEN.izquierda - MARGEN.derecha}
            height={altura - MARGEN.arriba - MARGEN.abajo}
          />
        </clipPath>

        {marcasY.map((v, i) => (
          <g key={i}>
            <line className="rejilla-linea" x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(v)} y2={y(v)} />
            <text className="eje-texto" x={MARGEN.izquierda - 6} y={y(v) + 3} textAnchor="end">
              {numero(v, Math.abs(maxY - minY) < 10 ? 1 : 0)}
            </text>
          </g>
        ))}

        {marcasX.map((f) => (
          <text key={f} className="eje-texto" x={x(f)} y={altura - 6} textAnchor="middle">
            {fechaCorta(f)}
          </text>
        ))}

        {objetivo != null && (
          <g clipPath={`url(#${idRecorte})`}>
            <line
              x1={MARGEN.izquierda}
              x2={ancho - MARGEN.derecha}
              y1={y(objetivo)}
              y2={y(objetivo)}
              stroke="var(--objetivo)"
              strokeDasharray="5 4"
              strokeWidth={1.5}
            />
            {etiquetaObjetivo && (
              <text className="eje-texto" x={ancho - MARGEN.derecha} y={y(objetivo) - 5} textAnchor="end" fill="var(--objetivo)">
                {etiquetaObjetivo}
              </text>
            )}
          </g>
        )}

        <g clipPath={`url(#${idRecorte})`}>
          {series.map((s) => {
            const orden = [...s.puntos].sort((a, b) => a.fecha.localeCompare(b.fecha))
            if (!orden.length) return null
            const d = orden.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.fecha)},${y(p.valor)}`).join(' ')
            return (
              <g key={s.nombre}>
                <path
                  d={d}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.discontinua ? '5 4' : undefined}
                />
                {orden.map((p) => (
                  <circle key={p.fecha} cx={x(p.fecha)} cy={y(p.valor)} r={2.5} fill={s.color}>
                    <title>{`${fechaCorta(p.fecha)}: ${numero(p.valor, 1)}${sufijo}`}</title>
                  </circle>
                ))}
              </g>
            )
          })}
        </g>
      </svg>
      <div className="leyenda">
        {series.map((s) => (
          <span key={s.nombre}>
            <i style={{ background: s.color }} /> {s.nombre}
          </span>
        ))}
        {objetivo != null && (
          <span>
            <i style={{ background: 'var(--objetivo)' }} /> Objetivo
          </span>
        )}
      </div>
    </div>
  )
}

export interface BarraDato {
  etiqueta: string
  valor: number
  /** Rango recomendado [min, max], dibujado como banda de referencia. */
  rango?: [number, number]
}

/** Barras horizontales con banda de rango recomendado. */
export function GraficoBarras({ datos, sufijo = '' }: { datos: BarraDato[]; sufijo?: string }) {
  if (!datos.length) return <div className="vacio">Sin datos todavía.</div>
  const maximo = Math.max(...datos.map((d) => Math.max(d.valor, d.rango?.[1] ?? 0)), 1)

  return (
    <div className="columna" style={{ gap: 8 }}>
      {datos.map((d) => {
        const dentro = d.rango ? d.valor >= d.rango[0] && d.valor <= d.rango[1] : true
        const porEncima = d.rango ? d.valor > d.rango[1] : false
        return (
          <div key={d.etiqueta}>
            <div className="fila entre pequeno">
              <span>{d.etiqueta}</span>
              <span className="mono tenue">
                {numero(d.valor, 1)}
                {sufijo}
                {d.rango && ` · objetivo ${d.rango[0]}–${d.rango[1]}`}
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <div className="barra">
                <i
                  className={dentro ? 'ok' : porEncima ? 'alerta' : ''}
                  style={{ width: `${Math.min(100, (d.valor / maximo) * 100)}%` }}
                />
              </div>
              {d.rango && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: -2,
                    bottom: -2,
                    left: `${(d.rango[0] / maximo) * 100}%`,
                    width: `${((d.rango[1] - d.rango[0]) / maximo) * 100}%`,
                    border: '1px dashed var(--texto-3)',
                    borderRadius: 4,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
