import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function manualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  if (
    id.includes('maplibre-gl') ||
    id.includes('react-map-gl') ||
    id.includes('@vis.gl/react-maplibre') ||
    id.includes('@deck.gl/')
  ) {
    return 'map-stack'
  }

  if (
    id.includes('@monaco-editor/') ||
    id.includes('monaco-editor') ||
    id.includes('yjs') ||
    id.includes('y-monaco') ||
    id.includes('y-protocols') ||
    id.includes('lib0')
  ) {
    return 'editor-stack'
  }

  if (id.includes('lucide-react')) {
    return 'icons'
  }

  if (id.includes('axios')) {
    return 'network-vendor'
  }

  if (
    id.includes('livekit-client') ||
    id.includes('@livekit/')
  ) {
    return 'rtc-stack'
  }

  if (
    id.includes('react-dom') ||
    id.includes('react-router-dom') ||
    id.includes('scheduler')
  ) {
    return 'react-runtime'
  }

  if (
    id.includes('react-image-crop')
  ) {
    return 'app-vendor'
  }

  return 'vendor'
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
        secure: false,
        ws: true
      }
    }
  }
})
