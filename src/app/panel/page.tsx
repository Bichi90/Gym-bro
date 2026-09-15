import type { Metadata } from 'next'
import { PaginaPanel } from '../../paginas/Panel'

export const metadata: Metadata = { title: 'Panel' }

export default function Page() {
  return <PaginaPanel />
}
