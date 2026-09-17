import { dependencias } from '../../../../../servidor/contexto'
import { sesionDesdeToken } from '../../../../../servidor/auth/servicio'
import { json, protegido, tokenDe } from '../../../../../servidor/http'

export const runtime = 'nodejs'

export async function GET(peticion: Request) {
  return protegido(async () => {
    const sesion = await sesionDesdeToken(dependencias(), tokenDe(peticion))
    if (!sesion) return json({ autenticado: false }, 200)

    const { id, email, nombre, rol } = sesion.usuario
    return json({ autenticado: true, usuario: { id, email, nombre, rol } })
  })
}
