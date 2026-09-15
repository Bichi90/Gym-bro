import type { Metadata } from 'next'
import { PaginaEntrenar } from '../../paginas/Entrenar'

export const metadata: Metadata = { title: 'Entrenar' }

export default function Page() {
  return <PaginaEntrenar />
}
