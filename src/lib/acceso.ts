/**
 * Cliente de los endpoints de acceso.
 *
 * Las pantallas no saben nada de rutas ni de códigos HTTP: piden una acción y
 * reciben un resultado ya interpretado. Así el manejo de errores queda en un
 * solo sitio y las pantallas se ocupan solo de pintar.
 */

export type Rol = 'entrenado' | 'entrenador'

export interface UsuarioSesion {
  id: string
  email: string
  nombre: string
  rol: Rol
}

export type Respuesta =
  | { estado: 'codigo_enviado' }
  | { estado: 'ok'; usuario: UsuarioSesion }
  | { estado: 'datos_invalidos'; mensajes: string[] }
  | { estado: 'demasiados_intentos'; esperarSeg: number }
  | { estado: 'codigo_invalido' }
  | { estado: 'codigo_expirado' }
  | { estado: 'fallo'; mensaje: string }

async function pedir(ruta: string, datos: unknown): Promise<Respuesta> {
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
  } catch {
    // Sin conexión, o el servidor no contestó. En un gimnasio con mala señal
    // esto es lo más probable, así que el mensaje lo dice tal cual.
    return { estado: 'fallo', mensaje: 'No pudimos conectarnos. Revisá la señal y probá de nuevo.' }
  }

  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    cuerpo = null
  }

  if (cuerpo && typeof cuerpo === 'object' && 'estado' in cuerpo) return cuerpo as Respuesta
  const mensaje =
    cuerpo && typeof cuerpo === 'object' && typeof (cuerpo as { error?: unknown }).error === 'string'
      ? (cuerpo as { error: string }).error
      : 'No pudimos procesar la solicitud. Probá de nuevo en un momento.'
  return { estado: 'fallo', mensaje }
}

export function crearCuenta(datos: {
  nombre: string
  email: string
  contrasena: string
  rol: Rol
}): Promise<Respuesta> {
  return pedir('/api/auth/registro', datos)
}

export function entrar(datos: { email: string; contrasena: string }): Promise<Respuesta> {
  return pedir('/api/auth/login', datos)
}

export function verificar(datos: { email: string; codigo: string }): Promise<Respuesta> {
  return pedir('/api/auth/verificar', datos)
}

export function salir(): Promise<Respuesta> {
  return pedir('/api/auth/salir', {})
}

export async function sesionActual(): Promise<UsuarioSesion | null> {
  try {
    const respuesta = await fetch('/api/auth/sesion', { cache: 'no-store' })
    const datos = (await respuesta.json()) as { autenticado?: boolean; usuario?: UsuarioSesion }
    return datos.autenticado && datos.usuario ? datos.usuario : null
  } catch {
    return null
  }
}

/**
 * Credenciales del intento en curso, en memoria y solo mientras dure la
 * pestaña abierta sin recargar.
 *
 * La pantalla del código necesita saber a qué correo mandarlo, y poder pedir
 * uno nuevo sin hacer volver al usuario. La contraseña NO se guarda en
 * localStorage ni en sessionStorage a propósito: ahí sobreviviría a la
 * pestaña y quedaría al alcance de cualquier script. Si se pierde (por una
 * recarga), la pantalla del código lo detecta y manda a entrar otra vez.
 */
let pendiente: { email: string; contrasena: string } | null = null

export function recordarIntento(datos: { email: string; contrasena: string }): void {
  pendiente = datos
}

export function intentoPendiente(): { email: string; contrasena: string } | null {
  return pendiente
}

export function olvidarIntento(): void {
  pendiente = null
}

/** Segundos a un texto humano: "45 segundos", "3 minutos". */
export function esperaLegible(segundos: number): string {
  if (segundos < 60) return `${Math.max(1, Math.ceil(segundos))} segundos`
  const minutos = Math.ceil(segundos / 60)
  return minutos === 1 ? 'un minuto' : `${minutos} minutos`
}
