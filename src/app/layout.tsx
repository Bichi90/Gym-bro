import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ProveedorAlmacen } from '../estado/almacen'
import { ProveedorTema } from '../estado/tema'
import { COLOR_BARRA, GUION_TEMA_INICIAL } from '../lib/tema'
import { Shell } from './shell'
import './estilos.css'

// next/font descarga y sirve las fuentes desde el propio dominio: sin petición
// a Google en tiempo de ejecución, sin parpadeo y sin depender de terceros.
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--fuente-display-next',
  display: 'swap',
})

const texto = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--fuente-texto-next',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Gym Bro', template: '%s · Gym Bro' },
  description:
    'Seguimiento de rutinas, cargas, repeticiones, antropometría y progreso hacia tu objetivo.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Gym Bro' },
}

export const viewport: Viewport = {
  // Dos valores para que la barra del navegador acompañe al tema desde la
  // primera carga. Si la persona eligió uno a mano, el proveedor lo corrige.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: COLOR_BARRA.dia },
    { media: '(prefers-color-scheme: dark)', color: COLOR_BARRA.noche },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: el guión de abajo escribe `data-tema` en el
    // <html> antes de que React hidrate, así que el atributo no coincide con
    // lo que se renderizó en el servidor. Es a propósito.
    <html lang="es" className={`${display.variable} ${texto.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: GUION_TEMA_INICIAL }} />
      </head>
      <body>
        <ProveedorTema>
          <ProveedorAlmacen>
            <Shell>{children}</Shell>
          </ProveedorAlmacen>
        </ProveedorTema>
      </body>
    </html>
  )
}
