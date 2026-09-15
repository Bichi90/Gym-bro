'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { navegar } from '../lib/rutas'
import { SelectorEjercicio } from './Rutina'
import { Aviso, Campo, CampoNumero, Etiqueta, Modal, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { ETIQUETA_GRUPO } from '../lib/ejercicios'
import {
  esSerieEfectiva,
  historialEjercicio,
  mejorRm1DeSesion,
  rm1Estimado,
  seriesEfectivasSesion,
  sugerirCarga,
  tonelajeSesion,
} from '../lib/entrenamiento'
import { duracion, fechaCorta, numero } from '../lib/formato'
import type { EjercicioRegistrado, SerieRegistrada, Sesion } from '../lib/types'

export function PaginaEntrenar() {
  const { estado } = useAlmacen()
  return estado.sesionActiva ? <SesionEnCurso sesion={estado.sesionActiva} /> : <ElegirSesion />
}

function ElegirSesion() {
  const { estado, acciones, rutinaActiva } = useAlmacen()
  const [libre, setLibre] = useState(false)
  const [nombreLibre, setNombreLibre] = useState('Entrenamiento libre')

  const ultimaPorDia = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const s of estado.sesiones) {
      if (!s.fin || !s.diaId) continue
      const previa = mapa.get(s.diaId)
      if (!previa || s.fecha > previa) mapa.set(s.diaId, s.fecha)
    }
    return mapa
  }, [estado.sesiones])

  // El día sugerido es el que lleva más tiempo sin hacerse.
  const diaSugerido = useMemo(() => {
    if (!rutinaActiva?.dias.length) return undefined
    return [...rutinaActiva.dias].sort((a, b) => {
      const fa = ultimaPorDia.get(a.id) ?? ''
      const fb = ultimaPorDia.get(b.id) ?? ''
      return fa.localeCompare(fb)
    })[0]
  }, [rutinaActiva, ultimaPorDia])

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Entrenar</h1>
          <p>Elegí el día de tu rutina o arrancá una sesión libre. Las cargas se sugieren según lo que hiciste la última vez.</p>
        </div>
      </div>

      {!rutinaActiva ? (
        <Tarjeta titulo="Todavía no hay rutina">
          <p className="pequeno tenue">Generá una rutina desde tu objetivo y volvé a esta pantalla.</p>
          <div className="acciones" style={{ marginTop: 12 }}>
            <button type="button" className="boton primario" onClick={() => navegar('objetivo')}>
              Definir objetivo
            </button>
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta titulo={rutinaActiva.nombre} subtitulo={rutinaActiva.split}>
          <div className="columna">
            {rutinaActiva.dias.map((dia) => {
              const ultima = ultimaPorDia.get(dia.id)
              return (
                <div key={dia.id} className="fila entre">
                  <div>
                    <div className="fila">
                      <strong>{dia.nombre}</strong>
                      {diaSugerido?.id === dia.id && <Etiqueta tono="acento">Toca hoy</Etiqueta>}
                    </div>
                    <div className="pequeno tenue">
                      {dia.ejercicios.length} ejercicios · {ultima ? `última vez ${fechaCorta(ultima)}` : 'sin hacer todavía'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="boton primario pequeno"
                    onClick={() => acciones.iniciarSesion({ rutinaId: rutinaActiva.id, diaId: dia.id, nombre: dia.nombre })}
                  >
                    Empezar
                  </button>
                </div>
              )
            })}
          </div>
        </Tarjeta>
      )}

      <Tarjeta titulo="Sesión libre" subtitulo="Sin plan previo: vas añadiendo ejercicios sobre la marcha">
        {libre ? (
          <div className="acciones">
            <input value={nombreLibre} onChange={(e) => setNombreLibre(e.target.value)} style={{ maxWidth: 260 }} />
            <button
              type="button"
              className="boton primario"
              onClick={() => acciones.iniciarSesion({ nombre: nombreLibre || 'Entrenamiento libre' })}
            >
              Empezar
            </button>
            <button type="button" className="boton sutil" onClick={() => setLibre(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="boton" onClick={() => setLibre(true)}>
            Empezar sesión libre
          </button>
        )}
      </Tarjeta>
    </>
  )
}

function SesionEnCurso({ sesion }: { sesion: Sesion }) {
  const { acciones } = useAlmacen()
  const [anadiendo, setAnadiendo] = useState(false)
  // El id fuerza a reiniciar el cronómetro aunque el descanso sea el mismo que el anterior.
  const [descanso, setDescanso] = useState<{ segundos: number; id: number } | null>(null)

  const transcurrido = useTemporizador(sesion.inicio)

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>{sesion.nombre}</h1>
          <p>
            Empezó hace {duracion(transcurrido)} · {seriesEfectivasSesion(sesion)} series efectivas ·{' '}
            {numero(tonelajeSesion(sesion), 0)} kg de tonelaje
          </p>
        </div>
        <div className="acciones">
          <button type="button" className="boton" onClick={() => setAnadiendo(true)}>
            + Ejercicio
          </button>
          <button
            type="button"
            className="boton primario"
            onClick={() => {
              if (confirm('¿Terminar y guardar la sesión?')) {
                acciones.finalizarSesion()
                navegar('progreso')
              }
            }}
          >
            Terminar
          </button>
        </div>
      </div>

      {sesion.ejercicios.length === 0 && <Vacio>Añadí el primer ejercicio para empezar a registrar series.</Vacio>}

      {sesion.ejercicios.map((reg) => (
        <BloqueEjercicio
          key={reg.ejercicioId}
          registro={reg}
          alDescansar={(s) => setDescanso({ segundos: s, id: Date.now() })}
        />
      ))}

      <Tarjeta titulo="Cerrar sesión">
        <div className="formulario">
          <Campo etiqueta="Peso corporal de hoy (kg)" ayuda="Opcional, útil para relativizar las cargas">
            <CampoNumero
              valor={sesion.pesoCorporalKg}
              paso={0.1}
              alCambiar={(v) => acciones.actualizarSesionActiva({ pesoCorporalKg: v })}
            />
          </Campo>
          <Campo etiqueta="Esfuerzo percibido (1-10)">
            <CampoNumero
              valor={sesion.rpe}
              min={1}
              max={10}
              alCambiar={(v) => acciones.actualizarSesionActiva({ rpe: v })}
            />
          </Campo>
        </div>
        <Campo etiqueta="Notas de la sesión">
          <textarea
            value={sesion.notas ?? ''}
            onChange={(e) => acciones.actualizarSesionActiva({ notas: e.target.value })}
            placeholder="Cómo te sentiste, molestias, cambios de ejercicio…"
          />
        </Campo>
        <div className="acciones" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="boton peligro"
            onClick={() => {
              if (confirm('¿Descartar esta sesión? Se pierde todo lo registrado.')) acciones.descartarSesion()
            }}
          >
            Descartar sesión
          </button>
        </div>
      </Tarjeta>

      {descanso && (
        <Cronometro key={descanso.id} segundos={descanso.segundos} alCerrar={() => setDescanso(null)} />
      )}

      {anadiendo && (
        <Modal titulo="Añadir ejercicio a la sesión" alCerrar={() => setAnadiendo(false)}>
          <SelectorEjercicio
            alElegir={(id) => {
              acciones.agregarEjercicioASesion(id)
              setAnadiendo(false)
            }}
          />
        </Modal>
      )}
    </>
  )
}

