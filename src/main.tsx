import { Buffer } from 'buffer';
import 'declarative-shadow-dom-polyfill';

// Ensure Buffer is globally available for dependencies that expect Node.js Buffer
if (!globalThis.Buffer) (globalThis as any).Buffer = Buffer;
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Analytics />
  </>
);
