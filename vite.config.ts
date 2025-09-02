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
      "/osmo-sqs": {
        target: "https://sqsprod.osmosis.zone",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/osmo-sqs\/?/, "/"),
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
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      external: ['declarative-shadow-dom-polyfill'],
      plugins: [
        {
          name: 'buffer-polyfill',
          resolveId(id) {
            if (id === 'buffer') {
              return 'browser-buffer';
            }
          },
          load(id) {
            if (id === 'browser-buffer') {
              return `import { Buffer } from 'buffer'; export default Buffer;`;
            }
          }
        }
      ],
      output: {
        manualChunks: {
          buffer: ['buffer'],
        }
      }
    }
  }
}));
