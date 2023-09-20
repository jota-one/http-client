import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*', '!test/setup.js'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['test/setup.js']
  },
})
