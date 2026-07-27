import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
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
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Kognit",
        short_name: "Kognit",
        description: "La ventaja está en tu mente. Reset mental en segundos para jugadores de poker.",
        theme_color: "#2E6F9E",
        background_color: "#F8FAFC",
        display: "standalone",
        // Instalada, la PWA arranca en la app, no en la landing. El scope sigue
        // siendo "/" para que las páginas del sitio (precio, contacto) se abran
        // dentro de la ventana instalada y no en el browser.
        start_url: "/app",
        scope: "/",
        // Identidad de la app. Sin este campo el id se deriva del start_url, así
        // que cambiarlo a "/app" haría que Chrome tratara esto como una app nueva
        // y dejara huérfanas las instalaciones existentes. "/" es el id que ya
        // tienen (el start_url viejo), así que fijarlo las preserva.
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
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
