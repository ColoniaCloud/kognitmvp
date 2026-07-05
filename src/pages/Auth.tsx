import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2 } from "lucide-react";
import logo from "@/assets/kognit-logo.png";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

type Mode = "login" | "signup" | "forgot";

interface FormValues {
  name?: string;
  email: string;
  password?: string;
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

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
  // (ej. "contraseña muy corta" no debería seguir mostrado en "forgot").
  useEffect(() => {
    form.clearErrors();
  }, [mode, form]);

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
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast({ title: t("auth.toasts.signupSuccessTitle"), description: t("auth.toasts.signupSuccessDescription") });
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: t("auth.toasts.forgotSuccessTitle"), description: t("auth.toasts.forgotSuccessDescription") });
        setMode("login");
      }
    } catch (err: any) {
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
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden flex items-center justify-center px-6 py-10">
      <div className="pointer-events-none absolute -top-1/4 -left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-110" />
            <img src={logo} alt="kognit" className="relative w-12 h-12 object-contain" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">{t("app.name")}</p>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">{t("app.tagline")}</p>
          </div>
        </div>

        <div className="bg-card rounded-3xl shadow-card border border-border/50 p-7">
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
            {mode === "signup" && t("auth.titles.signup")}
            {mode === "forgot" && t("auth.titles.forgot")}
          </h1>
          {mode !== "login" && (
            <p className="text-sm text-muted-foreground mb-5">
              {mode === "signup" && t("auth.subtitles.signup")}
              {mode === "forgot" && t("auth.subtitles.forgot")}
            </p>
          )}

          <Form {...form}>
            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <input {...field} placeholder={t("auth.placeholders.name")}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                    </FormControl>
                  </FormItem>
                )} />
              )}
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
                  {mode === "login" ? t("auth.submit.login") : mode === "signup" ? t("auth.submit.signup") : t("auth.submit.forgot")} <ArrowRight size={16} />
                </>}
              </button>
            </form>
          </Form>

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
        </div>

        <Link to="/" className="mt-5 block text-center text-xs text-muted-foreground">{t("auth.viewDemo")}</Link>
      </div>
    </div>
  );
}