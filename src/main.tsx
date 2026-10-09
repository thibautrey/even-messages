import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/variables.css'

// Global error handler for development
window.addEventListener('error', (event) => {
  console.error('[Message Lens] Error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Message Lens] Unhandled rejection:', event.reason)
})

const root = document.getElementById('root')

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
}
