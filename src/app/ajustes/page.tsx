import type { Metadata } from 'next'
import { PaginaAjustes } from '../../paginas/Ajustes'

export const metadata: Metadata = { title: 'Ajustes' }

export default function Page() {
  return <PaginaAjustes />
}
