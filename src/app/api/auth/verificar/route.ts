import { dependencias } from '../../../../../servidor/contexto'
import { verificarSegundoFactor } from '../../../../../servidor/auth/servicio'
import { agenteDe, conSesion, cuerpo, ipDe, json, protegido, texto } from '../../../../../servidor/http'

export const runtime = 'nodejs'

export async function POST(peticion: Request) {
  return protegido(async () => {
    const datos = await cuerpo(peticion)
    const resultado = await verificarSegundoFactor(dependencias(), {
      email: texto(datos.email),
      codigo: texto(datos.codigo),
      ...(agenteDe(peticion) ? { agente: agenteDe(peticion)! } : {}),
      ...(ipDe(peticion) ? { ip: ipDe(peticion)! } : {}),
    })

    if (resultado.estado === 'demasiados_intentos') return json(resultado, 429)
    if (resultado.estado !== 'ok') return json(resultado, 401)

    const maxEdadSeg = Math.floor((resultado.expiraEn.getTime() - Date.now()) / 1000)
    // El token viaja solo en la cookie httpOnly: nunca en el cuerpo, para que
    // no quede al alcance de un script en la página.
    return conSesion({ estado: 'ok', usuario: resultado.usuario }, resultado.token, maxEdadSeg)
  })
}
