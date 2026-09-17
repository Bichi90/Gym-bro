'use client'

import { Suspense, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MarcoAcceso, Problemas } from '../../componentes/acceso'
import { crearCuenta, esperaLegible, recordarIntento, type Rol } from '../../lib/acceso'

const ROLES: { id: Rol; etiqueta: string; ayuda: string }[] = [
  { id: 'entrenado', etiqueta: 'Me entreno', ayuda: 'Seguís tu rutina, tus cargas y tu progreso.' },
  {
    id: 'entrenador',
    etiqueta: 'Entreno gente',
    ayuda: 'Armás rutinas para tus alumnos y seguís cómo van.',
  },
]

function Formulario() {
  const router = useRouter()
  const parametros = useSearchParams()
  const volver = parametros.get('volver')

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rol, setRol] = useState<Rol>('entrenado')
  const [mensajes, setMensajes] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  const ayudaRol = ROLES.find((r) => r.id === rol)?.ayuda ?? ''

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensajes([])
    setEnviando(true)
    const resultado = await crearCuenta({ nombre, email, contrasena, rol })
    setEnviando(false)

    if (resultado.estado === 'datos_invalidos') {
      setMensajes(resultado.mensajes)
      return
    }
    if (resultado.estado === 'demasiados_intentos') {
      setMensajes([`Demasiados intentos. Probá de nuevo en ${esperaLegible(resultado.esperarSeg)}.`])
      return
    }
    if (resultado.estado === 'fallo') {
      setMensajes([resultado.mensaje])
      return
    }

    // Si el correo ya tenía cuenta, el servidor responde igual y le avisa al
    // dueño. Aquí no hay forma de distinguirlo, y así tiene que ser.
    recordarIntento({ email: email.trim(), contrasena })
    const destino = volver ? `/codigo?volver=${encodeURIComponent(volver)}` : '/codigo'
    router.push(destino)
  }

  return (
    <MarcoAcceso
      titulo="Crear cuenta"
      bajada="Con el correo y una contraseña alcanza. Después confirmás con un código."
      pie={
        <>
          ¿Ya tenés cuenta? <Link href="/entrar">Entrá</Link>
        </>
      }
    >
      <form className="acceso-formulario" onSubmit={enviar} noValidate>
        <Problemas mensajes={mensajes} />

        <div className="campo">
          <span>¿Cómo vas a usar la app?</span>
          <div className="opciones">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                className="chip"
                aria-pressed={rol === r.id}
                onClick={() => setRol(r.id)}
              >
                {r.etiqueta}
              </button>
            ))}
          </div>
          <span className="ayuda">{ayudaRol}</span>
        </div>

        <label className="campo">
          <span>Nombre</span>
          <input
            type="text"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="name"
            placeholder="Cómo querés que te llamemos"
          />
        </label>

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
            autoComplete="new-password"
            required
          />
          <span className="ayuda">
            Mínimo 10 caracteres. Una frase que recuerdes es mejor que algo corto y retorcido.
          </span>
        </label>

        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? 'Creando la cuenta…' : 'Crear la cuenta'}
        </button>
      </form>
    </MarcoAcceso>
  )
}

export default function CrearCuenta() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  )
}
