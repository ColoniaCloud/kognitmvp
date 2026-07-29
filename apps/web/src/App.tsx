import { Suspense, lazy, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@kognit/ui/components/sonner";
import { Toaster } from "@kognit/ui/components/toaster";
import { TooltipProvider } from "@kognit/ui/components/tooltip";
import { applyStoredDarkMode } from "@kognit/ui/lib/preferences";
import { useStandaloneMode } from "@kognit/ui/hooks/use-standalone-mode";
import Index from "./pages/Index.tsx";
import { ProTrialModal } from "./components/ProTrialModal";

/**
 * Solo `Index` se importa de forma estática: es la ruta de entrada del sitio y
 * cargarla por `lazy()` agregaría un round-trip antes del primer pintado.
 */
const Features = lazy(() => import("./pages/Features.tsx"));
const UseCases = lazy(() => import("./pages/UseCases.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

/** Fallback de ruta: sin dependencias, para no arrastrar nada al chunk inicial. */
const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-hero" aria-busy="true" />
);

/**
 * Redirige a la app, que es otra SPA servida bajo /app: tiene que ser una navegación
 * del browser, no del router.
 *
 * Preserva `search` y sobre todo `hash`: el link de reset de contraseña que manda
 * Supabase trae los tokens en el fragmento (`#access_token=...`), y ese pedazo nunca
 * llega al servidor, así que un redirect 301 del lado del server lo perdería.
 */
const RedirectToApp = ({ path }: { path: string }) => {
  useEffect(() => {
    window.location.replace(`/app${path}${window.location.search}${window.location.hash}`);
  }, [path]);
  return <RouteFallback />;
};

/**
 * Abierto desde la PWA instalada no tiene sentido mostrar la web, así que se va
 * derecho a /app. Cubre las instalaciones viejas, cuyo `start_url` sigue siendo "/"
 * hasta que el browser refresca el manifest, y iOS, que arranca en la URL que estaba
 * abierta al hacer "Agregar a pantalla de inicio".
 */
const LandingOrApp = () => {
  const standalone = useStandaloneMode();
  useEffect(() => {
    if (standalone) window.location.replace("/app");
  }, [standalone]);
  return standalone ? <RouteFallback /> : <Index />;
};

const App = () => {
  useEffect(() => { applyStoredDarkMode(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingOrApp />} />
              <Route path="/funciones" element={<Features />} />
              <Route path="/casos-de-uso" element={<UseCases />} />
              <Route path="/precio" element={<Pricing />} />
              <Route path="/contacto" element={<Contact />} />

              {/* Rutas que se mudaron a la app. Se mantienen como redirect porque ya
                  circulan en mails de Supabase, bookmarks y el callback de Google. */}
              <Route path="/auth" element={<RedirectToApp path="/auth" />} />
              <Route path="/reset-password" element={<RedirectToApp path="/reset-password" />} />
              <Route path="/tilt" element={<RedirectToApp path="/tilt" />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <ProTrialModal />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
