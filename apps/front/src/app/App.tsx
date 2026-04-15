import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './providers/AuthProvider'
import { RuntimeConfigProvider } from './providers/RuntimeConfigProvider'
import { RouterProvider } from './providers/RouterProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { ToastProvider } from '@/shared/ui/Toast'
import { AudioPlayerProvider } from '@/features/Podcast/providers/AudioPlayerProvider'

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <RuntimeConfigProvider>
            <AuthProvider>
              <ToastProvider>
                <AudioPlayerProvider>
                  <RouterProvider />
                </AudioPlayerProvider>
              </ToastProvider>
            </AuthProvider>
          </RuntimeConfigProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
