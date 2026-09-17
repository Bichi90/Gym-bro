import { NextResponse, type NextRequest } from 'next/server'
import { NOMBRE_COOKIE } from '../servidor/auth/cookie'
import { esRutaPublica } from './lib/rutas'

/**
 * Redirección temprana según haya o no cookie de sesión.
 *
 * Importante: esto **no es** el control de acceso. El middleware corre en el
 * runtime Edge, donde no hay `node:crypto` ni conexión a Postgres, así que solo
 * puede mirar si la cookie existe — no si el token es válido, ni si la sesión
 * fue revocada. Alguien puede fabricarse una cookie y pasar por aquí.
 *
 * La comprobación de verdad la hacen los endpoints y las páginas, que resuelven
 * el token contra la base. Esto es solo para evitarle al usuario ver una
 * pantalla vacía antes de que la redirijan.
 */

/**
 * Mientras no haya base de datos configurada, no se puede entrar: registrarse
 * devolvería un error del servidor. En ese caso se deja pasar todo y la app
 * sigue funcionando contra el almacenamiento del navegador, como hasta ahora.
 * Aflojar aquí no abre ningún agujero: esto es una redirección de comodidad, y
 * quien decide de verdad son los endpoints, que sin base no dejan entrar a
 * nadie.
 */
function accesoConfigurado(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export function middleware(peticion: NextRequest) {
  if (!accesoConfigurado()) return NextResponse.next()

  const { pathname } = peticion.nextUrl
  const tieneCookie = peticion.cookies.has(NOMBRE_COOKIE)
  const esPublica = esRutaPublica(pathname)

  if (!tieneCookie && !esPublica) {
    const destino = peticion.nextUrl.clone()
    destino.pathname = '/entrar'
    // Se recuerda a dónde iba para volver ahí tras entrar.
    destino.searchParams.set('volver', pathname)
    return NextResponse.redirect(destino)
  }

  if (tieneCookie && esPublica) {
    const destino = peticion.nextUrl.clone()
    destino.pathname = '/panel'
    destino.search = ''
    return NextResponse.redirect(destino)
  }

  return NextResponse.next()
}

export const config = {
  // Se excluyen la API, los archivos de Next y los estáticos: la API tiene su
  // propia comprobación y los estáticos no deben pagar este coste.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)'],
}
