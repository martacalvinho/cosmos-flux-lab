import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy Astrovault API to avoid CORS during local development
      '/av': {
        target: 'https://ext.astrovault.io',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/av/, ''),
      },
      // Proxy Osmosis SQS API
      '/osmo-sqs': {
        target: 'https://sqsprod.osmosis.zone',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/osmo-sqs/, ''),
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
