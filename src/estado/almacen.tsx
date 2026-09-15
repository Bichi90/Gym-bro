'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cargarEstado, guardarEstado, estadoInicial, nuevoId } from '../lib/almacenamiento'
import { EJERCICIOS_BASE } from '../lib/ejercicios'
import { hoyISO } from '../lib/formato'
import { generarRutina } from '../lib/rutina'
import type {
  Ejercicio,
  Estado,
  Medicion,
  Objetivo,
  Perfil,
  Rutina,
  SerieRegistrada,
  Sesion,
} from '../lib/types'

interface Acciones {
  actualizarPerfil(cambios: Partial<Perfil>): void
  actualizarObjetivo(cambios: Partial<Objetivo>): void

  guardarMedicion(m: Medicion): void
  borrarMedicion(id: string): void

  crearRutinaDesdeObjetivo(nombre?: string): Rutina
  guardarRutina(r: Rutina): void
  activarRutina(id: string): void
  borrarRutina(id: string): void

  iniciarSesion(entrada: { rutinaId?: string; diaId?: string; nombre: string }): void
  agregarEjercicioASesion(ejercicioId: string): void
  quitarEjercicioDeSesion(ejercicioId: string): void
  agregarSerie(ejercicioId: string, serie?: Partial<SerieRegistrada>): void
  actualizarSerie(ejercicioId: string, serieId: string, cambios: Partial<SerieRegistrada>): void
  borrarSerie(ejercicioId: string, serieId: string): void
  actualizarSesionActiva(cambios: Partial<Sesion>): void
  finalizarSesion(): void
  descartarSesion(): void
  borrarSesion(id: string): void

  crearEjercicio(e: Omit<Ejercicio, 'id' | 'base'>): Ejercicio
  borrarEjercicio(id: string): void

  reemplazarEstado(e: Estado): void
  reiniciar(): void
}

interface Almacen {
  estado: Estado
  /** false hasta que se ha leído el almacenamiento del dispositivo. */
  hidratado: boolean
  acciones: Acciones
  /** Catálogo base más los ejercicios creados por el usuario. */
  ejercicios: Ejercicio[]
  buscarEjercicio(id: string): Ejercicio | undefined
  rutinaActiva: Rutina | undefined
}

const ContextoAlmacen = createContext<Almacen | null>(null)

