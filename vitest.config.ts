import { defineConfig } from 'vitest/config'

// Los tests cubren lógica pura (dominio y autenticación), sin React ni DOM,
// así que no hace falta plugin ni entorno de navegador.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/lib/**/*.test.ts', 'servidor/**/*.test.ts'],
  },
})
