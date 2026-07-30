import type { Config } from "tailwindcss";
import preset from "../../packages/ui/src/tailwind.preset";

// Import relativo a propósito: este archivo lo carga Tailwind con su propio loader,
// fuera de Vite, así que los alias @kognit/* del vite.config no aplican acá.
export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
} satisfies Config;
