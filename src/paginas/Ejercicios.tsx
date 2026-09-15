'use client'

import { useMemo, useState } from 'react'
import { Campo, CampoNumero, Etiqueta, Modal, Tarjeta, Vacio } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { useDerivados } from '../estado/derivados'
import { ETIQUETA_EQUIPO, ETIQUETA_GRUPO, ETIQUETA_PATRON, GRUPOS } from '../lib/ejercicios'
import { fechaCorta, numero } from '../lib/formato'
import type { Ejercicio, Equipamiento, GrupoMuscular, Patron } from '../lib/types'

const EQUIPOS: Equipamiento[] = ['barra', 'mancuernas', 'maquina', 'polea', 'peso_corporal', 'kettlebell', 'banda']
const PATRONES: Patron[] = [
  'empuje_horizontal',
  'empuje_vertical',
  'traccion_horizontal',
  'traccion_vertical',
  'rodilla_dominante',
  'cadera_dominante',
  'aislamiento',
  'core',
]

function nuevoBorrador(): Omit<Ejercicio, 'id' | 'base'> {
  return {
    nombre: '',
    patron: 'aislamiento',
    principal: 'pecho',
    secundarios: [],
    equipamiento: 'mancuernas',
    compuesto: false,
    unilateral: false,
    repsDefecto: [8, 12],
    incrementoKg: 2.5,
  }
}

