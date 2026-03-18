import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Global error handler for development
window.addEventListener('error', (event) => {
  console.error('[Even Messages] Error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Even Messages] Unhandled rejection:', event.reason)
})

const root = document.getElementById('root')

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
