import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const CONTACT_EMAIL = "soporte@kognitapp.com";

interface FormValues {
  name: string;
  email: string;
  message: string;
}

const Contact = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => z.object({
    name: z.string().trim().min(1, t("contactPage.form.errors.nameRequired")),
    email: z.string().trim().min(1, t("contactPage.form.errors.emailRequired")).email(t("contactPage.form.errors.emailInvalid")),
    message: z.string().trim().min(1, t("contactPage.form.errors.messageRequired")),
  }), [t]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", message: "" },
  });

  const submit = form.handleSubmit(async ({ name, email, message }) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({ name, email, message });
      if (error) throw error;
      toast({ title: t("contactPage.form.toasts.successTitle"), description: t("contactPage.form.toasts.successDescription") });
      form.reset();
    } catch (err: unknown) {
      console.error("[contact]", err);
      toast({
        title: t("contactPage.form.toasts.errorTitle"),
        description: t("contactPage.form.toasts.errorDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <SiteHeader />

      <main className="relative px-6 md:px-8 pt-24 md:pt-32 pb-24 max-w-3xl mx-auto">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("contactPage.eyebrow")}</p>
          <h1 className="animate-title-blur-in mt-4 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">{t("contactPage.title")}</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">{t("contactPage.subtitle")}</p>
        </div>

        <div className="mt-12 bg-card rounded-3xl shadow-card border border-border/50 p-7 md:p-10">
          <Form {...form}>
            <form onSubmit={submit} className="space-y-3">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input {...field} placeholder={t("contactPage.form.namePlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <input type="email" {...field} placeholder={t("contactPage.form.emailPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <textarea {...field} rows={5} placeholder={t("contactPage.form.messagePlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <button disabled={loading} type="submit"
                className="w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl shadow-glow flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>{t("contactPage.form.submit")} <ArrowRight size={16} /></>}
              </button>
            </form>
          </Form>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Mail size={16} />
          {t("contactPage.directEmailLabel")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Contact;
