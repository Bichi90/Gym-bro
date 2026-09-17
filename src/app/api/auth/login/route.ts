import { dependencias } from '../../../../../servidor/contexto'
import { iniciarSesion } from '../../../../../servidor/auth/servicio'
import { cuerpo, ipDe, json, protegido, texto } from '../../../../../servidor/http'

export const runtime = 'nodejs'

export async function POST(peticion: Request) {
  return protegido(async () => {
    const datos = await cuerpo(peticion)
    const resultado = await iniciarSesion(dependencias(), {
      email: texto(datos.email),
      contrasena: texto(datos.contrasena),
      ...(ipDe(peticion) ? { ip: ipDe(peticion)! } : {}),
    })

    if (resultado.estado === 'datos_invalidos') return json(resultado, 400)
    if (resultado.estado === 'demasiados_intentos') return json(resultado, 429)
    // Siempre la misma respuesta: no se revela si el correo existe.
    return json(resultado)
  })
}
