/** Iconos de trazo, 24×24, pensados para verse bien a 15 y a 20 px. */

type Props = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function IconoPanel(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="3" width="7.5" height="8.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" />
      <rect x="3" y="14.5" width="7.5" height="6.5" rx="2" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="2" />
    </svg>
  )
}

export function IconoEntrenar(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3.5 9.5v5" />
      <path d="M20.5 9.5v5" />
      <rect x="6" y="6.5" width="3.5" height="11" rx="1.5" />
      <rect x="14.5" y="6.5" width="3.5" height="11" rx="1.5" />
      <path d="M9.5 12h5" />
    </svg>
  )
}

export function IconoRutina(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
      <path d="M7.5 14h3M13.5 14h3M7.5 17.5h3" />
    </svg>
  )
}

export function IconoProgreso(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3 20.5h18" />
      <path d="M3.5 15.5l5-5 3.5 3.5 7-7.5" />
      <path d="M14.5 6.5h4.5V11" />
    </svg>
  )
}

export function IconoAntropometria(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="2.5" y="8" width="19" height="8" rx="2.5" />
      <path d="M7 8v3M12 8v4M17 8v3" />
    </svg>
  )
}

export function IconoObjetivo(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconoEjercicios(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4.5 4.5v15M4.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-13" />
      <path d="M9 9.5h7M9 13.5h4.5" />
    </svg>
  )
}

export function IconoAjustes(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="8" cy="17" r="2.5" />
    </svg>
  )
}

/** Mancuerna del logotipo, maciza para que aguante el tamaño pequeño. */
export function GlifoMarca() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="1" y="9.5" width="2.5" height="5" rx="1.25" />
      <rect x="20.5" y="9.5" width="2.5" height="5" rx="1.25" />
      <rect x="4.5" y="6.5" width="4" height="11" rx="1.75" />
      <rect x="15.5" y="6.5" width="4" height="11" rx="1.75" />
      <rect x="8" y="10.25" width="8" height="3.5" rx="1.25" />
    </svg>
  )
}