export function PaginaEjercicios() {
  const { estado, acciones, ejercicios } = useAlmacen()
  const { records } = useDerivados()
  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState<string>('')
  const [equipo, setEquipo] = useState<string>('')
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [creando, setCreando] = useState<Omit<Ejercicio, 'id' | 'base'> | null>(null)

  const disponibles = new Set(estado.perfil.equipamiento)

  const filtrados = useMemo(
    () =>
      ejercicios.filter((e) => {
        if (grupo && e.principal !== grupo) return false
        if (equipo && e.equipamiento !== equipo) return false
        if (soloDisponibles && !disponibles.has(e.equipamiento)) return false
        if (texto.trim() && !e.nombre.toLowerCase().includes(texto.trim().toLowerCase())) return false
        return true
      }),
    [ejercicios, grupo, equipo, soloDisponibles, texto, disponibles],
  )

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Ejercicios</h1>
          <p>
            {ejercicios.length} ejercicios disponibles. Podés añadir los tuyos: se usarán tanto en la generación de
            rutinas como en el registro de sesiones.
          </p>
        </div>
        <button type="button" className="boton primario" onClick={() => setCreando(nuevoBorrador())}>
          + Ejercicio propio
        </button>
      </div>

      <Tarjeta>
        <div className="formulario">
          <Campo etiqueta="Buscar">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre" />
          </Campo>
          <Campo etiqueta="Grupo">
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option value="">Todos</option>
              {GRUPOS.map((g) => (
                <option key={g} value={g}>
                  {ETIQUETA_GRUPO[g]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Equipamiento">
            <select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
              <option value="">Todos</option>
              {EQUIPOS.map((q) => (
                <option key={q} value={q}>
                  {ETIQUETA_EQUIPO[q]}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Solo lo que tengo">
            <label className="fila">
              <input
                type="checkbox"
                checked={soloDisponibles}
                onChange={(e) => setSoloDisponibles(e.target.checked)}
              />
              <span className="pequeno">Según el equipamiento de Ajustes</span>
            </label>
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta titulo={`${filtrados.length} ejercicios`}>
        {filtrados.length === 0 ? (
          <Vacio>Ningún ejercicio coincide con el filtro.</Vacio>
        ) : (
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Ejercicio</th>
                  <th>Grupo</th>
                  <th>Patrón</th>
                  <th>Equipo</th>
                  <th className="numero">Reps</th>
                  <th className="numero">Mejor 1RM</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((e) => {
                  const record = records.get(e.id)
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="fila">
                          {e.nombre}
                          {!e.base && <Etiqueta tono="acento">Propio</Etiqueta>}
                          {e.compuesto && <Etiqueta>Compuesto</Etiqueta>}
                        </div>
                        {e.secundarios.length > 0 && (
                          <div className="pequeno tenue">
                            También: {e.secundarios.map((s) => ETIQUETA_GRUPO[s]).join(', ')}
                          </div>
                        )}
                      </td>
                      <td>{ETIQUETA_GRUPO[e.principal]}</td>
                      <td className="pequeno">{ETIQUETA_PATRON[e.patron]}</td>
                      <td className="pequeno">{ETIQUETA_EQUIPO[e.equipamiento]}</td>
                      <td className="numero">
                        {e.repsDefecto[0]}–{e.repsDefecto[1]}
                      </td>
                      <td className="numero">
                        {record ? (
                          <span title={`El ${fechaCorta(record.fecha)}`}>{numero(record.rm1Kg, 1)} kg</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="numero">
                        {!e.base && (
                          <button
                            type="button"
                            className="boton sutil pequeno peligro"
                            onClick={() => {
                              if (confirm(`¿Borrar "${e.nombre}"? Las sesiones ya registradas no se modifican.`))
                                acciones.borrarEjercicio(e.id)
                            }}
                          >
                            Borrar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {creando && (
        <Modal titulo="Nuevo ejercicio" alCerrar={() => setCreando(null)}>
          <FormularioEjercicio
            borrador={creando}
            alCambiar={setCreando}
            alGuardar={() => {
              acciones.crearEjercicio(creando)
              setCreando(null)
            }}
            alCancelar={() => setCreando(null)}
          />
        </Modal>
      )}
    </>
  )
}

function FormularioEjercicio({
  borrador,
  alCambiar,
  alGuardar,
  alCancelar,
}: {
  borrador: Omit<Ejercicio, 'id' | 'base'>
  alCambiar(b: Omit<Ejercicio, 'id' | 'base'>): void
  alGuardar(): void
  alCancelar(): void
}) {
  const set = (cambios: Partial<Omit<Ejercicio, 'id' | 'base'>>) => alCambiar({ ...borrador, ...cambios })

  return (
    <div className="columna">
      <Campo etiqueta="Nombre">
        <input value={borrador.nombre} onChange={(e) => set({ nombre: e.target.value })} placeholder="Press inclinado en Smith" />
      </Campo>

      <div className="formulario">
        <Campo etiqueta="Grupo principal">
          <select value={borrador.principal} onChange={(e) => set({ principal: e.target.value as GrupoMuscular })}>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {ETIQUETA_GRUPO[g]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Patrón">
          <select value={borrador.patron} onChange={(e) => set({ patron: e.target.value as Patron })}>
            {PATRONES.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PATRON[p]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Equipamiento">
          <select value={borrador.equipamiento} onChange={(e) => set({ equipamiento: e.target.value as Equipamiento })}>
            {EQUIPOS.map((q) => (
              <option key={q} value={q}>
                {ETIQUETA_EQUIPO[q]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo etiqueta="Grupos secundarios">
        <div className="opciones">
          {GRUPOS.filter((g) => g !== borrador.principal).map((g) => {
            const activo = borrador.secundarios.includes(g)
            return (
              <button
                key={g}
                type="button"
                className="chip"
                aria-pressed={activo}
                onClick={() =>
                  set({
                    secundarios: activo ? borrador.secundarios.filter((x) => x !== g) : [...borrador.secundarios, g],
                  })
                }
              >
                {ETIQUETA_GRUPO[g]}
              </button>
            )
          })}
        </div>
      </Campo>

      <div className="formulario">
        <Campo etiqueta="Reps mínimas">
          <CampoNumero
            valor={borrador.repsDefecto[0]}
            min={1}
            alCambiar={(v) => set({ repsDefecto: [v ?? 1, borrador.repsDefecto[1]] })}
          />
        </Campo>
        <Campo etiqueta="Reps máximas">
          <CampoNumero
            valor={borrador.repsDefecto[1]}
            min={1}
            alCambiar={(v) => set({ repsDefecto: [borrador.repsDefecto[0], v ?? 1] })}
          />
        </Campo>
        <Campo etiqueta="Incremento de carga (kg)" ayuda="Cuánto sube cuando progresás">
          <CampoNumero valor={borrador.incrementoKg} paso={0.5} min={0} alCambiar={(v) => set({ incrementoKg: v ?? 0 })} />
        </Campo>
      </div>

      <div className="opciones">
        <label className="fila">
          <input type="checkbox" checked={borrador.compuesto} onChange={(e) => set({ compuesto: e.target.checked })} />
          <span className="pequeno">Es un ejercicio compuesto</span>
        </label>
        <label className="fila">
          <input type="checkbox" checked={borrador.unilateral} onChange={(e) => set({ unilateral: e.target.checked })} />
          <span className="pequeno">Es unilateral</span>
        </label>
      </div>

      <div className="acciones" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="boton" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="button" className="boton primario" disabled={!borrador.nombre.trim()} onClick={alGuardar}>
          Crear ejercicio
        </button>
      </div>
    </div>
  )
}
