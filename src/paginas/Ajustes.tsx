'use client'

import { useRef, useState } from 'react'
import { Aviso, Campo, CampoNumero, Chips, Tarjeta } from '../componentes/ui'
import { useAlmacen } from '../estado/almacen'
import { ETIQUETA_ACTIVIDAD, edadDesde } from '../lib/antropometria'
import { exportarJson, importarJson } from '../lib/almacenamiento'
import { ETIQUETA_EQUIPO } from '../lib/ejercicios'
import { hoyISO } from '../lib/formato'
import type { Equipamiento, Experiencia, NivelActividad, Sexo } from '../lib/types'

const EQUIPOS: Equipamiento[] = ['barra', 'mancuernas', 'maquina', 'polea', 'peso_corporal', 'kettlebell', 'banda']
const ACTIVIDADES: NivelActividad[] = ['sedentario', 'ligero', 'moderado', 'alto']
const EXPERIENCIAS: { valor: Experiencia; etiqueta: string; ayuda: string }[] = [
  { valor: 'principiante', etiqueta: 'Principiante', ayuda: 'Menos de un año entrenando con constancia' },
  { valor: 'intermedio', etiqueta: 'Intermedio', ayuda: 'Entre uno y tres años' },
  { valor: 'avanzado', etiqueta: 'Avanzado', ayuda: 'Más de tres años' },
]

export function PaginaAjustes() {
  const { estado, acciones } = useAlmacen()
  const perfil = estado.perfil
  const [mensaje, setMensaje] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null)
  const entradaArchivo = useRef<HTMLInputElement>(null)

  const edad = edadDesde(perfil.fechaNacimiento)

  const descargar = () => {
    const blob = new Blob([exportarJson(estado)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gym-bro-${hoyISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importar = async (archivo: File) => {
    try {
      const texto = await archivo.text()
      acciones.reemplazarEstado(importarJson(texto))
      setMensaje({ tono: 'ok', texto: 'Datos importados correctamente.' })
    } catch {
      setMensaje({ tono: 'error', texto: 'No se pudo leer el archivo: ¿es un export de Gym Bro?' })
    }
  }

  return (
    <>
      <div className="encabezado-pagina">
        <div>
          <h1>Ajustes</h1>
          <p>
            Tus datos se guardan solo en este navegador. Exportalos si querés llevarlos a otro dispositivo o hacer una
            copia de seguridad.
          </p>
        </div>
      </div>

      <Tarjeta titulo="Perfil">
        <div className="formulario">
          <Campo etiqueta="Nombre">
            <input value={perfil.nombre} onChange={(e) => acciones.actualizarPerfil({ nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Sexo" ayuda="Cambia las fórmulas de % de grasa y metabolismo">
            <select value={perfil.sexo} onChange={(e) => acciones.actualizarPerfil({ sexo: e.target.value as Sexo })}>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
            </select>
          </Campo>
          <Campo etiqueta="Fecha de nacimiento" ayuda={edad != null ? `${edad} años` : 'Necesaria para el metabolismo basal'}>
            <input
              type="date"
              value={perfil.fechaNacimiento ?? ''}
              onChange={(e) => acciones.actualizarPerfil({ fechaNacimiento: e.target.value || undefined })}
            />
          </Campo>
          <Campo etiqueta="Altura (cm)">
            <CampoNumero valor={perfil.alturaCm || undefined} paso={0.5} alCambiar={(v) => acciones.actualizarPerfil({ alturaCm: v ?? 0 })} />
          </Campo>
          <Campo etiqueta="Unidad de peso" ayuda="Los datos siempre se guardan en kg">
            <select
              value={perfil.unidad}
              onChange={(e) => acciones.actualizarPerfil({ unidad: e.target.value as 'kg' | 'lb' })}
            >
              <option value="kg">Kilogramos</option>
              <option value="lb">Libras</option>
            </select>
          </Campo>
          <Campo etiqueta="Actividad diaria" ayuda="Fuera del gimnasio">
            <select
              value={perfil.actividad}
              onChange={(e) => acciones.actualizarPerfil({ actividad: e.target.value as NivelActividad })}
            >
              {ACTIVIDADES.map((a) => (
                <option key={a} value={a}>
                  {ETIQUETA_ACTIVIDAD[a]}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Experiencia" subtitulo="Determina el volumen y el número de ejercicios por sesión">
        <div className="opciones">
          {EXPERIENCIAS.map((x) => (
            <button
              key={x.valor}
              type="button"
              className="chip"
              aria-pressed={perfil.experiencia === x.valor}
              title={x.ayuda}
              onClick={() => acciones.actualizarPerfil({ experiencia: x.valor })}
            >
              {x.etiqueta}
            </button>
          ))}
        </div>
        <p className="pequeno tenue" style={{ marginTop: 8 }}>
          {EXPERIENCIAS.find((x) => x.valor === perfil.experiencia)?.ayuda}
        </p>
      </Tarjeta>

      <Tarjeta titulo="Equipamiento disponible" subtitulo="Solo se usarán ejercicios que puedas hacer">
        <Chips
          opciones={EQUIPOS}
          seleccion={perfil.equipamiento}
          etiquetas={ETIQUETA_EQUIPO}
          alCambiar={(v) => acciones.actualizarPerfil({ equipamiento: v })}
        />
        {perfil.equipamiento.length === 0 && (
          <Aviso tono="alerta">
            Sin equipamiento marcado la rutina se genera solo con ejercicios de peso corporal.
          </Aviso>
        )}
      </Tarjeta>

      <Tarjeta titulo="Datos" subtitulo="Copia de seguridad y traslado entre dispositivos">
        {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}
        <div className="acciones" style={{ marginTop: 12 }}>
          <button type="button" className="boton" onClick={descargar}>
            Exportar a JSON
          </button>
          <button type="button" className="boton" onClick={() => entradaArchivo.current?.click()}>
            Importar desde JSON
          </button>
          <input
            ref={entradaArchivo}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const archivo = e.target.files?.[0]
              if (archivo) void importar(archivo)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="boton peligro"
            onClick={() => {
              if (confirm('Esto borra perfil, mediciones, rutinas y sesiones de este navegador. ¿Seguro?')) {
                acciones.reiniciar()
                setMensaje({ tono: 'ok', texto: 'Datos borrados.' })
              }
            }}
          >
            Borrar todos los datos
          </button>
        </div>

        <div className="metricas" style={{ marginTop: 16 }}>
          <div className="metrica">
            <div className="etiqueta">Mediciones</div>
            <div className="valor">{estado.mediciones.length}</div>
          </div>
          <div className="metrica">
            <div className="etiqueta">Sesiones</div>
            <div className="valor">{estado.sesiones.length}</div>
          </div>
          <div className="metrica">
            <div className="etiqueta">Rutinas</div>
            <div className="valor">{estado.rutinas.length}</div>
          </div>
          <div className="metrica">
            <div className="etiqueta">Ejercicios propios</div>
            <div className="valor">{estado.ejerciciosPropios.length}</div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Aviso">
        <p className="pequeno tenue">
          Gym Bro calcula estimaciones a partir de fórmulas estándar (US Navy para el % de grasa, Mifflin-St Jeor y
          Katch-McArdle para el metabolismo, Epley para el 1RM). Son aproximaciones útiles para seguir tendencias, no
          medidas clínicas. Ante lesiones, patologías o dudas sobre tu alimentación, consultá con un profesional.
        </p>
      </Tarjeta>
    </>
  )
}
