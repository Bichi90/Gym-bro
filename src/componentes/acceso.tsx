'use client'

import type { ReactNode } from 'react'
import { GlifoMarca } from './iconos'

/**
 * Marco común de las tres pantallas de acceso. No usa el shell de la app
 * porque ahí la navegación llevaría a secciones que todavía no se pueden ver.
 */
export function MarcoAcceso({
  titulo,
  bajada,
  children,
  pie,
}: {
  titulo: string
  bajada: string
  children: ReactNode
  pie?: ReactNode
}) {
  return (
    <div className="acceso">
      <div className="acceso-caja">
        <div className="acceso-marca">
          <span className="glifo" aria-hidden>
            <GlifoMarca />
          </span>
          Gym Bro
        </div>

        <h1>{titulo}</h1>
        <p className="acceso-bajada">{bajada}</p>

        {children}

        {pie && <div className="acceso-pie">{pie}</div>}
      </div>
    </div>
  )
}

/** Lista de problemas de validación devuelta por el servidor. */
export function Problemas({ mensajes }: { mensajes: string[] }) {
  if (!mensajes.length) return null
  return (
    <div className="aviso error" role="alert">
      {mensajes.length === 1 ? (
        mensajes[0]
      ) : (
        <ul>
          {mensajes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
