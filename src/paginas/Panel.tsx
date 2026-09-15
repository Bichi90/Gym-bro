import { useMemo } from 'react'
import { navegar } from '../App'
import { GraficoLineas, type Serie } from '../componentes/graficos'
import { Aviso, Barra, Etiqueta, Metrica, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { useDerivados } from '../estado/derivados'
import { ordenarMediciones } from '../lib/antropometria'
import { seriesEfectivasSesion, tonelajeSesion } from '../lib/entrenamiento'
import { diferenciaConSigno, fechaCorta, mostrarPeso, numero, porcentaje } from '../lib/formato'
import { ETIQUETA_OBJETIVO, formatoFecha, pesoObjetivoEfectivo } from '../lib/objetivo'

export function PaginaPanel() {
  const { estado, acciones, rutinaActiva } = useAlmacen()
  const { resumen, plan, proyeccion, sesionesCompletadas, ultimaSesion, adherenciaPct, semanas } = useDerivados()

  const pendientes = useMemo(() => {
    const lista: { texto: string; ruta: Parameters<typeof navegar>[0] }[] = []
    if (!estado.perfil.alturaCm || !estado.perfil.fechaNacimiento)
      lista.push({ texto: 'Completá altura y fecha de nacimiento en Ajustes', ruta: 'ajustes' })
    if (estado.mediciones.length === 0)
      lista.push({ texto: 'Cargá tu primera medición antropométrica', ruta: 'antropometria' })
    if (!estado.objetivo.pesoObjetivoKg && estado.objetivo.grasaObjetivoPct == null)
      lista.push({ texto: 'Definí un peso o % de grasa objetivo', ruta: 'objetivo' })
    if (!rutinaActiva) lista.push({ texto: 'Generá tu rutina a partir del objetivo', ruta: 'rutina' })
    return lista
  }, [estado.perfil, estado.mediciones.length, estado.objetivo, rutinaActiva])

  const ultimaPorDia = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const s of estado.sesiones) {
      if (!s.fin || !s.diaId) continue
      const previa = mapa.get(s.diaId)
      if (!previa || s.fecha > previa) mapa.set(s.diaId, s.fecha)
    }
    return mapa
  }, [estado.sesiones])

  const proximoDia = useMemo(() => {
    if (!rutinaActiva?.dias.length) return undefined
    return [...rutinaActiva.dias].sort((a, b) =>
      (ultimaPorDia.get(a.id) ?? '').localeCompare(ultimaPorDia.get(b.id) ?? ''),
    )[0]
  }, [rutinaActiva, ultimaPorDia])

  const seriePeso = useMemo<Serie[]>(() => {
    const ms = ordenarMediciones(estado.mediciones)
    if (ms.length < 2) return []
    return [{ nombre: 'Peso', color: 'var(--acento)', puntos: ms.map((m) => ({ fecha: m.fecha, valor: m.pesoKg })) }]
  }, [estado.mediciones])

  const objetivoPeso = resumen ? pesoObjetivoEfectivo(resumen, estado.objetivo) : undefined
  const sesionesEstaSemana = semanas.at(-1)?.sesiones ?? 0

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>{estado.perfil.nombre ? `Hola, ${estado.perfil.nombre}` : 'Panel'}</h1>
          <p>
            Objetivo actual: <b>{ETIQUETA_OBJETIVO[estado.objetivo.tipo]}</b> · {estado.objetivo.diasPorSemana} días por
            semana · {estado.objetivo.minutosPorSesion} min por sesión.
          </p>
        </div>
        <div className="acciones">
          {estado.sesionActiva ? (
            <button type="button" className="boton primario" onClick={() => navegar('entrenar')}>
              Seguir con la sesión
            </button>
          ) : (
            proximoDia &&
            rutinaActiva && (
              <button
                type="button"
                className="boton primario"
                onClick={() => {
                  acciones.iniciarSesion({ rutinaId: rutinaActiva.id, diaId: proximoDia.id, nombre: proximoDia.nombre })
                  navegar('entrenar')
                }}
              >
                Entrenar {proximoDia.nombre}
              </button>
            )
          )}
        </div>
      </div>

      {pendientes.length > 0 && (
        <Tarjeta titulo="Para empezar" subtitulo="Cuanto más completo el perfil, mejores las recomendaciones">
          <div className="columna">
            {pendientes.map((p) => (
              <div key={p.texto} className="fila entre">
                <span className="pequeno">{p.texto}</span>
                <button type="button" className="boton pequeno" onClick={() => navegar(p.ruta)}>
                  Ir
                </button>
              </div>
            ))}
          </div>
        </Tarjeta>
      )}

      <div className="metricas">
        <Metrica
          etiqueta="Esta semana"
          valor={`${sesionesEstaSemana}/${estado.objetivo.diasPorSemana}`}
          pie="Sesiones completadas"
        />
        <Metrica etiqueta="Adherencia" valor={porcentaje(adherenciaPct, 0)} pie="Últimas 4 semanas" />
        <Metrica etiqueta="Peso" valor={mostrarPeso(resumen?.pesoKg, estado.perfil.unidad)} pie={resumen ? undefined : 'Sin mediciones'} />
        <Metrica
          etiqueta="% de grasa"
          valor={porcentaje(resumen?.grasaPct)}
          pie={resumen?.fuenteGrasa === 'estimado' ? 'Estimado' : resumen?.fuenteGrasa === 'medido' ? 'Medido' : undefined}
        />
        <Metrica
          etiqueta="Calorías objetivo"
          valor={plan ? `${numero(plan.objetivoKcal, 0)}` : '—'}
          pie={plan ? `${diferenciaConSigno(plan.deltaKcal, 0)} kcal` : 'Falta antropometría'}
        />
        <Metrica etiqueta="Proteína" valor={plan ? `${numero(plan.proteinaG, 0)} g` : '—'} pie="Al día" />
      </div>

      <div className="rejilla-2">
        <Tarjeta
          titulo="Camino al objetivo"
          subtitulo={estado.objetivo.fechaObjetivo ? `Fecha objetivo: ${formatoFecha(estado.objetivo.fechaObjetivo)}` : 'Sin fecha fijada'}
          accion={
            <button type="button" className="boton pequeno" onClick={() => navegar('objetivo')}>
              Ajustar
            </button>
          }
        >
          {proyeccion && resumen && objetivoPeso != null ? (
            <>
              <ProgresoPeso inicio={ordenarMediciones(estado.mediciones)[0]?.pesoKg} actual={resumen.pesoKg} objetivo={objetivoPeso} unidad={estado.perfil.unidad} />
              <Aviso
                tono={
                  proyeccion.viabilidad === 'inviable'
                    ? 'error'
                    : proyeccion.viabilidad === 'exigente' || proyeccion.viabilidad === 'vencido'
                      ? 'alerta'
                      : 'ok'
                }
              >
                {proyeccion.mensaje}
              </Aviso>
            </>
          ) : (
            <Vacio>Definí un objetivo y cargá una medición para ver tu progreso.</Vacio>
          )}
        </Tarjeta>

        <Tarjeta titulo="Peso corporal" accion={<button type="button" className="boton pequeno" onClick={() => navegar('antropometria')}>Registrar</button>}>
          {seriePeso.length ? (
            <GraficoLineas
              series={seriePeso}
              altura={170}
              objetivo={objetivoPeso}
              etiquetaObjetivo={objetivoPeso ? `${numero(objetivoPeso, 1)} kg` : undefined}
              sufijo=" kg"
            />
          ) : (
            <Vacio>Cargá al menos dos mediciones para ver la curva.</Vacio>
          )}
        </Tarjeta>
      </div>

      <div className="rejilla-2">
        <Tarjeta
          titulo="Tu rutina"
          subtitulo={rutinaActiva?.nombre}
          accion={
            <button type="button" className="boton pequeno" onClick={() => navegar('rutina')}>
              Ver
            </button>
          }
        >
          {rutinaActiva ? (
            <div className="columna">
              {rutinaActiva.dias.map((d) => (
                <div key={d.id} className="fila entre">
                  <span>
                    {d.nombre}{' '}
                    {proximoDia?.id === d.id && <Etiqueta tono="acento">Siguiente</Etiqueta>}
                  </span>
                  <span className="pequeno tenue">
                    {d.ejercicios.length} ejercicios ·{' '}
                    {ultimaPorDia.get(d.id) ? fechaCorta(ultimaPorDia.get(d.id)) : 'sin hacer'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Vacio>Sin rutina activa.</Vacio>
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Última sesión"
          accion={
            <button type="button" className="boton pequeno" onClick={() => navegar('progreso')}>
              Historial
            </button>
          }
        >
          {ultimaSesion ? (
            <div className="columna">
              <div className="fila entre">
                <strong>{ultimaSesion.nombre}</strong>
                <span className="tenue pequeno">{fechaCorta(ultimaSesion.fecha)}</span>
              </div>
              <div className="metricas">
                <Metrica etiqueta="Series" valor={numero(seriesEfectivasSesion(ultimaSesion), 0)} />
                <Metrica etiqueta="Tonelaje" valor={`${numero(tonelajeSesion(ultimaSesion), 0)} kg`} />
                <Metrica etiqueta="Ejercicios" valor={numero(ultimaSesion.ejercicios.length, 0)} />
              </div>
              {ultimaSesion.notas && <p className="pequeno tenue">{ultimaSesion.notas}</p>}
            </div>
          ) : (
            <Vacio>
              {sesionesCompletadas.length === 0 ? 'Todavía no registraste ninguna sesión.' : 'Sin datos.'}
            </Vacio>
          )}
        </Tarjeta>
      </div>
    </>
  )
}

function ProgresoPeso({
  inicio,
  actual,
  objetivo,
  unidad,
}: {
  inicio: number | undefined
  actual: number
  objetivo: number
  unidad: 'kg' | 'lb'
}) {
  const origen = inicio ?? actual
  const total = Math.abs(objetivo - origen)
  const hecho = Math.abs(actual - origen)
  const pct = total > 0 ? Math.min(100, (hecho / total) * 100) : 100
  const enCamino = total === 0 || Math.sign(actual - origen) === Math.sign(objetivo - origen) || hecho === 0

  return (
    <div className="columna" style={{ marginBottom: 12 }}>
      <div className="fila entre pequeno">
        <span className="tenue">Inicio {mostrarPeso(origen, unidad)}</span>
        <span>
          <b>{mostrarPeso(actual, unidad)}</b>
        </span>
        <span className="tenue">Objetivo {mostrarPeso(objetivo, unidad)}</span>
      </div>
      <Barra valor={enCamino ? pct : 0} maximo={100} tono={pct >= 100 ? 'ok' : undefined} />
      <span className="pequeno tenue">
        {total === 0
          ? 'Objetivo alcanzado.'
          : `${numero(pct, 0)} % del camino · faltan ${mostrarPeso(Math.abs(objetivo - actual), unidad)}`}
      </span>
    </div>
  )
}
