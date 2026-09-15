'use client'

import { useMemo, useState } from 'react'
import { GraficoLineas, type Serie } from '../componentes/graficos'
import { Aviso, Campo, CampoNumero, Metrica, Modal, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { useDerivados } from '../estado/derivados'
import {
  clasificacionImc,
  grasaNavy,
  mediaMovilPeso,
  ordenarMediciones,
  resumirMedicion,
} from '../lib/antropometria'
import { nuevoId } from '../lib/almacenamiento'
import { diferenciaConSigno, fechaCorta, hoyISO, mostrarPeso, numero, porcentaje } from '../lib/formato'
import { pesoObjetivoEfectivo } from '../lib/objetivo'
import type { Medicion } from '../lib/types'

const CIRCUNFERENCIAS = [
  ['cuelloCm', 'Cuello'],
  ['cinturaCm', 'Cintura'],
  ['caderaCm', 'Cadera'],
  ['pechoCm', 'Pecho'],
  ['hombroCm', 'Hombros'],
  ['brazoCm', 'Brazo'],
  ['antebrazoCm', 'Antebrazo'],
  ['musloCm', 'Muslo'],
  ['gemeloCm', 'Gemelo'],
] as const

type ClaveCircunferencia = (typeof CIRCUNFERENCIAS)[number][0]

function medicionVacia(): Medicion {
  return { id: nuevoId('med'), fecha: hoyISO(), pesoKg: 0 }
}

export function PaginaAntropometria() {
  const { estado, acciones } = useAlmacen()
  const { resumen, tendenciaKgSemana } = useDerivados()
  const [editando, setEditando] = useState<Medicion | null>(null)

  const perfil = estado.perfil
  const ordenadas = useMemo(() => ordenarMediciones(estado.mediciones), [estado.mediciones])
  const objetivoPeso = resumen ? pesoObjetivoEfectivo(resumen, estado.objetivo) : undefined

  const seriesPeso = useMemo<Serie[]>(() => {
    if (!ordenadas.length) return []
    const series: Serie[] = [
      {
        nombre: 'Peso',
        color: 'var(--acento)',
        puntos: ordenadas.map((m) => ({ fecha: m.fecha, valor: m.pesoKg })),
      },
    ]
    if (ordenadas.length >= 3) {
      series.push({
        nombre: 'Media 7 días',
        color: 'var(--info)',
        discontinua: true,
        puntos: mediaMovilPeso(ordenadas).map((p) => ({ fecha: p.fecha, valor: p.valor })),
      })
    }
    return series
  }, [ordenadas])

  // Grasa y masa magra van en gráficos separados: sus escalas (% y kg) no son comparables.
  const composicion = useMemo(() => {
    const grasa: { fecha: string; valor: number }[] = []
    const magra: { fecha: string; valor: number }[] = []
    for (const m of ordenadas) {
      const r = resumirMedicion(m, perfil, estado.objetivo.diasPorSemana)
      if (r.grasaPct != null) grasa.push({ fecha: m.fecha, valor: r.grasaPct })
      if (r.masaMagraKg != null) magra.push({ fecha: m.fecha, valor: r.masaMagraKg })
    }
    return {
      grasa: grasa.length ? [{ nombre: '% de grasa', color: 'var(--alerta)', puntos: grasa }] : [],
      magra: magra.length ? [{ nombre: 'Masa magra', color: 'var(--ok)', puntos: magra }] : [],
    } satisfies { grasa: Serie[]; magra: Serie[] }
  }, [ordenadas, perfil, estado.objetivo.diasPorSemana])

  const seriesCircunferencias = useMemo<Serie[]>(() => {
    const colores = ['var(--acento)', 'var(--info)', 'var(--ok)', 'var(--alerta)', 'var(--objetivo)']
    const claves: ClaveCircunferencia[] = ['cinturaCm', 'pechoCm', 'brazoCm', 'musloCm', 'caderaCm']
    const series: Serie[] = []
    claves.forEach((clave, i) => {
      const puntos = ordenadas
        .filter((m) => m[clave] != null)
        .map((m) => ({ fecha: m.fecha, valor: m[clave] as number }))
      if (puntos.length >= 2) {
        const nombre = CIRCUNFERENCIAS.find(([k]) => k === clave)?.[1] ?? clave
        series.push({ nombre, color: colores[i % colores.length]!, puntos })
      }
    })
    return series
  }, [ordenadas])

  const primera = ordenadas[0]
  const delta = resumen && primera ? resumen.pesoKg - primera.pesoKg : undefined

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Antropometría</h1>
          <p>
            Registrá peso y circunferencias. Con cuello y cintura (y cadera si sos mujer) se estima el % de grasa por
            el método de la US Navy, y de ahí salen masa magra, metabolismo basal y gasto diario.
          </p>
        </div>
        <button type="button" className="boton primario" onClick={() => setEditando(medicionVacia())}>
          + Nueva medición
        </button>
      </div>

      {!perfil.alturaCm && (
        <Aviso tono="alerta">
          Cargá tu altura en <b>Ajustes</b> para poder calcular IMC, % de grasa y metabolismo.
        </Aviso>
      )}

      <Tarjeta titulo="Estado actual" subtitulo={resumen ? `Última medición: ${fechaCorta(ordenadas.at(-1)?.fecha)}` : undefined}>
        {resumen ? (
          <div className="metricas">
            <Metrica
              etiqueta="Peso"
              valor={mostrarPeso(resumen.pesoKg, perfil.unidad)}
              pie={
                delta != null && Math.abs(delta) > 0.05
                  ? `${diferenciaConSigno(perfil.unidad === 'kg' ? delta : delta / 0.45359237, 1)} ${perfil.unidad} desde el inicio`
                  : 'Primera medición'
              }
            />
            <Metrica
              etiqueta="% de grasa"
              valor={porcentaje(resumen.grasaPct)}
              pie={resumen.fuenteGrasa === 'medido' ? 'Valor medido' : resumen.grasaPct != null ? 'Estimado (US Navy)' : 'Falta cuello/cintura'}
            />
            <Metrica etiqueta="Masa magra" valor={mostrarPeso(resumen.masaMagraKg, perfil.unidad)} pie="Músculo, hueso y agua" />
            <Metrica etiqueta="Masa grasa" valor={mostrarPeso(resumen.masaGrasaKg, perfil.unidad)} />
            <Metrica
              etiqueta="IMC"
              valor={numero(resumen.imc, 1)}
              pie={resumen.imc != null ? clasificacionImc(resumen.imc) : undefined}
            />
            <Metrica
              etiqueta="Metabolismo basal"
              valor={resumen.tmb != null ? `${numero(resumen.tmb, 0)} kcal` : '—'}
              pie={resumen.fuenteTmb}
            />
            <Metrica
              etiqueta="Gasto diario"
              valor={resumen.tdee != null ? `${numero(resumen.tdee, 0)} kcal` : '—'}
              pie={`Actividad ${perfil.actividad} + ${estado.objetivo.diasPorSemana} entrenos`}
            />
            <Metrica
              etiqueta="Tendencia"
              valor={
                tendenciaKgSemana != null
                  ? `${diferenciaConSigno(tendenciaKgSemana, 2)} kg/sem`
                  : '—'
              }
              pie="Últimas 4 semanas"
            />
            {resumen.cinturaAltura != null && (
              <Metrica
                etiqueta="Cintura / altura"
                valor={numero(resumen.cinturaAltura, 2)}
                pie={resumen.cinturaAltura < 0.5 ? 'En rango saludable' : 'Por encima de 0,50'}
              />
            )}
          </div>
        ) : (
          <Vacio>Todavía no cargaste ninguna medición.</Vacio>
        )}
      </Tarjeta>

      <div className="rejilla-2">
        <Tarjeta titulo="Peso" subtitulo="La media móvil filtra el ruido del día a día">
          <GraficoLineas
            series={seriesPeso}
            objetivo={objetivoPeso}
            etiquetaObjetivo={objetivoPeso ? `${numero(objetivoPeso, 1)} kg` : undefined}
            sufijo=" kg"
          />
        </Tarjeta>

        <Tarjeta titulo="Composición corporal" subtitulo="Lo que interesa: que baje la grasa sin perder masa magra">
          <div className="columna">
            <div>
              <div className="pequeno tenue">% de grasa</div>
              <GraficoLineas
                series={composicion.grasa}
                altura={140}
                objetivo={estado.objetivo.grasaObjetivoPct}
                etiquetaObjetivo={
                  estado.objetivo.grasaObjetivoPct != null ? `${numero(estado.objetivo.grasaObjetivoPct, 1)} %` : undefined
                }
                sufijo=" %"
              />
            </div>
            <div>
              <div className="pequeno tenue">Masa magra (kg)</div>
              <GraficoLineas series={composicion.magra} altura={140} sufijo=" kg" />
            </div>
          </div>
        </Tarjeta>
      </div>

      {seriesCircunferencias.length > 0 && (
        <Tarjeta titulo="Circunferencias" subtitulo="En centímetros">
          <GraficoLineas series={seriesCircunferencias} sufijo=" cm" />
        </Tarjeta>
      )}

      <Tarjeta titulo="Historial" subtitulo={`${ordenadas.length} mediciones`}>
        {ordenadas.length === 0 ? (
          <Vacio>Agregá tu primera medición para empezar a ver la evolución.</Vacio>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="numero">Peso</th>
                  <th className="numero">% grasa</th>
                  <th className="numero">Magra</th>
                  <th className="numero">Cintura</th>
                  <th className="numero">Brazo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...ordenadas].reverse().map((m) => {
                  const r = resumirMedicion(m, perfil, estado.objetivo.diasPorSemana)
                  return (
                    <tr key={m.id}>
                      <td>{fechaCorta(m.fecha)}</td>
                      <td className="numero">{numero(m.pesoKg, 1)}</td>
                      <td className="numero">{r.grasaPct != null ? numero(r.grasaPct, 1) : '—'}</td>
                      <td className="numero">{r.masaMagraKg != null ? numero(r.masaMagraKg, 1) : '—'}</td>
                      <td className="numero">{m.cinturaCm != null ? numero(m.cinturaCm, 1) : '—'}</td>
                      <td className="numero">{m.brazoCm != null ? numero(m.brazoCm, 1) : '—'}</td>
                      <td className="numero">
                        <div className="fila" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="boton sutil pequeno" onClick={() => setEditando(m)}>
                            Editar
                          </button>
                          <button
                            type="button"
                            className="boton sutil pequeno peligro"
                            onClick={() => {
                              if (confirm(`¿Borrar la medición del ${fechaCorta(m.fecha)}?`)) acciones.borrarMedicion(m.id)
                            }}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {editando && (
        <DialogoMedicion
          medicion={editando}
          alCerrar={() => setEditando(null)}
          alGuardar={(m) => {
            acciones.guardarMedicion(m)
            setEditando(null)
          }}
        />
      )}
    </>
  )
}

function DialogoMedicion({
  medicion,
  alGuardar,
  alCerrar,
}: {
  medicion: Medicion
  alGuardar(m: Medicion): void
  alCerrar(): void
}) {
  const { estado } = useAlmacen()
  const [borrador, setBorrador] = useState<Medicion>(medicion)
  const perfil = estado.perfil

  const set = (cambios: Partial<Medicion>) => setBorrador((b) => ({ ...b, ...cambios }))
  const estimada = grasaNavy(borrador, perfil.sexo, perfil.alturaCm)
  const necesitaCadera = perfil.sexo === 'femenino'

  return (
    <Modal titulo="Medición" alCerrar={alCerrar}>
      <div className="formulario">
        <Campo etiqueta="Fecha">
          <input type="date" value={borrador.fecha} onChange={(e) => set({ fecha: e.target.value })} />
        </Campo>
        <Campo etiqueta="Peso (kg)">
          <CampoNumero valor={borrador.pesoKg || undefined} paso={0.1} alCambiar={(v) => set({ pesoKg: v ?? 0 })} />
        </Campo>
        <Campo etiqueta="% de grasa medido" ayuda="Opcional: balanza, plicómetro o DEXA">
          <CampoNumero
            valor={borrador.grasaPct}
            paso={0.1}
            marcador={estimada != null ? `Estimado: ${numero(estimada, 1)}` : 'Opcional'}
            alCambiar={(v) => set({ grasaPct: v })}
          />
        </Campo>
      </div>

      <fieldset>
        <legend>Circunferencias (cm)</legend>
        <div className="formulario">
          {CIRCUNFERENCIAS.map(([clave, etiqueta]) => (
            <Campo
              key={clave}
              etiqueta={etiqueta}
              ayuda={
                clave === 'cinturaCm' || clave === 'cuelloCm' || (clave === 'caderaCm' && necesitaCadera)
                  ? 'Se usa para el % de grasa'
                  : undefined
              }
            >
              <CampoNumero valor={borrador[clave]} paso={0.5} alCambiar={(v) => set({ [clave]: v } as Partial<Medicion>)} />
            </Campo>
          ))}
        </div>
      </fieldset>

      {estimada != null && borrador.grasaPct == null && (
        <Aviso tono="info">Con estas medidas, el % de grasa estimado es {porcentaje(estimada)}.</Aviso>
      )}

      <Campo etiqueta="Notas">
        <textarea value={borrador.notas ?? ''} onChange={(e) => set({ notas: e.target.value })} />
      </Campo>

      <div className="acciones" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="boton" onClick={alCerrar}>
          Cancelar
        </button>
        <button
          type="button"
          className="boton primario"
          disabled={!borrador.pesoKg || !borrador.fecha}
          onClick={() => alGuardar(borrador)}
        >
          Guardar medición
        </button>
      </div>
    </Modal>
  )
}
