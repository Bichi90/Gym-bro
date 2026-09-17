'use client'

import { useEffect, useState } from 'react'
import { Tarjeta } from './ui'
import { salir, sesionActual, type UsuarioSesion } from '../lib/acceso'

const ETIQUETA_ROL: Record<UsuarioSesion['rol'], string> = {
  entrenado: 'Entrenado',
  entrenador: 'Entrenador',
}

/**
 * Tarjeta de la cuenta: quién está dentro y cómo salir. Se resuelve contra el
 * servidor, no contra la cookie, porque la cookie solo dice que hay algo — el
 * servidor dice si ese algo sigue valiendo.
 */
export function TarjetaCuenta() {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    let vivo = true
    sesionActual().then((u) => {
      if (!vivo) return
      setUsuario(u)
      setCargando(false)
    })
    return () => {
      vivo = false
    }
  }, [])

  async function cerrar() {
    setSaliendo(true)
    await salir()
    // Recarga completa y no `router.push`: así se descarta cualquier dato de
    // la sesión anterior que siguiera en memoria.
    window.location.assign('/entrar')
  }

  if (cargando) return null

  if (!usuario) {
    return (
      <Tarjeta titulo="Cuenta" subtitulo="Todavía no entraste">
        <p className="ayuda">
          Los datos de esta pantalla viven en este navegador. Entrando con tu cuenta vas a poder
          sincronizarlos y, si tenés entrenador, compartirlos con él.
        </p>
        <div className="acciones">
          <a className="boton primario" href="/entrar">
            Entrar
          </a>
          <a className="boton sutil" href="/crear-cuenta">
            Crear cuenta
          </a>
        </div>
      </Tarjeta>
    )
  }

  return (
    <Tarjeta titulo="Cuenta" subtitulo={ETIQUETA_ROL[usuario.rol]}>
      <div className="metricas">
        <div className="metrica">
          <span className="clave">Nombre</span>
          <span className="valor">{usuario.nombre || '—'}</span>
        </div>
        <div className="metrica">
          <span className="clave">Correo</span>
          <span className="valor" style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
            {usuario.email}
          </span>
        </div>
      </div>
      <div className="acciones">
        <button type="button" className="boton sutil peligro" onClick={cerrar} disabled={saliendo}>
          {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
        </button>
      </div>
    </Tarjeta>
  )
}
