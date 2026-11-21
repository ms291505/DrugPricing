/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `npm run dev:phone`: HTTPS (a phone isn't a secure context over plain HTTP, so
  // `crypto.randomUUID()` throws) with the API proxied through the page's own origin. See
  // docs/phone-testing.md.
  ...(mode === 'phone' && {
    server: {
      https: phoneCertificate(),
      proxy: { '/api': 'http://localhost:5250' },
      allowedHosts: ['.local'],
    },
  }),
  test: {
    // A time zone behind UTC, where formatting a NADAC date in local time shows the day before.
    env: { TZ: "America/Chicago" },
  },
}))

function phoneCertificate() {
  try {
    return { key: readFileSync('.cert/key.pem'), cert: readFileSync('.cert/cert.pem') }
  } catch {
    throw new Error('npm run dev:phone needs an mkcert certificate in client/.cert/ (key.pem, cert.pem). See docs/phone-testing.md.')
  }
}
