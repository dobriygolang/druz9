import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Panel, RpgButton } from '@/shared/ui/pixel'

// Catches render-time errors so a thrown exception in one branch doesn't
// blank out the whole app. Network/axios errors are handled by the
// interceptor in shared/api/base.ts — this only covers React tree crashes.

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for dev; wire to Sentry here when enabled.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#0d0b1a]">
        <Panel variant="dark" className="max-w-lg w-full p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="pixel-font text-2xl text-[#ffd166]">Что-то сломалось</h1>
          <p className="text-sm text-[#c8b8ff]">
            Произошла ошибка в интерфейсе. Попробуй повторить действие или перезагрузи страницу.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-left text-red-300 bg-black/40 p-3 rounded overflow-auto max-h-48">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <RpgButton variant="ghost" onClick={this.handleRetry}>Повторить</RpgButton>
            <RpgButton variant="primary" onClick={this.handleReload}>Перезагрузить</RpgButton>
          </div>
        </Panel>
      </div>
    )
  }
}
