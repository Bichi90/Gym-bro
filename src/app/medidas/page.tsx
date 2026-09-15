import type { Metadata } from 'next'
import { PaginaAntropometria } from '../../paginas/Antropometria'

export const metadata: Metadata = { title: 'Medidas' }

export default function Page() {
  return <PaginaAntropometria />
}
