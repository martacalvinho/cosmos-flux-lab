import 'declarative-shadow-dom-polyfill'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Polyfill Node Buffer for browser (needed by some wallet/adapters in prod builds)
import { Buffer } from 'buffer'
;
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer

createRoot(document.getElementById("root")!).render(<App />);
