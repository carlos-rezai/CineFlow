import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/server/**'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