function BloqueEjercicio({
  registro,
  alDescansar,
}: {
  registro: EjercicioRegistrado
  alDescansar(segundos: number): void
}) {
  const { estado, acciones, buscarEjercicio, rutinaActiva } = useAlmacen()
  const ejercicio = buscarEjercicio(registro.ejercicioId)

  const plan = registro.plan ?? { series: 3, repsMin: 8, repsMax: 12, rir: 1 }
  const descansoPlan =
    rutinaActiva?.dias
      .flatMap((d) => d.ejercicios)
      .find((e) => e.ejercicioId === registro.ejercicioId)?.descansoSeg ?? (ejercicio?.compuesto ? 120 : 60)

  const historial = useMemo(
    () => historialEjercicio(estado.sesiones, registro.ejercicioId),
    [estado.sesiones, registro.ejercicioId],
  )
  const sugerencia = useMemo(
    () => (ejercicio ? sugerirCarga(historial, plan, ejercicio) : undefined),
    [historial, plan, ejercicio],
  )
  const anterior = historial[0]

  if (!ejercicio) return null

  const efectivas = registro.series.filter(esSerieEfectiva).length

  return (
    <article className="ejercicio-bloque">
      <header>
        <div>
          <h3>{ejercicio.nombre}</h3>
          <div className="pequeno tenue">
            {ETIQUETA_GRUPO[ejercicio.principal]} · plan: {plan.series} × {plan.repsMin}-{plan.repsMax} · RIR {plan.rir} ·
            descanso {descansoPlan}s
          </div>
        </div>
        <div className="fila">
          <Etiqueta tono={efectivas >= plan.series ? 'ok' : undefined}>
            {efectivas}/{plan.series} series
          </Etiqueta>
          <button
            type="button"
            className="boton sutil pequeno peligro"
            onClick={() => acciones.quitarEjercicioDeSesion(registro.ejercicioId)}
          >
            Quitar
          </button>
        </div>
      </header>

      {sugerencia && (
        <Aviso tono={sugerencia.progresa ? 'ok' : 'info'}>
          <div>
            <b>
              Sugerido: {numero(sugerencia.pesoKg, 1)} kg × {sugerencia.reps}
            </b>
            <div className="pequeno">{sugerencia.motivo}</div>
          </div>
        </Aviso>
      )}

      {anterior && (
        <div className="pequeno tenue">
          Última vez ({fechaCorta(anterior.fecha)}):{' '}
          {anterior.registro.series
            .filter(esSerieEfectiva)
            .map((s) => `${numero(s.pesoKg, 1)}×${s.reps}`)
            .join(' · ')}
          {mejorRm1DeSesion(anterior.registro) != null &&
            ` · 1RM estimado ${numero(mejorRm1DeSesion(anterior.registro), 1)} kg`}
        </div>
      )}

      <div className="tabla-envoltura series-tabla">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="numero">Peso (kg)</th>
              <th className="numero">Reps</th>
              <th className="numero">RIR</th>
              <th>Tipo</th>
              <th className="numero">1RM est.</th>
              <th>Hecha</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {registro.series.map((serie, i) => (
              <FilaSerie
                key={serie.id}
                indice={i + 1}
                serie={serie}
                alCambiar={(cambios) => acciones.actualizarSerie(registro.ejercicioId, serie.id, cambios)}
                alBorrar={() => acciones.borrarSerie(registro.ejercicioId, serie.id)}
                alCompletar={() => alDescansar(descansoPlan)}
              />
            ))}
            {registro.series.length === 0 && (
              <tr>
                <td colSpan={8} className="tenue pequeno">
                  Sin series todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="acciones">
        <button
          type="button"
          className="boton pequeno"
          onClick={() =>
            acciones.agregarSerie(registro.ejercicioId, {
              ...(sugerencia && registro.series.length === 0
                ? { pesoKg: sugerencia.pesoKg, reps: sugerencia.reps }
                : {}),
              rir: plan.rir,
            })
          }
        >
          + Serie
        </button>
        <button
          type="button"
          className="boton pequeno sutil"
          onClick={() => acciones.agregarSerie(registro.ejercicioId, { tipo: 'calentamiento', rir: 4 })}
        >
          + Calentamiento
        </button>
      </div>

      <Campo etiqueta="Notas del ejercicio">
        <input
          value={registro.notas ?? ''}
          placeholder="Sensaciones, ajustes de máquina, molestias…"
          onChange={(e) => {
            const texto = e.target.value
            acciones.actualizarSesionActiva({
              ejercicios: (estado.sesionActiva?.ejercicios ?? []).map((x) =>
                x.ejercicioId === registro.ejercicioId ? { ...x, notas: texto } : x,
              ),
            })
          }}
        />
      </Campo>
    </article>
  )
}

function FilaSerie({
  indice,
  serie,
  alCambiar,
  alBorrar,
  alCompletar,
}: {
  indice: number
  serie: SerieRegistrada
  alCambiar(cambios: Partial<SerieRegistrada>): void
  alBorrar(): void
  alCompletar(): void
}) {
  const rm1 = rm1Estimado(serie.pesoKg, serie.reps, serie.rir ?? 0)
  return (
    <tr className={serie.completada ? 'serie-hecha' : undefined}>
      <td>{indice}</td>
      <td className="numero">
        <CampoNumero valor={serie.pesoKg || undefined} paso={0.5} min={0} alCambiar={(v) => alCambiar({ pesoKg: v ?? 0 })} />
      </td>
      <td className="numero">
        <CampoNumero valor={serie.reps || undefined} min={0} alCambiar={(v) => alCambiar({ reps: v ?? 0 })} />
      </td>
      <td className="numero">
        <CampoNumero valor={serie.rir} min={0} max={6} alCambiar={(v) => alCambiar({ rir: v })} />
      </td>
      <td>
        <select value={serie.tipo} onChange={(e) => alCambiar({ tipo: e.target.value as SerieRegistrada['tipo'] })}>
          <option value="normal">Normal</option>
          <option value="calentamiento">Calentamiento</option>
          <option value="fallo">Al fallo</option>
        </select>
      </td>
      <td className="numero tenue">{serie.tipo === 'calentamiento' ? '—' : rm1 != null ? numero(rm1, 1) : '—'}</td>
      <td>
        <input
          type="checkbox"
          checked={serie.completada}
          aria-label={`Serie ${indice} completada`}
          onChange={(e) => {
            alCambiar({ completada: e.target.checked })
            if (e.target.checked) alCompletar()
          }}
        />
      </td>
      <td className="numero">
        <button type="button" className="boton sutil pequeno" onClick={alBorrar} aria-label={`Borrar serie ${indice}`}>
          ✕
        </button>
      </td>
    </tr>
  )
}

/** Cuenta atrás de descanso entre series. */
function Cronometro({ segundos, alCerrar }: { segundos: number; alCerrar(): void }) {
  // Se guarda el instante de fin para que el contador siga siendo exacto aunque
  // la pestaña se quede en segundo plano o se sumen segundos extra.
  const [fin, setFin] = useState(() => Date.now() + segundos * 1000)
  const [ahora, setAhora] = useState(() => Date.now())
  const avisado = useRef(false)

  useEffect(() => {
    setFin(Date.now() + segundos * 1000)
    avisado.current = false
  }, [segundos])

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const restante = Math.max(0, (fin - ahora) / 1000)
  const terminado = restante <= 0

  useEffect(() => {
    if (terminado && !avisado.current) {
      avisado.current = true
      navigator.vibrate?.(200)
    }
  }, [terminado])

  return (
    <div className={`cronometro ${terminado ? '' : 'activo'}`}>
      <div>
        <div className="pequeno tenue">{terminado ? 'Descanso terminado' : 'Descanso'}</div>
        <div className="tiempo">{duracion(restante)}</div>
      </div>
      <div className="acciones">
        <button type="button" className="boton pequeno" onClick={() => setFin((f) => Math.max(f, Date.now()) + 30000)}>
          +30 s
        </button>
        <button type="button" className="boton pequeno primario" onClick={alCerrar}>
          {terminado ? 'Cerrar' : 'Saltar'}
        </button>
      </div>
    </div>
  )
}

/** Segundos transcurridos desde un instante ISO, actualizados cada segundo. */
function useTemporizador(desdeIso: string): number {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return Math.max(0, (ahora - new Date(desdeIso).getTime()) / 1000)
}