export function ProveedorAlmacen({ children }: { children: ReactNode }) {
  // El primer render tiene que coincidir con el del servidor, así que arranca
  // con el estado inicial y el contenido real se lee ya en el navegador. Si se
  // leyera localStorage durante el render, la hidratación no cuadraría.
  const [estado, setEstado] = useState<Estado>(estadoInicial)
  const [hidratado, setHidratado] = useState(false)

  useEffect(() => {
    setEstado(cargarEstado())
    setHidratado(true)
  }, [])

  useEffect(() => {
    // Nada de escribir antes de haber leído: se borrarían los datos guardados.
    if (!hidratado) return
    guardarEstado(estado)
  }, [estado, hidratado])

  const valor = useMemo<Almacen>(() => {
    const ejercicios = [...EJERCICIOS_BASE, ...estado.ejerciciosPropios]
    const indice = new Map(ejercicios.map((e) => [e.id, e]))

    /** Aplica un cambio sobre la sesión en curso; si no hay ninguna, no hace nada. */
    const conSesion = (fn: (s: Sesion) => Sesion) =>
      setEstado((prev) => (prev.sesionActiva ? { ...prev, sesionActiva: fn(prev.sesionActiva) } : prev))

    const conEjercicioDeSesion = (
      ejercicioId: string,
      fn: (e: import('../lib/types').EjercicioRegistrado) => import('../lib/types').EjercicioRegistrado,
    ) =>
      conSesion((s) => ({
        ...s,
        ejercicios: s.ejercicios.map((e) => (e.ejercicioId === ejercicioId ? fn(e) : e)),
      }))

    const acciones: Acciones = {
      actualizarPerfil(cambios) {
        setEstado((prev) => ({ ...prev, perfil: { ...prev.perfil, ...cambios } }))
      },
      actualizarObjetivo(cambios) {
        setEstado((prev) => ({ ...prev, objetivo: { ...prev.objetivo, ...cambios } }))
      },

      guardarMedicion(m) {
        setEstado((prev) => {
          const existe = prev.mediciones.some((x) => x.id === m.id)
          const mediciones = existe
            ? prev.mediciones.map((x) => (x.id === m.id ? m : x))
            : [...prev.mediciones, m]
          return { ...prev, mediciones: mediciones.sort((a, b) => a.fecha.localeCompare(b.fecha)) }
        })
      },
      borrarMedicion(id) {
        setEstado((prev) => ({ ...prev, mediciones: prev.mediciones.filter((m) => m.id !== id) }))
      },

      crearRutinaDesdeObjetivo(nombre) {
        const rutina = generarRutina({
          perfil: estado.perfil,
          objetivo: estado.objetivo,
          ejercicios,
          ...(nombre ? { nombre } : {}),
        })
        setEstado((prev) => ({
          ...prev,
          rutinas: [...prev.rutinas.map((r) => ({ ...r, activa: false })), rutina],
        }))
        return rutina
      },
      guardarRutina(r) {
        setEstado((prev) => ({
          ...prev,
          rutinas: prev.rutinas.some((x) => x.id === r.id)
            ? prev.rutinas.map((x) => (x.id === r.id ? r : x))
            : [...prev.rutinas, r],
        }))
      },
      activarRutina(id) {
        setEstado((prev) => ({
          ...prev,
          rutinas: prev.rutinas.map((r) => ({ ...r, activa: r.id === id })),
        }))
      },
      borrarRutina(id) {
        setEstado((prev) => ({ ...prev, rutinas: prev.rutinas.filter((r) => r.id !== id) }))
      },

      iniciarSesion({ rutinaId, diaId, nombre }) {
        setEstado((prev) => {
          if (prev.sesionActiva) return prev
          const rutina = prev.rutinas.find((r) => r.id === rutinaId)
          const dia = rutina?.dias.find((d) => d.id === diaId)
          const ahora = new Date()
          const sesion: Sesion = {
            id: nuevoId('sesion'),
            fecha: hoyISO(ahora),
            inicio: ahora.toISOString(),
            rutinaId,
            diaId,
            nombre,
            ejercicios: (dia?.ejercicios ?? []).map((p) => ({
              ejercicioId: p.ejercicioId,
              plan: { series: p.series, repsMin: p.repsMin, repsMax: p.repsMax, rir: p.rir },
              series: [],
            })),
          }
          return { ...prev, sesionActiva: sesion }
        })
      },
      agregarEjercicioASesion(ejercicioId) {
        conSesion((s) =>
          s.ejercicios.some((e) => e.ejercicioId === ejercicioId)
            ? s
            : { ...s, ejercicios: [...s.ejercicios, { ejercicioId, series: [] }] },
        )
      },
      quitarEjercicioDeSesion(ejercicioId) {
        conSesion((s) => ({ ...s, ejercicios: s.ejercicios.filter((e) => e.ejercicioId !== ejercicioId) }))
      },
      agregarSerie(ejercicioId, serie) {
        conEjercicioDeSesion(ejercicioId, (e) => {
          const ultima = e.series.at(-1)
          const nueva: SerieRegistrada = {
            id: nuevoId('serie'),
            pesoKg: serie?.pesoKg ?? ultima?.pesoKg ?? 0,
            reps: serie?.reps ?? ultima?.reps ?? e.plan?.repsMin ?? 8,
            tipo: serie?.tipo ?? 'normal',
            completada: serie?.completada ?? false,
            ...(serie?.rir != null ? { rir: serie.rir } : ultima?.rir != null ? { rir: ultima.rir } : {}),
          }
          return { ...e, series: [...e.series, nueva] }
        })
      },
      actualizarSerie(ejercicioId, serieId, cambios) {
        conEjercicioDeSesion(ejercicioId, (e) => ({
          ...e,
          series: e.series.map((s) => (s.id === serieId ? { ...s, ...cambios } : s)),
        }))
      },
      borrarSerie(ejercicioId, serieId) {
        conEjercicioDeSesion(ejercicioId, (e) => ({ ...e, series: e.series.filter((s) => s.id !== serieId) }))
      },
      actualizarSesionActiva(cambios) {
        conSesion((s) => ({ ...s, ...cambios }))
      },
      finalizarSesion() {
        setEstado((prev) => {
          if (!prev.sesionActiva) return prev
          const cerrada: Sesion = {
            ...prev.sesionActiva,
            fin: new Date().toISOString(),
            // Se descartan los ejercicios sin ninguna serie registrada.
            ejercicios: prev.sesionActiva.ejercicios.filter((e) => e.series.length > 0),
          }
          const { sesionActiva: _descartada, ...resto } = prev
          return { ...resto, sesiones: [...prev.sesiones, cerrada] }
        })
      },
      descartarSesion() {
        setEstado((prev) => {
          const { sesionActiva: _descartada, ...resto } = prev
          return { ...resto }
        })
      },
      borrarSesion(id) {
        setEstado((prev) => ({ ...prev, sesiones: prev.sesiones.filter((s) => s.id !== id) }))
      },

      crearEjercicio(datos) {
        const ejercicio: Ejercicio = { ...datos, id: nuevoId('ej'), base: false }
        setEstado((prev) => ({ ...prev, ejerciciosPropios: [...prev.ejerciciosPropios, ejercicio] }))
        return ejercicio
      },
      borrarEjercicio(id) {
        setEstado((prev) => ({ ...prev, ejerciciosPropios: prev.ejerciciosPropios.filter((e) => e.id !== id) }))
      },

      reemplazarEstado(e) {
        setEstado(e)
      },
      reiniciar() {
        setEstado(estadoInicial())
      },
    }

    return {
      estado,
      hidratado,
      acciones,
      ejercicios,
      buscarEjercicio: (id: string) => indice.get(id),
      rutinaActiva: estado.rutinas.find((r) => r.activa) ?? estado.rutinas.at(-1),
    }
  }, [estado, hidratado])

  return <ContextoAlmacen.Provider value={valor}>{children}</ContextoAlmacen.Provider>
}

export function useAlmacen(): Almacen {
  const ctx = useContext(ContextoAlmacen)
  if (!ctx) throw new Error('useAlmacen debe usarse dentro de <ProveedorAlmacen>')
  return ctx
}
