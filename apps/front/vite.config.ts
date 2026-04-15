import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getNodeModulePackageName(id: string) {
  const [, modulePath = ''] = id.split('node_modules/')
  const parts = modulePath.split('/')

  if (!parts[0]) return null
  if (parts[0].startsWith('@')) {
    return `${parts[0]}/${parts[1]}`
  }

  return parts[0]
}

function manualChunks(id: string) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  const pkg = getNodeModulePackageName(id)

  if (id.includes('/@deck.gl/')) return 'deck-gl'

  if (pkg === 'monaco-editor') return 'monaco-core'
  if (pkg === '@monaco-editor/react' || pkg === '@monaco-editor/loader') return 'monaco-runtime'
  if (pkg === 'yjs' || pkg === 'y-monaco' || pkg === 'y-protocols' || pkg === 'lib0') return 'editor-collab'

  if (pkg === 'lucide-react') return 'icons'

  if (pkg === 'axios') return 'network-vendor'

  if (pkg === 'livekit-client' || pkg === '@livekit/client' || pkg === '@livekit/components-core' || pkg === '@livekit/components-react') {
    return 'rtc-stack'
  }

  if (
    pkg === 'react-dom' ||
    pkg === 'react-router-dom' ||
    pkg === 'scheduler'
  ) {
    return 'react-runtime'
  }

  if (pkg === 'react-image-crop') return 'app-vendor'

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
