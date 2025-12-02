import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Basic styles
const style = document.createElement('style');
style.textContent = `
  @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
  body { margin: 0; font-family: sans-serif; background-color: #111827; }
  .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
