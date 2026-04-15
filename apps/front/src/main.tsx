import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import './app/styles/globals.css'
import '@/shared/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
)
