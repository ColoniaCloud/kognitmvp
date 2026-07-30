import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Un solo runner para todo el monorepo: los tests son de lógica pura y no dependen
// de qué app los use, así que no hace falta una config por workspace.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["{apps,packages,test}/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Cobertura enfocada en la lógica pura crítica cubierta por tests, no en toda la UI/side-effects.
      include: [
        "apps/app/src/lib/tiltEngine.ts",
        "apps/app/src/lib/focusWeek.ts",
        "apps/app/src/data/moods.ts",
      ],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
  resolve: {
    alias: {
      "@kognit/ui": path.resolve(__dirname, "packages/ui/src"),
      "@kognit/i18n": path.resolve(__dirname, "packages/i18n/src"),
      "@kognit/supabase": path.resolve(__dirname, "packages/supabase/src"),
    },
  },
});
