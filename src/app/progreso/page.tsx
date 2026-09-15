import type { Metadata } from 'next'
import { PaginaProgreso } from '../../paginas/Progreso'

export const metadata: Metadata = { title: 'Progreso' }

export default function Page() {
  return <PaginaProgreso />
}
