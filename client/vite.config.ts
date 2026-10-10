/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // A time zone behind UTC, where formatting a NADAC date in local time shows the day before.
    env: { TZ: "America/Chicago" },
  },
})
