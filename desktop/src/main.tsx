import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

console.log("Mounting React App...");

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error("Root element not found");
  
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
  console.log("React App mounted successfully");
} catch (e) {
  console.error("Failed to mount app:", e);
  document.body.innerHTML = `<div style="color:red; padding:20px;">Failed to mount app: ${e}</div>`;
}
