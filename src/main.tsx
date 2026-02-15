import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { getEnvConfig, validateEnvConfig } from './utils/envConfig.ts'
import './styles/index.css'

// Validate environment configuration on startup
const envConfig = getEnvConfig();
const configErrors = validateEnvConfig(envConfig);
if (configErrors.length > 0) {
  configErrors.forEach(err => {
    const msg = `[config] ${err.field}: ${err.message}`;
    if (err.severity === 'error') {
      console.error(msg);
    } else {
      console.warn(msg);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)