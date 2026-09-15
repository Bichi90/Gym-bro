'use client'

import { useMemo, useState } from 'react'
import { navegar } from '../lib/rutas'
import { GraficoBarras, type BarraDato } from '../componentes/graficos'
import { Aviso, Campo, CampoNumero, Etiqueta, Modal, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { ETIQUETA_EQUIPO, ETIQUETA_GRUPO, GRUPOS } from '../lib/ejercicios'
import { seriesPlanificadasPorGrupo } from '../lib/entrenamiento'
import { ETIQUETA_OBJETIVO } from '../lib/objetivo'
import { volumenRecomendado } from '../lib/rutina'
import type { DiaRutina, Rutina, SeriePlanificada } from '../lib/types'

const SEGUNDOS_POR_SERIE = 45

function duracionDia(dia: DiaRutina): number {
  return dia.ejercicios.reduce((t, e) => t + e.series * (SEGUNDOS_POR_SERIE + e.descansoSeg), 0)
}

export function PaginaRutina() {
  const { estado, acciones, buscarEjercicio, rutinaActiva } = useAlmacen()
  const [anadiendoEn, setAnadiendoEn] = useState<string | null>(null)

  const recomendado = useMemo(
    () => volumenRecomendado(estado.perfil.experiencia, estado.objetivo.tipo, estado.objetivo.prioridades),
    [estado.perfil.experiencia, estado.objetivo.tipo, estado.objetivo.prioridades],
  )

  const volumen = useMemo<BarraDato[]>(() => {
    if (!rutinaActiva) return []
    const series = seriesPlanificadasPorGrupo(rutinaActiva.dias, buscarEjercicio)
    return GRUPOS.filter((g) => (series[g] ?? 0) > 0 || recomendado[g][0] > 0).map((g) => ({
      etiqueta: ETIQUETA_GRUPO[g],
      valor: series[g] ?? 0,
      rango: recomendado[g],
    }))
  }, [rutinaActiva, buscarEjercicio, recomendado])

  const actualizarDia = (rutina: Rutina, diaId: string, fn: (d: DiaRutina) => DiaRutina) => {
    acciones.guardarRutina({
      ...rutina,
      dias: rutina.dias.map((d) => (d.id === diaId ? fn(d) : d)),
    })
  }

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Rutina</h1>
          <p>
            La rutina se arma con tu objetivo, los días y minutos que tenés, tu experiencia y el equipamiento
            disponible. Podés retocar series, repeticiones, RIR y descansos a mano.
          </p>
        </div>
        <div className="acciones">
          <button type="button" className="boton" onClick={() => navegar('objetivo')}>
            Ajustar objetivo
          </button>
          <button type="button" className="boton primario" onClick={() => acciones.crearRutinaDesdeObjetivo()}>
            {rutinaActiva ? 'Regenerar rutina' : 'Generar rutina'}
          </button>
        </div>
      </div>

      {!rutinaActiva && (
        <Vacio>
          Todavía no tenés rutina. Revisá tu objetivo y pulsá <b>Generar rutina</b>.
        </Vacio>
      )}

      {rutinaActiva && (
        <>
          <Tarjeta
            titulo={rutinaActiva.nombre}
            subtitulo={`${ETIQUETA_OBJETIVO[rutinaActiva.objetivoTipo]} · ${rutinaActiva.dias.length} sesiones por semana`}
            accion={
              <button type="button" className="boton primario" onClick={() => navegar('entrenar')}>
                Entrenar
              </button>
            }
          >
            <Aviso tono="info">
              RIR es cuántas repeticiones te quedarían en reserva al terminar la serie. RIR 1 significa parar a una
              repetición del fallo.
            </Aviso>
          </Tarjeta>

          {rutinaActiva.dias.map((dia) => (
            <Tarjeta
              key={dia.id}
              titulo={dia.nombre}
              subtitulo={`${dia.ejercicios.length} ejercicios · ~${Math.round(duracionDia(dia) / 60)} min estimados`}
              accion={
                <div className="acciones">
                  <button type="button" className="boton pequeno" onClick={() => setAnadiendoEn(dia.id)}>
                    + Ejercicio
                  </button>
                  <button
                    type="button"
                    className="boton pequeno primario"
                    onClick={() => {
                      acciones.iniciarSesion({ rutinaId: rutinaActiva.id, diaId: dia.id, nombre: dia.nombre })
                      navegar('entrenar')
                    }}
                    disabled={!!estado.sesionActiva}
                  >
                    Empezar
                  </button>
                </div>
              }
            >
              {dia.ejercicios.length === 0 ? (
                <Vacio>Día sin ejercicios. Añadí alguno o regenerá la rutina.</Vacio>
              ) : (
                <div className="tabla-envoltura">
                  <table>
                    <thead>
                      <tr>
                        <th>Ejercicio</th>
                        <th className="numero">Series</th>
                        <th className="numero">Reps</th>
                        <th className="numero">RIR</th>
                        <th className="numero">Descanso</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {dia.ejercicios.map((item, indice) => {
                        const ej = buscarEjercicio(item.ejercicioId)
                        const cambiar = (cambios: Partial<SeriePlanificada>) =>
                          actualizarDia(rutinaActiva, dia.id, (d) => ({
                            ...d,
                            ejercicios: d.ejercicios.map((x, i) => (i === indice ? { ...x, ...cambios } : x)),
                          }))
                        return (
                          <tr key={`${item.ejercicioId}-${indice}`}>
                            <td>
                              <div>{ej?.nombre ?? item.ejercicioId}</div>
                              <div className="pequeno tenue">
                                {ej ? `${ETIQUETA_GRUPO[ej.principal]} · ${ETIQUETA_EQUIPO[ej.equipamiento]}` : ''}
                              </div>
                            </td>
                            <td className="numero" style={{ width: 90 }}>
                              <CampoNumero valor={item.series} min={1} alCambiar={(v) => cambiar({ series: v ?? 1 })} />
                            </td>
                            <td className="numero" style={{ width: 150 }}>
                              <div className="fila" style={{ flexWrap: 'nowrap' }}>
                                <CampoNumero valor={item.repsMin} min={1} alCambiar={(v) => cambiar({ repsMin: v ?? 1 })} />
                                <span className="tenue">–</span>
                                <CampoNumero valor={item.repsMax} min={1} alCambiar={(v) => cambiar({ repsMax: v ?? 1 })} />
                              </div>
                            </td>
                            <td className="numero" style={{ width: 80 }}>
                              <CampoNumero valor={item.rir} min={0} max={5} alCambiar={(v) => cambiar({ rir: v ?? 0 })} />
                            </td>
                            <td className="numero" style={{ width: 110 }}>
                              <CampoNumero
                                valor={item.descansoSeg}
                                paso={15}
                                min={0}
                                alCambiar={(v) => cambiar({ descansoSeg: v ?? 60 })}
                              />
                            </td>
                            <td className="numero">
                              <button
                                type="button"
                                className="boton sutil pequeno peligro"
                                onClick={() =>
                                  actualizarDia(rutinaActiva, dia.id, (d) => ({
                                    ...d,
                                    ejercicios: d.ejercicios.filter((_, i) => i !== indice),
                                  }))
                                }
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Tarjeta>
          ))}

          <Tarjeta
            titulo="Volumen semanal planificado"
            subtitulo="Series por grupo muscular frente al rango recomendado para tu nivel y objetivo"
          >
            <GraficoBarras datos={volumen} sufijo=" series" />
            <p className="pequeno tenue" style={{ marginTop: 10 }}>
              Los grupos secundarios de cada ejercicio cuentan media serie. La banda punteada marca el rango
              recomendado.
            </p>
          </Tarjeta>
        </>
      )}

      {estado.rutinas.length > 1 && (
        <Tarjeta titulo="Otras rutinas guardadas">
          <div className="columna">
            {estado.rutinas.map((r) => (
              <div key={r.id} className="fila entre">
                <div>
                  <div>
                    {r.nombre} {r.activa && <Etiqueta tono="acento">Activa</Etiqueta>}
                  </div>
                  <div className="pequeno tenue">
                    {r.split} · {ETIQUETA_OBJETIVO[r.objetivoTipo]}
                  </div>
                </div>
                <div className="acciones">
                  {!r.activa && (
                    <button type="button" className="boton pequeno" onClick={() => acciones.activarRutina(r.id)}>
                      Activar
                    </button>
                  )}
                  <button
                    type="button"
                    className="boton pequeno sutil peligro"
                    onClick={() => {
                      if (confirm(`¿Borrar la rutina "${r.nombre}"?`)) acciones.borrarRutina(r.id)
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      {anadiendoEn && rutinaActiva && (
        <Modal titulo="Añadir ejercicio" alCerrar={() => setAnadiendoEn(null)}>
          <SelectorEjercicio
            alElegir={(id) => {
              const ej = buscarEjercicio(id)
              actualizarDia(rutinaActiva, anadiendoEn, (d) => ({
                ...d,
                ejercicios: [
                  ...d.ejercicios,
                  {
                    ejercicioId: id,
                    series: 3,
                    repsMin: ej?.repsDefecto[0] ?? 8,
                    repsMax: ej?.repsDefecto[1] ?? 12,
                    rir: 1,
                    descansoSeg: ej?.compuesto ? 120 : 60,
                  },
                ],
              }))
              setAnadiendoEn(null)
            }}
          />
        </Modal>
      )}
    </>
  )
}

export function SelectorEjercicio({ alElegir }: { alElegir(id: string): void }) {
  const { ejercicios } = useAlmacen()
  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState<string>('')

  const filtrados = ejercicios.filter((e) => {
    if (grupo && e.principal !== grupo) return false
    if (!texto.trim()) return true
    return e.nombre.toLowerCase().includes(texto.trim().toLowerCase())
  })

  return (
    <div className="columna">
      <div className="formulario">
        <Campo etiqueta="Buscar">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre del ejercicio" />
        </Campo>
        <Campo etiqueta="Grupo muscular">
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">Todos</option>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {ETIQUETA_GRUPO[g]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="columna" style={{ maxHeight: 340, overflow: 'auto', gap: 4 }}>
        {filtrados.map((e) => (
          <button
            key={e.id}
            type="button"
            className="boton"
            style={{ justifyContent: 'space-between' }}
            onClick={() => alElegir(e.id)}
          >
            <span>{e.nombre}</span>
            <span className="pequeno tenue">
              {ETIQUETA_GRUPO[e.principal]} · {ETIQUETA_EQUIPO[e.equipamiento]}
            </span>
          </button>
        ))}
        {filtrados.length === 0 && <Vacio>Ningún ejercicio coincide.</Vacio>}
      </div>
    </div>
  )
}
