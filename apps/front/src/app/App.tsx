import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { RuntimeConfigProvider } from './providers/RuntimeConfigProvider'
import { RouterProvider } from './providers/RouterProvider'
import { ToastProvider } from '@/shared/ui/Toast'

export function App() {
  return (
    <BrowserRouter>
      <RuntimeConfigProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider />
          </ToastProvider>
        </AuthProvider>
      </RuntimeConfigProvider>
    </BrowserRouter>
  )
}
