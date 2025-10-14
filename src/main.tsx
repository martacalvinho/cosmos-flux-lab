import { Buffer } from 'buffer';
import 'declarative-shadow-dom-polyfill';

// Ensure Buffer is globally available for dependencies that expect Node.js Buffer
if (!globalThis.Buffer) (globalThis as any).Buffer = Buffer;
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Suppress 404 errors from Skip widget trying to load wallet icons
const originalError = console.error;
console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  // Filter out Skip widget wallet icon 404s
  if (errorString.includes('wallet-icon-') && errorString.includes('404')) {
    return;
  }
  if (errorString.includes('Image cropping failed') && errorString.includes('Failed to load image')) {
    return;
  }
  originalError.apply(console, args);
};

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById("root")!).render(<App />);
