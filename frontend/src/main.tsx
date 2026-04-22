import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ClerkProvider } from '@clerk/react'
import { ThemeProvider } from './components/ThemeProvider'
import { ToastProvider } from './components/ToastContext'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <ThemeProvider defaultTheme="dark" storageKey="spendsy-theme">
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </ClerkProvider>
  </React.StrictMode>,
)
