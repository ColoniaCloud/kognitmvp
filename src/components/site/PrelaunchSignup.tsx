import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

interface FormValues {
  name: string;
  email: string;
}

const PrelaunchSignup = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => z.object({
    name: z.string().trim().min(1, t("prelaunchSection.form.errors.nameRequired")),
    email: z.string().trim().min(1, t("prelaunchSection.form.errors.emailRequired")).email(t("prelaunchSection.form.errors.emailInvalid")),
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" },
  });

  const submit = form.handleSubmit(async ({ name, email }) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("prelaunch_signups").insert({ name, email });
      if (error) {
        if (error.code === "23505") {
          toast({ title: t("prelaunchSection.form.toasts.duplicateTitle"), description: t("prelaunchSection.form.toasts.duplicateDescription") });
          form.reset();
          return;
        }
        throw error;
      }
      toast({ title: t("prelaunchSection.form.toasts.successTitle"), description: t("prelaunchSection.form.toasts.successDescription") });
      form.reset();
    } catch (err: unknown) {
      console.error("[prelaunch]", err);
      toast({
        title: t("prelaunchSection.form.toasts.errorTitle"),
        description: t("prelaunchSection.form.toasts.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <section className="px-6 md:px-8 py-24">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] p-[2px] shadow-glow">
        <div className="gradient-border-spin" />

        <div className="relative rounded-[calc(2rem-2px)] bg-card px-6 py-14 text-center md:px-16 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("prelaunchSection.eyebrow")}</p>
          <h2 className="animate-title-blur-in mt-4 text-3xl font-bold tracking-tight md:text-4xl">{t("prelaunchSection.title")}</h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground leading-relaxed">{t("prelaunchSection.description")}</p>

          <Form {...form}>
            <form onSubmit={submit} className="mx-auto mt-8 max-w-md space-y-3 text-left">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input {...field} placeholder={t("prelaunchSection.form.namePlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input type="email" {...field} placeholder={t("prelaunchSection.form.emailPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button disabled={loading} type="submit"
                className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>{t("prelaunchSection.form.submit")} <ArrowRight size={16} /></>}
              </button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
};

export { PrelaunchSignup };
