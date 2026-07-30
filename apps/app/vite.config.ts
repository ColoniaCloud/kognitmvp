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
      manifest: {
        name: "Kognit",
        short_name: "Kognit",
        description: "La ventaja está en tu mente. Reset mental en segundos para jugadores de poker.",
        theme_color: "#2E6F9E",
        background_color: "#F8FAFC",
        display: "standalone",
        start_url: "/app/",
        scope: "/app/",
        // Identidad de la app. Se resuelve contra el origin, así que "/" sigue dando
        // https://kognit.in/ — el mismo id que tienen las instalaciones existentes.
        // Cambiarlo (o dejar que se derive del start_url nuevo) haría que Chrome
        // tratara esto como una app distinta y dejara huérfanas esas instalaciones.
        id: "/",
        lang: "es",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
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
