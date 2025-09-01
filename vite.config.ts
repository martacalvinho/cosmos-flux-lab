import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import inject from "@rollup/plugin-inject";

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
    // Inject Buffer polyfill so libraries expecting Node's Buffer work in the browser
    inject({
      Buffer: ["buffer", "Buffer"],
    }),
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
  },
  define: {
    global: "globalThis",
  },
}));
