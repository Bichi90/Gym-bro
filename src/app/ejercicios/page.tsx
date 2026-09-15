import type { Metadata } from 'next'
import { PaginaEjercicios } from '../../paginas/Ejercicios'

export const metadata: Metadata = { title: 'Ejercicios' }

export default function Page() {
  return <PaginaEjercicios />
}
