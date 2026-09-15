import Link from 'next/link'

export default function NoEncontrado() {
  return (
    <div className="vacio" style={{ marginTop: 48 }}>
      <p>Esta página no existe.</p>
      <p style={{ marginTop: 12 }}>
        <Link href="/panel">Volver al panel</Link>
      </p>
    </div>
  )
}
