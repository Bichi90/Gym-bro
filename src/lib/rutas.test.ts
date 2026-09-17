import { describe, expect, it } from 'vitest'
import { destinoSeguro, esRutaPublica, hrefDe } from './rutas'

describe('rutas públicas', () => {
  it('reconoce las pantallas de acceso', () => {
    expect(esRutaPublica('/entrar')).toBe(true)
    expect(esRutaPublica('/crear-cuenta')).toBe(true)
    expect(esRutaPublica('/codigo')).toBe(true)
  })

  it('no confunde una ruta que empieza igual', () => {
    // `/codigos` no es `/codigo`: sin el separador, un prefijo no alcanza.
    expect(esRutaPublica('/codigos')).toBe(false)
    expect(esRutaPublica('/entrar-al-panel')).toBe(false)
  })

  it('deja fuera las secciones de la app', () => {
    expect(esRutaPublica('/panel')).toBe(false)
    expect(esRutaPublica(hrefDe('progreso'))).toBe(false)
  })
})

describe('destino tras entrar', () => {
  it('vuelve a donde iba el usuario', () => {
    expect(destinoSeguro('/progreso')).toBe('/progreso')
    expect(destinoSeguro('/rutina?dia=2')).toBe('/rutina?dia=2')
  })

  it('cae al panel cuando no hay destino', () => {
    expect(destinoSeguro(null)).toBe('/panel')
    expect(destinoSeguro('')).toBe('/panel')
    expect(destinoSeguro(undefined)).toBe('/panel')
  })

  it('rechaza cualquier destino fuera del sitio', () => {
    // Las tres formas con las que un enlace preparado intentaría sacar al
    // usuario del dominio usando `?volver=`.
    expect(destinoSeguro('https://otro.com')).toBe('/panel')
    expect(destinoSeguro('//otro.com')).toBe('/panel')
    expect(destinoSeguro('/\\otro.com')).toBe('/panel')
  })

  it('no devuelve a las pantallas de acceso', () => {
    // Si no, tras entrar se volvería al formulario, que redirige al panel:
    // un rebote de más para nada.
    expect(destinoSeguro('/entrar')).toBe('/panel')
    expect(destinoSeguro('/codigo')).toBe('/panel')
  })
})
