import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './providers/AuthProvider'
import { RuntimeConfigProvider } from './providers/RuntimeConfigProvider'
import { RouterProvider } from './providers/RouterProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { ErrorBoundary } from './providers/ErrorBoundary'
import { ToastProvider } from '@/shared/ui/Toast'
import { PixelToastProvider } from '@/shared/ui/pixel'
import { AudioPlayerProvider } from '@/features/Podcast/providers/AudioPlayerProvider'
import { registerErrorToast } from '@/shared/api/base'
import { addToast } from '@/shared/lib/toasts'

// Wire the axios error interceptor's toast dispatcher at module load,
// before any component mounts. base.ts stays React-free and only calls
// the injected dispatch on 4xx/5xx / network errors (unless config.silent).
registerErrorToast(({ title, body, kind }) => addToast({ title, body, kind }))

export function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider>
            <RuntimeConfigProvider>
              <AuthProvider>
                <ToastProvider>
                  <PixelToastProvider>
                    <AudioPlayerProvider>
                      <RouterProvider />
                    </AudioPlayerProvider>
                  </PixelToastProvider>
                </ToastProvider>
              </AuthProvider>
            </RuntimeConfigProvider>
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  )
}
