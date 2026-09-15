import { useMemo, useState } from 'react'
import { GraficoBarras, GraficoLineas, type BarraDato, type Serie } from '../componentes/graficos'
import { Etiqueta, Metrica, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { useDerivados } from '../estado/derivados'
import { ETIQUETA_GRUPO, GRUPOS } from '../lib/ejercicios'
import {
  esSerieEfectiva,
  mejorRm1DeSesion,
  seriesEfectivasSesion,
  seriesPorGrupo,
  tonelajeSesion,
} from '../lib/entrenamiento'
import { duracion, fechaCorta, mostrarPeso, numero, porcentaje } from '../lib/formato'
import { volumenRecomendado } from '../lib/rutina'

export function PaginaProgreso() {
  const { estado, acciones, buscarEjercicio } = useAlmacen()
  const { sesionesCompletadas, semanas, records, adherenciaPct, resumen } = useDerivados()
  const [ejercicioElegido, setEjercicioElegido] = useState<string>('')

  const ejerciciosEntrenados = useMemo(() => {
    const ids = new Set<string>()
    for (const s of sesionesCompletadas) {
      for (const e of s.ejercicios) {
        if (e.series.some(esSerieEfectiva)) ids.add(e.ejercicioId)
      }
    }
    return [...ids].map((id) => buscarEjercicio(id)).filter((e): e is NonNullable<typeof e> => !!e)
  }, [sesionesCompletadas, buscarEjercicio])

  const idActivo = ejercicioElegido || ejerciciosEntrenados[0]?.id || ''

  const serieRm1 = useMemo<Serie[]>(() => {
    if (!idActivo) return []
    const puntos: { fecha: string; valor: number }[] = []
    for (const s of [...sesionesCompletadas].reverse()) {
      const reg = s.ejercicios.find((e) => e.ejercicioId === idActivo)
      if (!reg) continue
      const rm1 = mejorRm1DeSesion(reg)
      if (rm1 != null) puntos.push({ fecha: s.fecha, valor: rm1 })
    }
    return puntos.length ? [{ nombre: '1RM estimado', color: 'var(--acento)', puntos }] : []
  }, [sesionesCompletadas, idActivo])

  const objetivoFuerza = estado.objetivo.objetivosFuerza.find((o) => o.ejercicioId === idActivo)?.rm1Kg

  const recomendado = useMemo(
    () => volumenRecomendado(estado.perfil.experiencia, estado.objetivo.tipo, estado.objetivo.prioridades),
    [estado.perfil.experiencia, estado.objetivo.tipo, estado.objetivo.prioridades],
  )

  // Volumen real de las últimas 4 semanas, en media semanal.
  const volumenReal = useMemo<BarraDato[]>(() => {
    const desde = Date.now() - 28 * 86400000
    const recientes = sesionesCompletadas.filter((s) => new Date(s.fecha + 'T00:00:00').getTime() >= desde)
    if (!recientes.length) return []
    const series = seriesPorGrupo(recientes, buscarEjercicio)
    return GRUPOS.filter((g) => (series[g] ?? 0) > 0).map((g) => ({
      etiqueta: ETIQUETA_GRUPO[g],
      valor: Math.round(((series[g] ?? 0) / 4) * 10) / 10,
      rango: recomendado[g],
    }))
  }, [sesionesCompletadas, buscarEjercicio, recomendado])

  const seriesSemanales = useMemo<Serie[]>(
    () => [
      {
        nombre: 'Series efectivas',
        color: 'var(--acento)',
        puntos: semanas.map((s) => ({ fecha: s.inicio, valor: s.seriesEfectivas })),
      },
    ],
    [semanas],
  )

  const seriesTonelaje = useMemo<Serie[]>(
    () => [
      {
        nombre: 'Tonelaje (kg)',
        color: 'var(--info)',
        puntos: semanas.map((s) => ({ fecha: s.inicio, valor: s.tonelajeKg })),
      },
    ],
    [semanas],
  )

  const totales = useMemo(() => {
    const series = sesionesCompletadas.reduce((t, s) => t + seriesEfectivasSesion(s), 0)
    const tonelaje = sesionesCompletadas.reduce((t, s) => t + tonelajeSesion(s), 0)
    return { series, tonelaje }
  }, [sesionesCompletadas])

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Progreso</h1>
          <p>Fuerza por ejercicio, volumen por grupo muscular, adherencia y evolución corporal, todo en un sitio.</p>
        </div>
      </div>

      <Tarjeta titulo="Resumen">
        <div className="metricas">
          <Metrica etiqueta="Sesiones" valor={numero(sesionesCompletadas.length, 0)} pie="Completadas" />
          <Metrica etiqueta="Series efectivas" valor={numero(totales.series, 0)} pie="Sin contar calentamientos" />
          <Metrica etiqueta="Tonelaje total" valor={`${numero(totales.tonelaje / 1000, 1)} t`} pie="Peso × repeticiones" />
          <Metrica
            etiqueta="Adherencia"
            valor={porcentaje(adherenciaPct, 0)}
            pie={`Últimas 4 semanas, plan de ${estado.objetivo.diasPorSemana}/semana`}
          />
          <Metrica etiqueta="Peso actual" valor={mostrarPeso(resumen?.pesoKg, estado.perfil.unidad)} />
          <Metrica etiqueta="% de grasa" valor={porcentaje(resumen?.grasaPct)} />
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Fuerza por ejercicio"
        subtitulo="1RM estimado con la fórmula de Epley, ajustado por las repeticiones en reserva"
        accion={
          ejerciciosEntrenados.length > 0 ? (
            <select value={idActivo} onChange={(e) => setEjercicioElegido(e.target.value)} style={{ maxWidth: 240 }}>
              {ejerciciosEntrenados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        {serieRm1.length ? (
          <>
            <GraficoLineas
              series={serieRm1}
              objetivo={objetivoFuerza}
              etiquetaObjetivo={objetivoFuerza ? `Objetivo ${numero(objetivoFuerza, 1)} kg` : undefined}
              sufijo=" kg"
            />
            {(() => {
              const puntos = serieRm1[0]!.puntos
              const primero = puntos[0]!
              const ultimo = puntos.at(-1)!
              const cambio = ultimo.valor - primero.valor
              return (
                <p className="pequeno tenue" style={{ marginTop: 8 }}>
                  De {numero(primero.valor, 1)} kg ({fechaCorta(primero.fecha)}) a {numero(ultimo.valor, 1)} kg (
                  {fechaCorta(ultimo.fecha)}):{' '}
                  <span className={cambio >= 0 ? 'positivo' : 'negativo'}>
                    {cambio >= 0 ? '+' : ''}
                    {numero(cambio, 1)} kg
                  </span>
                </p>
              )
            })()}
          </>
        ) : (
          <Vacio>Registrá alguna sesión para ver la evolución de fuerza.</Vacio>
        )}
      </Tarjeta>

      <div className="rejilla-2">
        <Tarjeta titulo="Series efectivas por semana" subtitulo="Últimas 8 semanas">
          <GraficoLineas series={seriesSemanales} />
        </Tarjeta>
        <Tarjeta titulo="Tonelaje por semana" subtitulo="Kilos totales movidos">
          <GraficoLineas series={seriesTonelaje} sufijo=" kg" />
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Volumen real por grupo muscular"
        subtitulo="Media semanal de las últimas 4 semanas frente al rango recomendado"
      >
        <GraficoBarras datos={volumenReal} sufijo=" series" />
      </Tarjeta>

      <Tarjeta titulo="Récords personales" subtitulo="Mejor 1RM estimado de cada ejercicio">
        {records.size === 0 ? (
          <Vacio>Todavía no hay récords que mostrar.</Vacio>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th className="numero">1RM estimado</th>
                  <th className="numero">Mejor serie</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {[...records.values()]
                  .sort((a, b) => b.rm1Kg - a.rm1Kg)
                  .map((r) => (
                    <tr key={r.ejercicioId}>
                      <td>{buscarEjercicio(r.ejercicioId)?.nombre ?? r.ejercicioId}</td>
                      <td className="numero">{numero(r.rm1Kg, 1)} kg</td>
                      <td className="numero">
                        {numero(r.pesoKg, 1)} kg × {r.reps}
                      </td>
                      <td>{fechaCorta(r.fecha)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Historial de sesiones" subtitulo={`${sesionesCompletadas.length} sesiones`}>
        {sesionesCompletadas.length === 0 ? (
          <Vacio>Aún no completaste ninguna sesión.</Vacio>
        ) : (
          <div className="columna">
            {sesionesCompletadas.slice(0, 30).map((s) => {
              const minutos = s.fin ? (new Date(s.fin).getTime() - new Date(s.inicio).getTime()) / 1000 : undefined
              return (
                <details key={s.id} className="tarjeta" style={{ background: 'var(--fondo-3)' }}>
                  <summary style={{ cursor: 'pointer' }}>
                    <span className="fila entre" style={{ display: 'inline-flex', width: 'calc(100% - 24px)' }}>
                      <span>
                        <strong>{s.nombre}</strong> <span className="tenue">· {fechaCorta(s.fecha)}</span>
                      </span>
                      <span className="pequeno tenue">
                        {seriesEfectivasSesion(s)} series · {numero(tonelajeSesion(s), 0)} kg
                        {minutos != null && ` · ${duracion(minutos)}`}
                      </span>
                    </span>
                  </summary>

                  <div className="tabla-envoltura" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Ejercicio</th>
                          <th>Series</th>
                          <th className="numero">1RM est.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.ejercicios.map((e) => (
                          <tr key={e.ejercicioId}>
                            <td>{buscarEjercicio(e.ejercicioId)?.nombre ?? e.ejercicioId}</td>
                            <td>
                              {e.series
                                .filter(esSerieEfectiva)
                                .map((x) => `${numero(x.pesoKg, 1)}×${x.reps}`)
                                .join(' · ') || '—'}
                            </td>
                            <td className="numero">
                              {mejorRm1DeSesion(e) != null ? `${numero(mejorRm1DeSesion(e), 1)} kg` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {s.notas && <p className="pequeno tenue" style={{ marginTop: 8 }}>{s.notas}</p>}

                  <div className="fila entre" style={{ marginTop: 10 }}>
                    <span className="fila">
                      {s.rpe != null && <Etiqueta>RPE {s.rpe}</Etiqueta>}
                      {s.pesoCorporalKg != null && <Etiqueta>{numero(s.pesoCorporalKg, 1)} kg corporal</Etiqueta>}
                    </span>
                    <button
                      type="button"
                      className="boton sutil pequeno peligro"
                      onClick={() => {
                        if (confirm(`¿Borrar la sesión del ${fechaCorta(s.fecha)}?`)) acciones.borrarSesion(s.id)
                      }}
                    >
                      Borrar sesión
                    </button>
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </Tarjeta>
    </>
  )
}
