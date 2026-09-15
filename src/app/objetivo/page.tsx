import type { Metadata } from 'next'
import { PaginaObjetivo } from '../../paginas/Objetivo'

export const metadata: Metadata = { title: 'Objetivo' }

export default function Page() {
  return <PaginaObjetivo />
}
