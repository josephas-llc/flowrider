import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

console.log('[main.tsx] Starting...');

const root = document.getElementById('root');
if (root) {
  console.log('[main.tsx] Found root, rendering App');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('[main.tsx] No root element!');
}
