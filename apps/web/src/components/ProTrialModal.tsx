import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@kognit/ui/components/dialog";
import {
  hasJoinedProTrial,
  hasSeenProTrialThisSession,
  markProTrialJoined,
  markProTrialSeenThisSession,
} from "@kognit/ui/lib/preferences";

const DELAY_MS = 10_000;

// Cubrir el formulario de login/registro con una promo es justo el peor momento para
// interrumpir. Login y registro ahora viven en la app (/app/auth), así que estos paths
// solo se ven de paso al redirigir desde los links viejos: igual se excluyen para que
// el modal no aparezca arriba del redirect.
const EXCLUDED_PATHS = ["/auth", "/reset-password"];

/**
 * Invitación al programa de testers (Kognit Pro gratis por 6 meses). Se monta una sola
 * vez a nivel de App y aparece a los 10 segundos de abrir el sitio, en cualquier página.
 *
 * Frecuencia: una vez por sesión del navegador, y nunca más una vez que el usuario
 * acepta sumarse (ver `preferences.ts`).
 */
export const ProTrialModal = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasJoinedProTrial() || hasSeenProTrialThisSession()) return;
    const timer = setTimeout(() => {
      // El path se lee acá y no en las dependencias del efecto para que el temporizador
      // corra una sola vez desde que se abrió el sitio, sin reiniciarse al navegar.
      if (EXCLUDED_PATHS.includes(window.location.pathname)) return;
      markProTrialSeenThisSession();
      setOpen(true);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const join = async () => {
    markProTrialJoined();
    setOpen(false);
    // La app es otra SPA (se sirve bajo /app), así que la navegación tiene que ser
    // del browser y no del router. La sesión se lee acá en vez de con `useAuth`
    // porque el sitio no monta el AuthProvider: solo necesita saber si mandar al
    // registro o directo adentro.
    //
    // El import es dinámico porque este modal se monta en toda visita al sitio, y
    // estático metería el cliente de Supabase entero en el chunk inicial del landing
    // para una consulta que solo pasa si el usuario hace click en el botón.
    const { supabase } = await import("@kognit/supabase");
    const { data } = await supabase.auth.getSession();
    window.location.href = data.session ? "/app" : "/app/auth?mode=signup";
  };

  if (EXCLUDED_PATHS.includes(pathname)) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-3xl border-border/50 p-0 overflow-hidden">
        <div className="bg-gradient-primary text-primary-foreground px-7 pt-7 pb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
            <Sparkles size={12} />
            {t("proTrialModal.eyebrow")}
          </span>
          <DialogTitle className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight">
            {t("proTrialModal.title")}
          </DialogTitle>
        </div>

        <div className="px-7 pb-7 pt-5">
          <DialogDescription className="text-sm leading-relaxed text-foreground">
            {t("proTrialModal.description")}
          </DialogDescription>

          <div className="mt-5 rounded-2xl bg-secondary p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("proTrialModal.conditionsTitle")}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {t("proTrialModal.conditions")}
            </p>
          </div>

          <button
            onClick={join}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow">
            {t("proTrialModal.cta")}
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 w-full rounded-2xl py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
            {t("proTrialModal.dismiss")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
