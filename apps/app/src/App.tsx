import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@kognit/ui/components/sonner";
import { Toaster } from "@kognit/ui/components/toaster";
import { TooltipProvider } from "@kognit/ui/components/tooltip";
import { applyStoredDarkMode } from "@kognit/ui/lib/preferences";
import MobileApp from "./pages/MobileApp.tsx";
import { AuthProvider } from "./contexts/AuthContext";

/**
 * `MobileApp` es la ruta de entrada de la app instalada (`start_url: "/app/"`), así
 * que va estática; el resto se parte en chunks.
 */
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const TiltStandalone = lazy(() => import("./pages/TiltStandalone.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const CaptureScreen = lazy(() => import("./pages/CaptureScreen.tsx"));

const queryClient = new QueryClient();

/** Fallback de ruta: sin dependencias, para no arrastrar nada al chunk inicial. */
const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-hero" aria-busy="true" />
);

/**
 * Todas las rutas cuelgan de /app, que es donde el servidor sirve esta SPA. El
 * `basename` hace que dentro del código las rutas se sigan escribiendo relativas
 * ("/auth" → /app/auth), así que los `navigate()` y `<Link>` de las pantallas no
 * necesitan saber nada del prefijo.
 */
const App = () => {
  useEffect(() => { applyStoredDarkMode(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/app">
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<MobileApp />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/tilt" element={<TiltStandalone />} />
                {/* Solo en dev: renderiza una pantalla de /app suelta para que
                    scripts/capture-screens.mjs la fotografíe (ver docs/capturas.md). */}
                {import.meta.env.DEV && <Route path="/__capture/:screen" element={<CaptureScreen />} />}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
