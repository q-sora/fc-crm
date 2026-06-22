import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h2 style={{ color: '#dc2626' }}>Ошибка рендеринга</h2>
          <pre style={{ background: '#fee2e2', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 12 }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}
            onClick={() => this.setState({ error: null })}
          >
            Попробовать снова
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
