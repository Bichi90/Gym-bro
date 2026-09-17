import { dependencias } from '../../../../../servidor/contexto'
import { cerrarSesion } from '../../../../../servidor/auth/servicio'
import { protegido, sinSesion, tokenDe } from '../../../../../servidor/http'

export const runtime = 'nodejs'

export async function POST(peticion: Request) {
  return protegido(async () => {
    await cerrarSesion(dependencias(), tokenDe(peticion))
    // Se borra la cookie aunque el token ya no valiera: el usuario pidió salir.
    return sinSesion({ estado: 'ok' })
  })
}
