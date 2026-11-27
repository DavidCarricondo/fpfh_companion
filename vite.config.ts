import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: funciona en cualquier hosting estático (y con hash routing).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Five Parsecs Companion',
        short_name: 'FP Companion',
        description: 'Guía de turno, tablas y diario para Five Parsecs From Home (uso personal).',
        lang: 'es',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        // TODO(M5): iconos PNG 192/512 para Lighthouse.
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // El contenido de las tablas va empaquetado en el JS, así que con esto queda todo en el precache.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
