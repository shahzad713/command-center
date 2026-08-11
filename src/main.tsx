import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Clean slate: drop any cached client data on boot so nothing survives across reloads.
// (Firebase Auth tokens live in IndexedDB, not here, so this does not sign the user out.)
try {
  localStorage.clear()
  sessionStorage.clear()
} catch {
  // Storage may be unavailable (private mode / SSR) — ignore.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
