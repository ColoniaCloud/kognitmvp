import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const root = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => ({
  // La app se sirve bajo /app. `base` hace que los assets se pidan a /app/assets/...
  // y que el service worker quede en /app/sw.js, con scope /app/ — el sitio público
  // queda fuera de su alcance.
  base: "/app/",
  // El .env vive en la raíz del monorepo, pero el root de Vite es esta carpeta: sin
  // esto no se leen las VITE_* y el cliente de Supabase arranca sin URL. En Hostinger
  // no se notaba porque ahí las variables llegan por entorno, no por archivo.
  envDir: root,
  server: {
    host: "::",
    port: 8081,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // injectManifest (en vez de generateSW) porque necesitamos un service worker
      // propio con listeners de "push"/"notificationclick" para el recordatorio diario
      // (Sprint 3) — generateSW no permite agregar código custom al SW.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: [],
      // El manifest NO lo genera el plugin: es un archivo estático servido desde la
      // raíz (`apps/web/public/manifest.webmanifest`), linkeado desde los dos
      // index.html.
      //
      // El scope del manifest y el del service worker son cosas distintas, y acá
      // tienen que ser distintas. El SW se queda en /app/sw.js con scope /app/ —
      // eso es lo que evita que vuelva a servir HTML viejo en todo el sitio. Pero
      // el manifest necesita `scope: "/"`: una página fuera del scope del manifest
      // no es instalable, y con el manifest acotado a /app/ la landing dejaba de
      // ofrecer la instalación.
      //
      // Si lo generara el plugin saldría bajo /app/ por el `base`, que es justo
      // donde no lo queremos. `id: "/"` se mantiene en el archivo estático para no
      // dejar huérfanas las instalaciones existentes — ver APP-WEB.md.
      manifest: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
      },
    }),
  ].filter(Boolean),
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
    outDir: path.resolve(root, "dist/app"),
    // El sitio se buildea primero y vacía dist/; esta build solo limpia su subcarpeta.
    emptyOutDir: true,
  },
}));
