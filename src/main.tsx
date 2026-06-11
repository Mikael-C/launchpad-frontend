import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './context/AppContext.tsx'
import './index.css'
import App from './App.tsx'
import { API_BASE } from './config';

// Intercept all fetch requests to inject JWT token for backend sync
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem('token');
  if (token && typeof input === 'string' && input.includes(API_BASE)) {
    if (!init) init = {};
    if (!init.headers) init.headers = {};
    (init.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </StrictMode>,
)
