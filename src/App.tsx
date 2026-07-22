import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Features from "./pages/Features.tsx";
import UseCases from "./pages/UseCases.tsx";
import Pricing from "./pages/Pricing.tsx";
import Contact from "./pages/Contact.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import MobileApp from "./pages/MobileApp.tsx";
import TiltStandalone from "./pages/TiltStandalone.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { applyStoredDarkMode } from "./lib/preferences";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => { applyStoredDarkMode(); }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/funciones" element={<Features />} />
            <Route path="/casos-de-uso" element={<UseCases />} />
            <Route path="/precio" element={<Pricing />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/app" element={<MobileApp />} />
            <Route path="/tilt" element={<TiltStandalone />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
