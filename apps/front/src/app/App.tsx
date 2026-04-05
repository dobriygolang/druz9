import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { RuntimeConfigProvider } from './providers/RuntimeConfigProvider'
import { RouterProvider } from './providers/RouterProvider'

export function App() {
  return (
    <BrowserRouter>
      <RuntimeConfigProvider>
        <AuthProvider>
          <RouterProvider />
        </AuthProvider>
      </RuntimeConfigProvider>
    </BrowserRouter>
  )
}
