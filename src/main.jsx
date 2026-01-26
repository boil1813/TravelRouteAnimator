import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css'

// Global Error Handler
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (root && root.innerHTML.trim() === '') {
     const errorDiv = document.createElement('div');
     errorDiv.style.padding = '20px';
     errorDiv.style.color = 'red';
     errorDiv.innerHTML = `<h3>Application Error</h3><p>${message}</p><p>Please refresh or try a different browser.</p>`;
     document.body.appendChild(errorDiv);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
