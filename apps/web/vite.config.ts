import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const root = path.resolve(__dirname, "../..");

// El sitio público. No lleva service worker: el único SW del origin es el de la app,
// acotado a /app/ (ver apps/app/vite.config.ts). `public/sw.js` acá es un kill-switch
// que desinstala el SW viejo que quedó registrado en scope "/".
export default defineConfig(({ mode }) => ({
  // El .env vive en la raíz del monorepo, pero el root de Vite es esta carpeta: sin
  // esto no se leen las VITE_* y el cliente de Supabase arranca sin URL (lo usan el
  // formulario de contacto y el de prelanzamiento).
  envDir: root,
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      // En desarrollo la app corre en su propio dev server; esto hace que
      // http://localhost:8080/app se comporte como en producción, donde ambas
      // builds salen del mismo origin.
      "/app": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@kognit/ui": path.resolve(root, "packages/ui/src"),
      "@kognit/i18n": path.resolve(root, "packages/i18n/src"),
      "@kognit/supabase": path.resolve(root, "packages/supabase/src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    // Las dos apps escriben en el mismo dist/ de la raíz: el sitio en la raíz y la
    // app en dist/app. Así el docroot de producción es una sola carpeta, sirva
    // Hostinger con Node o como estático.
    outDir: path.resolve(root, "dist"),
    emptyOutDir: true,
  },
}));
