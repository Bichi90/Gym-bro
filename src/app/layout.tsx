import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { ProveedorAlmacen } from '../estado/almacen'
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
  themeColor: '#090B10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${texto.variable}`}>
      <body>
        <ProveedorAlmacen>
          <Shell>{children}</Shell>
        </ProveedorAlmacen>
      </body>
    </html>
  )
}
