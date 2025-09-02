import { Buffer } from 'buffer';
import 'declarative-shadow-dom-polyfill';

// Polyfill for Buffer in browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(<App />);
