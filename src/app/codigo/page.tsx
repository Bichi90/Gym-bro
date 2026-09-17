'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MarcoAcceso, Problemas } from '../../componentes/acceso'
import {
  entrar,
  esperaLegible,
  intentoPendiente,
  olvidarIntento,
  verificar,
} from '../../lib/acceso'
import { destinoSeguro } from '../../lib/rutas'

/** Espera mínima entre reenvíos, igual que la del servidor. */
const ESPERA_REENVIO_SEG = 60

function Formulario() {
  const router = useRouter()
  const parametros = useSearchParams()
  const destino = destinoSeguro(parametros.get('volver'))

  const [intento, setIntento] = useState<ReturnType<typeof intentoPendiente>>(null)
  const [listo, setListo] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [mensajes, setMensajes] = useState<string[]>([])
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [espera, setEspera] = useState(ESPERA_REENVIO_SEG)

  // El intento vive en memoria del módulo, así que solo se puede leer una vez
  // montado el componente: en el servidor no existe.
  useEffect(() => {
    setIntento(intentoPendiente())
    setListo(true)
  }, [])

  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!intento) return
    setMensajes([])
    setAviso('')

    const limpio = codigo.replace(/\D/g, '')
    if (limpio.length !== 6) {
      setMensajes(['El código tiene 6 dígitos.'])
      return
    }

    setEnviando(true)
    const resultado = await verificar({ email: intento.email, codigo: limpio })
    setEnviando(false)

    if (resultado.estado === 'ok') {
      olvidarIntento()
      // `replace` y no `push`: volver atrás no debe traer de nuevo la pantalla
      // del código. `refresh` hace que el servidor vuelva a resolver la sesión.
      router.replace(destino)
      router.refresh()
      return
    }
    if (resultado.estado === 'codigo_expirado') {
      setMensajes(['Ese código ya venció. Pedí uno nuevo.'])
      setEspera(0)
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
    setMensajes(['El código no coincide. Revisalo y probá otra vez.'])
  }

  async function reenviar() {
    if (!intento || espera > 0) return
    setMensajes([])
    setAviso('')
    setEnviando(true)
    // Siempre por `entrar`, también cuando se venía de un alta: la cuenta ya
    // existe, y ese camino vuelve a emitir el código de verificación del
    // correo. Repetir el registro, en cambio, solo dispararía el aviso al
    // dueño de una cuenta ya existente.
    const resultado = await entrar({ email: intento.email, contrasena: intento.contrasena })
    setEnviando(false)
    setEspera(ESPERA_REENVIO_SEG)

    if (resultado.estado === 'demasiados_intentos') {
      setMensajes([`Pediste varios códigos seguidos. Esperá ${esperaLegible(resultado.esperarSeg)}.`])
      return
    }
    if (resultado.estado === 'fallo') {
      setMensajes([resultado.mensaje])
      return
    }
    setAviso('Listo, te mandamos otro código.')
  }

  if (!listo) return null

  // Sin intento en memoria no hay a qué correo mandar nada: pasa al recargar la
  // página, y lo honesto es decirlo en vez de dejar un formulario que no puede
  // funcionar.
  if (!intento) {
    return (
      <MarcoAcceso
        titulo="Se perdió el intento"
        bajada="Al recargar la página se pierde el correo con el que estabas entrando."
      >
        <div className="acceso-formulario">
          <Link href="/entrar" className="boton primario">
            Volver a entrar
          </Link>
        </div>
      </MarcoAcceso>
    )
  }

  return (
    <MarcoAcceso
      titulo="Tu código"
      bajada={`Si ${intento.email} tiene cuenta, le llegó un código de 6 dígitos. Vence a los 10 minutos.`}
      pie={
        <>
          ¿Otro correo? <Link href="/entrar">Empezá de nuevo</Link>
        </>
      }
    >
      <form className="acceso-formulario" onSubmit={enviar} noValidate>
        <Problemas mensajes={mensajes} />
        {aviso && (
          <div className="aviso ok" role="status">
            {aviso}
          </div>
        )}

        <label className="campo">
          <span>Código</span>
          <input
            className="campo-codigo"
            type="text"
            name="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))}
            inputMode="numeric"
            // Deja que el teléfono lo ofrezca desde la notificación del correo.
            autoComplete="one-time-code"
            autoFocus
            placeholder="123 456"
            aria-describedby="ayuda-codigo"
            required
          />
          <span className="ayuda" id="ayuda-codigo">
            Revisá también el correo no deseado.
          </span>
        </label>

        <button type="submit" className="boton primario" disabled={enviando}>
          {enviando ? 'Comprobando…' : 'Confirmar'}
        </button>

        <button type="button" className="boton sutil" onClick={reenviar} disabled={enviando || espera > 0}>
          {espera > 0 ? `Reenviar en ${espera} s` : 'Reenviar el código'}
        </button>
      </form>
    </MarcoAcceso>
  )
}

export default function Codigo() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  )
}
