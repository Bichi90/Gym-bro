import { dependencias } from '../../../../../servidor/contexto'
import { registrar } from '../../../../../servidor/auth/servicio'
import { cuerpo, ipDe, json, protegido, texto } from '../../../../../servidor/http'

// Node y no Edge: scrypt necesita node:crypto.
export const runtime = 'nodejs'

export async function POST(peticion: Request) {
  return protegido(async () => {
    const datos = await cuerpo(peticion)
    const resultado = await registrar(dependencias(), {
      email: texto(datos.email),
      contrasena: texto(datos.contrasena),
      nombre: texto(datos.nombre),
      rol: texto(datos.rol) || 'entrenado',
      ...(ipDe(peticion) ? { ip: ipDe(peticion)! } : {}),
    })

    if (resultado.estado === 'datos_invalidos') return json(resultado, 400)
    if (resultado.estado === 'demasiados_intentos') return json(resultado, 429)
    return json(resultado)
  })
}
