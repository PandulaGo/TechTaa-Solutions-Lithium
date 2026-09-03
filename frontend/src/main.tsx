import { createRoot } from 'react-dom/client'
import { Component, type ReactNode } from 'react'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './ThemeContext'
import { ToastProvider } from './ToastContext'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(err: any) {
    return { error: err?.message || String(err) };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#fff', background: '#1a1a1a', minHeight: '100vh' }}>
          <h1 style={{ color: '#f44' }}>Render Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (e) => console.error('Global error:', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </ErrorBoundary>
)
