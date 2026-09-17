'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { MarcoAcceso, Problemas } from '../../componentes/acceso'
import { entrar, esperaLegible, recordarIntento } from '../../lib/acceso'

function Formulario() {
  const router = useRouter()
  const parametros = useSearchParams()
  const volver = parametros.get('volver')

  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mensajes, setMensajes] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensajes([])

    if (!email.trim() || !contrasena) {
      setMensajes(['Completá el correo y la contraseña.'])
      return
    }

    setEnviando(true)
    const resultado = await entrar({ email, contrasena })
    setEnviando(false)

    if (resultado.estado === 'demasiados_intentos') {
      setMensajes([`Demasiados intentos. Probá de nuevo en ${esperaLegible(resultado.esperarSeg)}.`])
      return
    }
    if (resultado.estado === 'datos_invalidos') {
      setMensajes(resultado.mensajes)
      return
    }
    if (resultado.estado === 'fallo') {
      setMensajes([resultado.mensaje])
      return
    }

    // El servidor contesta lo mismo exista o no la cuenta y sea o no correcta
    // la contraseña. Por eso se sigue siempre a la pantalla del código: si no
    // llega ninguno, es que algo de lo anterior no era válido.
    recordarIntento({ email: email.trim(), contrasena })
    const destino = volver ? `/codigo?volver=${encodeURIComponent(volver)}` : '/codigo'
    router.push(destino)
  }

  return (
    <MarcoAcceso
      titulo="Entrar"
      bajada="Te mandamos un código de 6 dígitos al correo para confirmar que sos vos."
      pie={
        <>
          ¿Todavía no tenés cuenta? <Link href="/crear-cuenta">Creá una</Link>
        </>
      }
    >
      <form className="acceso-formulario" onSubmit={enviar} noValidate>
        <Problemas mensajes={mensajes} />

        <label className="campo">
          <span>Correo</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="vos@correo.com"
            required
          />
        </label>

        <label className="campo">
          <span>Contraseña</span>
          <input
            type="password"
            name="contrasena"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? 'Enviando el código…' : 'Enviar el código'}
        </button>
      </form>
    </MarcoAcceso>
  )
}

export default function Entrar() {
  // useSearchParams obliga a un límite de Suspense para que la página se pueda
  // prerenderizar; sin él, Next falla el build.
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  )
}
