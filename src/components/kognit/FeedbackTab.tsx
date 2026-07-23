import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Loader2, MessageSquarePlus, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const CATEGORIES = ["bug", "idea", "confusing", "other"] as const;
type Category = (typeof CATEGORIES)[number];

interface Props {
  /** Nombre a adjuntar al feedback — el usuario no lo escribe. */
  name: string;
  /** Email a adjuntar al feedback — el usuario no lo escribe. */
  email: string;
}

interface FormValues {
  name: string;
  email: string;
  category: Category | "";
  message: string;
}

/**
 * Pestaña fija en el borde derecho de /app que despliega el formulario de feedback del
 * programa de testers. Nombre y email viajan como campos ocultos tomados de la sesión.
 */
export const FeedbackTab = ({ name, email }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => z.object({
    name: z.string(),
    email: z.string(),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: t("feedback.errors.categoryRequired") }) }),
    message: z.string().trim().min(1, t("feedback.errors.messageRequired")).max(4000),
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name, email, category: "", message: "" },
  });

  // El perfil se carga después del primer render, así que los campos ocultos se
  // resincronizan cuando llegan — sin tocar lo que el usuario ya escribió.
  useEffect(() => {
    form.setValue("name", name);
    form.setValue("email", email);
  }, [form, name, email]);

  const submit = form.handleSubmit(async ({ category, message }) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        user_id: user.id,
        name,
        email,
        category,
        message,
      });
      if (error) throw error;
      toast({ title: t("feedback.toasts.successTitle"), description: t("feedback.toasts.successDescription") });
      form.reset({ name, email, category: "", message: "" });
      setOpen(false);
    } catch (err: unknown) {
      console.error("[feedback]", err);
      toast({
        title: t("feedback.toasts.errorTitle"),
        description: t("feedback.toasts.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("feedback.tabAria")}
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1.5 rounded-l-xl border border-r-0 border-border/50 bg-card/80 py-3 pl-2.5 pr-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground shadow-soft backdrop-blur transition-colors hover:text-foreground [writing-mode:vertical-rl]">
        <MessageSquarePlus size={13} className="rotate-90" />
        {t("feedback.tab")}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetTitle className="font-display text-lg font-bold tracking-tight">{t("feedback.title")}</SheetTitle>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t("feedback.description")}</p>

          <Form {...form}>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {/* Nombre y email no los completa el usuario: van ocultos desde la sesión. */}
              <input type="hidden" {...form.register("name")} />
              <input type="hidden" {...form.register("email")} />

              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("feedback.categoryLabel")}
                  </p>
                  <FormControl>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => field.onChange(c)}
                          aria-pressed={field.value === c}
                          className={`rounded-2xl border px-3 py-2.5 text-xs font-bold transition-all ${
                            field.value === c
                              ? "border-transparent bg-gradient-info text-info-foreground shadow-soft"
                              : "border-border/50 bg-secondary text-muted-foreground"
                          }`}>
                          {t(`feedback.categories.${c}`)}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("feedback.messageLabel")}
                  </p>
                  <FormControl>
                    <textarea {...field} rows={7} placeholder={t("feedback.messagePlaceholder")}
                      className="mt-2 w-full resize-none rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button disabled={loading} type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>{t("feedback.submit")} <Send size={15} /></>}
              </button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};
