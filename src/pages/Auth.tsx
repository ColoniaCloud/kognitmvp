import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStandaloneMode } from "@/hooks/use-standalone-mode";
import { ArrowRight, ChevronLeft, Loader2, MailCheck } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

const logo = "/logo.png";

type Mode = "login" | "signup" | "forgot";
type SignupStep = 1 | 2 | 3;
type Plan = "free" | "pro";

interface FormValues {
  name?: string;
  email: string;
  password?: string;
}

interface PlanOptionProps {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}

// Reutiliza el contenido de landing.pricing.* (mismo texto que SitePricing.tsx en la
// landing) en formato compacto seleccionable — evita duplicar precios/copy en 10 idiomas.
const PlanOption = ({ plan, selected, onSelect }: PlanOptionProps) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
      }`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{t(`landing.pricing.${plan}.name`)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {plan === "pro" ? t("landing.pricing.pro.badge") : t(`landing.pricing.${plan}.priceNote`)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold">{t(`landing.pricing.${plan}.price`)}</p>
          {plan === "pro" && <p className="text-[10px] text-muted-foreground">{t("landing.pricing.pro.priceSuffix")}</p>}
        </div>
      </div>
    </button>
  );
};

export default function Auth() {
  const [searchParams] = useSearchParams();
  // Los links de "Empezar Gratis"/"Actualizar a Pro" en la landing mandan
  // ?mode=signup para arrancar directo en el wizard de registro; cualquier
  // otro valor (o ausencia del param, ej. el redirect de /app sin sesión) cae en login.
  const [mode, setMode] = useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "login");
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isStandalone = useStandaloneMode();

  const schema = useMemo(() => z.object({
    name: z.string().trim().optional(),
    email: z.string().trim().min(1, t("auth.errors.emailRequired")).email(t("auth.errors.emailInvalid")),
    password: mode === "forgot" ? z.string().optional() : z.string().min(6, t("auth.errors.passwordMin")),
  }), [mode, t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  // Al cambiar de modo, limpiamos errores de validación del modo anterior
  // (ej. "contraseña muy corta" no debería seguir mostrado en "forgot") y
  // reiniciamos el wizard de registro para que siempre arranque en el paso 1.
  useEffect(() => {
    form.clearErrors();
    if (mode === "signup") setSignupStep(1);
  }, [mode, form]);

  // El plan elegido en el paso 1 no se puede escribir directo (protect_plan_columns
  // solo permite service role) — viaja como query param en el redirect post-auth
  // y es MobileApp.tsx quien dispara el checkout de Mercado Pago una vez logueado.
  const upgradeRedirect = (path: string) => `${window.location.origin}${path}${selectedPlan === "pro" ? "?upgrade=pro" : ""}`;

  const submit = form.handleSubmit(async ({ email, password, name }) => {
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: password! });
        if (error) throw error;
        navigate("/app");
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: password!,
          options: {
            emailRedirectTo: upgradeRedirect("/app"),
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        setSignupStep(3);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: t("auth.toasts.forgotSuccessTitle"), description: t("auth.toasts.forgotSuccessDescription") });
        setMode("login");
      }
    } catch (err: unknown) {
      console.error("[auth]", err);
      const generic =
        mode === "login"
          ? t("auth.toasts.genericLogin")
          : mode === "signup"
          ? t("auth.toasts.genericSignup")
          : t("auth.toasts.genericForgot");
      toast({ title: t("auth.toasts.errorTitle"), description: generic, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  });

  const googleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: upgradeRedirect("/app") },
    });
    if (error) {
      console.error("[auth:google]", error);
      toast({ title: t("auth.toasts.errorTitle"), description: t("auth.toasts.genericGoogle"), variant: "destructive" });
      setLoading(false);
    }
  };

  const guest = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: t("auth.guestDisplayName") } },
    });
    setLoading(false);
    if (error) {
      console.error("[auth:guest]", error);
      toast({ title: t("auth.toasts.errorTitle"), description: t("auth.toasts.guestError"), variant: "destructive" });
    } else {
      navigate("/app");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden flex flex-col">
      {!isStandalone && <SiteHeader />}
      <div className="pointer-events-none absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />

      <div className={`relative flex-1 flex items-center justify-center px-6 py-10 ${!isStandalone ? "pt-24 md:pt-32" : ""}`}>
      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          {isStandalone && (
            <button
              onClick={() => navigate("/")}
              aria-label={t("common.backAria")}
              className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center shrink-0">
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <img src={logo} alt="kognit" className="h-8 w-auto object-contain" />
            <p className="mt-1.5 text-xs text-muted-foreground font-medium tracking-wide">{t("app.tagline")}</p>
          </div>
        </div>

        <div className="bg-card rounded-3xl shadow-card border border-border/50 p-7">
          {mode === "signup" ? (
            <>
              <div className="mb-5 flex items-center gap-3">
                {signupStep === 2 && (
                  <button
                    onClick={() => setSignupStep(1)}
                    aria-label={t("common.backAria")}
                    className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <ChevronLeft size={16} />
                  </button>
                )}
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-primary">
                  {t("auth.signupSteps.stepLabel", { current: signupStep, total: 3 })}
                </p>
              </div>

              {signupStep === 1 && (
                <>
                  <h1 className="text-2xl font-bold tracking-tight mb-5">{t("auth.signupSteps.chooseAccountTitle")}</h1>
                  <div className="space-y-3">
                    <PlanOption plan="free" selected={selectedPlan === "free"}
                      onSelect={() => { setSelectedPlan("free"); setSignupStep(2); }} />
                    <PlanOption plan="pro" selected={selectedPlan === "pro"}
                      onSelect={() => { setSelectedPlan("pro"); setSignupStep(2); }} />
                  </div>
                  <button onClick={() => setMode("login")}
                    className="mt-5 block w-full text-center text-xs text-primary font-semibold">
                    {t("auth.signupSteps.alreadyHaveAccount")}
                  </button>
                </>
              )}

              {signupStep === 2 && (
                <>
                  <h1 className="text-xl font-bold mb-1">{t("auth.titles.signup")}</h1>
                  <p className="text-sm text-muted-foreground mb-5">{t("auth.subtitles.signup")}</p>

                  <button
                    onClick={googleSignIn}
                    disabled={loading}
                    className="w-full bg-secondary border border-border font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                    <GoogleIcon size={18} />
                    {t("auth.continueWithGoogle")}
                  </button>

                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{t("auth.orDivider")}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <Form {...form}>
                    <form onSubmit={submit} className="space-y-3">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <input {...field} placeholder={t("auth.placeholders.name")}
                              className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                          </FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <input type="email" {...field} placeholder={t("auth.placeholders.email")}
                              className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <input type="password" {...field} placeholder={t("auth.placeholders.password")}
                              className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <button disabled={loading} type="submit"
                        className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <>{t("auth.submit.signup")} <ArrowRight size={16} /></>}
                      </button>
                    </form>
                  </Form>
                </>
              )}

              {signupStep === 3 && (
                <div className="py-4 text-center">
                  <MailCheck size={40} className="mx-auto text-primary" />
                  <h1 className="mt-4 text-xl font-bold">{t("auth.toasts.signupSuccessTitle")}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{t("auth.toasts.signupSuccessDescription")}</p>
                  <button onClick={() => setMode("login")}
                    className="mt-6 w-full bg-secondary font-bold py-3 rounded-2xl text-sm">
                    {t("auth.back")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-2 mb-6 bg-secondary/60 rounded-2xl p-1">
                {(["login","signup"] as Mode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      mode === m ? "bg-gradient-info text-info-foreground shadow-soft" : "text-muted-foreground"
                    }`}>
                    {m === "login" ? t("auth.tabs.login") : t("auth.tabs.signup")}
                  </button>
                ))}
              </div>

              <h1 className={`font-bold ${mode === "login" ? "text-2xl tracking-tight mb-5" : "text-xl mb-1"}`}>
                {mode === "login" && t("auth.titles.login")}
                {mode === "forgot" && t("auth.titles.forgot")}
              </h1>
              {mode === "forgot" && (
                <p className="text-sm text-muted-foreground mb-5">{t("auth.subtitles.forgot")}</p>
              )}

              <Form {...form}>
                <form onSubmit={submit} className="space-y-3">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input type="email" {...field} placeholder={t("auth.placeholders.email")}
                          className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {mode !== "forgot" && (
                    <FormField control={form.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <input type="password" {...field} placeholder={t("auth.placeholders.password")}
                            className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <button disabled={loading} type="submit"
                    className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>
                      {mode === "login" ? t("auth.submit.login") : t("auth.submit.forgot")} <ArrowRight size={16} />
                    </>}
                  </button>
                </form>
              </Form>

              {mode !== "forgot" && (
                <>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">{t("auth.orDivider")}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <button
                    onClick={googleSignIn}
                    disabled={loading}
                    className="mt-4 w-full bg-secondary border border-border font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60">
                    <GoogleIcon size={18} />
                    {t("auth.continueWithGoogle")}
                  </button>
                </>
              )}

              <div className="mt-4 flex items-center justify-between text-xs">
                {mode === "login" ? (
                  <button onClick={() => setMode("forgot")} className="text-primary font-semibold">{t("auth.forgotPassword")}</button>
                ) : (
                  <button onClick={() => setMode("login")} className="text-primary font-semibold">{t("auth.back")}</button>
                )}
                <button onClick={guest} disabled={loading} className="text-muted-foreground font-semibold hover:text-primary">
                  {t("auth.guest")}
                </button>
              </div>

              <Link to="/tilt"
                className="mt-5 block text-center text-xs font-bold text-destructive bg-destructive/10 py-2.5 rounded-2xl">
                {t("auth.resetNoLogin")}
              </Link>
            </>
          )}
        </div>

        <Link to="/" className="mt-5 block text-center text-xs text-muted-foreground">{t("auth.viewDemo")}</Link>
      </div>
      </div>

      {!isStandalone && <SiteFooter />}
    </div>
  );
}
