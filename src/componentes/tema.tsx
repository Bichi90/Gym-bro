'use client'

import { useTema } from '../estado/tema'
import { ETIQUETA_TEMA, type PreferenciaTema } from '../lib/tema'
import { IconoAuto, IconoDia, IconoNoche } from './iconos'
import { Tarjeta } from './ui'

const OPCIONES: { id: PreferenciaTema; Icono: typeof IconoDia }[] = [
  { id: 'auto', Icono: IconoAuto },
  { id: 'dia', Icono: IconoDia },
  { id: 'noche', Icono: IconoNoche },
]

/** Selector completo, con la opción de seguir al sistema. Vive en Ajustes. */
export function SelectorTema() {
  const { preferencia, tema, cambiar } = useTema()

  return (
    <Tarjeta titulo="Tema" subtitulo="Cómo se ve la app">
      <div className="opciones">
        {OPCIONES.map(({ id, Icono }) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={preferencia === id}
            onClick={() => cambiar(id)}
          >
            <Icono />
            {ETIQUETA_TEMA[id]}
          </button>
        ))}
      </div>
      <span className="ayuda">
        {preferencia === 'auto'
          ? `Sigue al sistema: ahora está en ${ETIQUETA_TEMA[tema].toLowerCase()}.`
          : 'Día es arena sobre papel; noche es grafito cálido. La elección queda en este dispositivo.'}
      </span>
    </Tarjeta>
  )
}

/**
 * Atajo de la barra superior: pasa de un tema al otro de un toque. Fija una
 * preferencia explícita a propósito — quien lo usa está diciendo cuál quiere
 * ahora, no que vuelva a decidir el sistema. Para volver a automático está
 * el selector de Ajustes.
 */
export function BotonTema() {
  const { tema, cambiar } = useTema()
  const siguiente = tema === 'noche' ? 'dia' : 'noche'
  const Icono = siguiente === 'dia' ? IconoDia : IconoNoche

  return (
    <button
      type="button"
      className="boton-tema"
      onClick={() => cambiar(siguiente)}
      title={`Cambiar a modo ${ETIQUETA_TEMA[siguiente].toLowerCase()}`}
      aria-label={`Cambiar a modo ${ETIQUETA_TEMA[siguiente].toLowerCase()}`}
    >
      <Icono />
    </button>
  )
}
