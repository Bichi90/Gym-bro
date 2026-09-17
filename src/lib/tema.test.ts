import { describe, expect, it } from 'vitest'
import { CLAVE_TEMA, GUION_TEMA_INICIAL, esPreferencia, esTema, resolverTema } from './tema'

describe('preferencia de tema', () => {
  it('acepta las tres opciones y nada más', () => {
    expect(esPreferencia('auto')).toBe(true)
    expect(esPreferencia('dia')).toBe(true)
    expect(esPreferencia('noche')).toBe(true)
    expect(esPreferencia('oscuro')).toBe(false)
    expect(esPreferencia(null)).toBe(false)
    expect(esPreferencia(undefined)).toBe(false)
  })

  it('distingue una preferencia de un tema concreto', () => {
    expect(esTema('auto')).toBe(false)
    expect(esTema('dia')).toBe(true)
  })
})

describe('resolución del tema', () => {
  it('una elección explícita manda sobre el sistema', () => {
    expect(resolverTema('dia', false)).toBe('dia')
    expect(resolverTema('noche', true)).toBe('noche')
  })

  it('en automático sigue al sistema', () => {
    expect(resolverTema('auto', true)).toBe('dia')
    expect(resolverTema('auto', false)).toBe('noche')
  })
})

describe('guión inicial', () => {
  it('usa la misma clave que el resto de la app', () => {
    // Si se cambiara la constante y no el guión, el tema elegido dejaría de
    // recuperarse al recargar y nadie se enteraría hasta verlo parpadear.
    expect(GUION_TEMA_INICIAL).toContain(CLAVE_TEMA)
  })

  it('no rompe la etiqueta script al insertarse en el HTML', () => {
    expect(GUION_TEMA_INICIAL).not.toContain('</script')
  })
})
