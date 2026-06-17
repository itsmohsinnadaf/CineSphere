import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Favicon.png', 'cinesphere-icon.png'],
      manifest: {
        name: 'CineSphere',
        short_name: 'CineSphere',
        description: 'Your personal cinematic streaming library.',
        theme_color: '#02020a',
        background_color: '#02020a',
        display: 'standalone',
        icons: [
          {
            src: '/Favicon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Favicon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
})
