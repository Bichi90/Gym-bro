'use client'

import { useState } from 'react'
import { navegar } from '../lib/rutas'
import { Aviso, Barra, Campo, CampoNumero, Chips, Metrica, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { useDerivados } from '../estado/derivados'
import { ETIQUETA_GRUPO, GRUPOS } from '../lib/ejercicios'
import { pesoPara } from '../lib/entrenamiento'
import { diferenciaConSigno, mostrarPeso, numero } from '../lib/formato'
import { DESCRIPCION_OBJETIVO, ETIQUETA_OBJETIVO, formatoFecha } from '../lib/objetivo'
import type { TipoObjetivo } from '../lib/types'

const TIPOS: TipoObjetivo[] = ['perdida_grasa', 'hipertrofia', 'fuerza', 'recomposicion', 'mantenimiento']

export function PaginaObjetivo() {
  const { estado, acciones, ejercicios, buscarEjercicio } = useAlmacen()
  const { resumen, plan, proyeccion, records } = useDerivados()
  const objetivo = estado.objetivo
  const [nuevoEjercicioFuerza, setNuevoEjercicioFuerza] = useState('')

  const tonoViabilidad =
    proyeccion?.viabilidad === 'inviable'
      ? 'error'
      : proyeccion?.viabilidad === 'exigente'
        ? 'alerta'
        : proyeccion?.viabilidad === 'vencido'
          ? 'alerta'
          : 'ok'

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Objetivo</h1>
          <p>
            Definí a dónde querés llegar y con cuánto tiempo contás. Con eso se calculan las calorías, los macros y la
            estructura de la rutina.
          </p>
        </div>
      </div>

      <Tarjeta titulo="¿Qué querés conseguir?">
        <div className="opciones">
          {TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={objetivo.tipo === t}
              onClick={() => acciones.actualizarObjetivo({ tipo: t })}
            >
              {ETIQUETA_OBJETIVO[t]}
            </button>
          ))}
        </div>
        <p className="pequeno tenue" style={{ marginTop: 10 }}>
          {DESCRIPCION_OBJETIVO[objetivo.tipo]}
        </p>
      </Tarjeta>

      <div className="rejilla-2">
        <Tarjeta titulo="Meta corporal">
          <div className="formulario">
            <Campo etiqueta="Peso objetivo (kg)" ayuda="Opcional si usás % de grasa">
              <CampoNumero
                valor={objetivo.pesoObjetivoKg}
                paso={0.5}
                alCambiar={(v) => acciones.actualizarObjetivo({ pesoObjetivoKg: v })}
              />
            </Campo>
            <Campo etiqueta="% de grasa objetivo" ayuda="Se traduce a peso si hay masa magra conocida">
              <CampoNumero
                valor={objetivo.grasaObjetivoPct}
                paso={0.5}
                alCambiar={(v) => acciones.actualizarObjetivo({ grasaObjetivoPct: v })}
              />
            </Campo>
            <Campo etiqueta="Fecha objetivo">
              <input
                type="date"
                value={objetivo.fechaObjetivo ?? ''}
                onChange={(e) => acciones.actualizarObjetivo({ fechaObjetivo: e.target.value || undefined })}
              />
            </Campo>
          </div>

          {proyeccion && (
            <div style={{ marginTop: 14 }}>
              <Aviso tono={tonoViabilidad}>{proyeccion.mensaje}</Aviso>
              <div className="metricas" style={{ marginTop: 12 }}>
                <Metrica
                  etiqueta="Peso objetivo"
                  valor={mostrarPeso(proyeccion.pesoObjetivoKg, estado.perfil.unidad)}
                  pie={
                    proyeccion.pesoObjetivoKg != null && resumen
                      ? `${diferenciaConSigno(proyeccion.pesoObjetivoKg - resumen.pesoKg, 1)} kg desde hoy`
                      : undefined
                  }
                />
                <Metrica
                  etiqueta="Ritmo necesario"
                  valor={
                    proyeccion.ritmoRequeridoKgSemana != null
                      ? `${diferenciaConSigno(proyeccion.ritmoRequeridoKgSemana, 2)} kg/sem`
                      : '—'
                  }
                  pie={proyeccion.semanasRestantes != null ? `${numero(proyeccion.semanasRestantes, 0)} semanas restantes` : 'Sin fecha'}
                />
                <Metrica
                  etiqueta="Ritmo real"
                  valor={
                    proyeccion.ritmoRealKgSemana != null
                      ? `${diferenciaConSigno(proyeccion.ritmoRealKgSemana, 2)} kg/sem`
                      : '—'
                  }
                  pie="Según tus mediciones"
                />
                <Metrica
                  etiqueta="Llegada estimada"
                  valor={proyeccion.fechaEstimada ? formatoFecha(proyeccion.fechaEstimada) : '—'}
                  pie="Al ritmo del plan"
                />
              </div>
            </div>
          )}

          {!resumen && (
            <Aviso tono="alerta">
              Cargá una medición en <b>Antropometría</b> para calcular la proyección y las calorías.
            </Aviso>
          )}
        </Tarjeta>

        <Tarjeta titulo="Disponibilidad" subtitulo="Marca el tamaño y la forma de la rutina">
          <div className="formulario">
            <Campo etiqueta="Días por semana">
              <select
                value={objetivo.diasPorSemana}
                onChange={(e) => acciones.actualizarObjetivo({ diasPorSemana: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'día' : 'días'}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Minutos por sesión">
              <select
                value={objetivo.minutosPorSesion}
                onChange={(e) => acciones.actualizarObjetivo({ minutosPorSesion: Number(e.target.value) })}
              >
                {[30, 45, 60, 75, 90, 120].map((n) => (
                  <option key={n} value={n}>
                    {n} min
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div style={{ marginTop: 14 }}>
            <Campo etiqueta="Grupos a priorizar" ayuda="Reciben una serie extra y van primero en la sesión">
              <Chips
                opciones={GRUPOS}
                seleccion={objetivo.prioridades}
                etiquetas={ETIQUETA_GRUPO}
                alCambiar={(v) => acciones.actualizarObjetivo({ prioridades: v })}
              />
            </Campo>
          </div>

          <div className="acciones" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="boton primario"
              onClick={() => {
                acciones.crearRutinaDesdeObjetivo()
                navegar('rutina')
              }}
            >
              Generar rutina con este objetivo
            </button>
          </div>
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Calorías y macros"
        subtitulo={plan ? `Mantenimiento estimado: ${numero(plan.mantenimientoKcal, 0)} kcal` : undefined}
      >
        {plan ? (
          <>
            <div className="metricas">
              <Metrica
                etiqueta="Calorías objetivo"
                valor={`${numero(plan.objetivoKcal, 0)} kcal`}
                pie={`${diferenciaConSigno(plan.deltaKcal, 0)} kcal sobre mantenimiento`}
              />
              <Metrica etiqueta="Proteína" valor={`${numero(plan.proteinaG, 0)} g`} pie={`${numero(plan.proteinaG * 4, 0)} kcal`} />
              <Metrica etiqueta="Grasas" valor={`${numero(plan.grasaG, 0)} g`} pie={`${numero(plan.grasaG * 9, 0)} kcal`} />
              <Metrica
                etiqueta="Carbohidratos"
                valor={`${numero(plan.carbohidratoG, 0)} g`}
                pie={`${numero(plan.carbohidratoG * 4, 0)} kcal`}
              />
              <Metrica
                etiqueta="Cambio previsto"
                valor={`${diferenciaConSigno(plan.ritmoSemanalKg, 2)} kg/sem`}
                pie="Con este déficit o superávit"
              />
            </div>
            <p className="pequeno tenue" style={{ marginTop: 12 }}>
              Estimaciones a partir de tu antropometría y tu objetivo. Ajustá las calorías ±10 % si tras dos o tres
              semanas la tendencia real de peso no coincide con la prevista. No sustituye el consejo de un profesional
              de la salud.
            </p>
          </>
        ) : (
          <Vacio>Necesitás una medición con peso (y altura y edad en Ajustes) para calcular las calorías.</Vacio>
        )}
      </Tarjeta>

      <Tarjeta titulo="Objetivos de fuerza" subtitulo="Marcas de 1RM a las que querés llegar">
        {objetivo.objetivosFuerza.length === 0 ? (
          <Vacio>Todavía no fijaste marcas de fuerza.</Vacio>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th className="numero">1RM actual</th>
                  <th className="numero">Objetivo</th>
                  <th className="numero">Falta</th>
                  <th>Progreso</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {objetivo.objetivosFuerza.map((o) => {
                  const ej = buscarEjercicio(o.ejercicioId)
                  const actual = records.get(o.ejercicioId)?.rm1Kg
                  const falta = actual != null ? o.rm1Kg - actual : undefined
                  return (
                    <tr key={o.ejercicioId}>
                      <td>{ej?.nombre ?? o.ejercicioId}</td>
                      <td className="numero">{actual != null ? `${numero(actual, 1)} kg` : '—'}</td>
                      <td className="numero">
                        <CampoNumero
                          valor={o.rm1Kg}
                          paso={2.5}
                          alCambiar={(v) =>
                            acciones.actualizarObjetivo({
                              objetivosFuerza: objetivo.objetivosFuerza.map((x) =>
                                x.ejercicioId === o.ejercicioId ? { ...x, rm1Kg: v ?? 0 } : x,
                              ),
                            })
                          }
                        />
                      </td>
                      <td className="numero">
                        {falta != null ? (
                          falta <= 0 ? (
                            <span className="positivo">¡Conseguido!</span>
                          ) : (
                            `${numero(falta, 1)} kg`
                          )
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <Barra valor={actual ?? 0} maximo={o.rm1Kg || 1} tono={falta != null && falta <= 0 ? 'ok' : undefined} />
                        {actual != null && o.rm1Kg > 0 && (
                          <span className="pequeno tenue">
                            Equivale a {numero(pesoPara(o.rm1Kg, 5), 1)} kg × 5 repeticiones
                          </span>
                        )}
                      </td>
                      <td className="numero">
                        <button
                          type="button"
                          className="boton sutil pequeno peligro"
                          onClick={() =>
                            acciones.actualizarObjetivo({
                              objetivosFuerza: objetivo.objetivosFuerza.filter((x) => x.ejercicioId !== o.ejercicioId),
                            })
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

        <div className="acciones" style={{ marginTop: 12 }}>
          <select value={nuevoEjercicioFuerza} onChange={(e) => setNuevoEjercicioFuerza(e.target.value)} style={{ maxWidth: 280 }}>
            <option value="">Elegí un ejercicio…</option>
            {ejercicios
              .filter((e) => e.compuesto && !objetivo.objetivosFuerza.some((o) => o.ejercicioId === e.id))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="boton"
            disabled={!nuevoEjercicioFuerza}
            onClick={() => {
              const actual = records.get(nuevoEjercicioFuerza)?.rm1Kg ?? 0
              acciones.actualizarObjetivo({
                objetivosFuerza: [
                  ...objetivo.objetivosFuerza,
                  { ejercicioId: nuevoEjercicioFuerza, rm1Kg: Math.round((actual * 1.1) / 2.5) * 2.5 || 60 },
                ],
              })
              setNuevoEjercicioFuerza('')
            }}
          >
            Añadir marca
          </button>
        </div>
      </Tarjeta>
    </>
  )
}
