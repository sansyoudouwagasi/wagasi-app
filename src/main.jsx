import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { injectSpeedInsights } from '@vercel/speed-insights'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff4444', wordBreak: 'break-all', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>アプリでエラーが発生しました</h2>
          <pre style={{ fontSize: '12px', marginTop: '10px', background: '#ffebeb', padding: '10px', borderRadius: '8px' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ fontSize: '10px', marginTop: '10px', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

injectSpeedInsights();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
