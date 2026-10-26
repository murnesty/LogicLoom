import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/LogicLoom/malaysia-stats/',
  test: { environment: 'node', passWithNoTests: true },
})
