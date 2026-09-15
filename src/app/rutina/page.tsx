import type { Metadata } from 'next'
import { PaginaRutina } from '../../paginas/Rutina'

export const metadata: Metadata = { title: 'Rutina' }

export default function Page() {
  return <PaginaRutina />
}
