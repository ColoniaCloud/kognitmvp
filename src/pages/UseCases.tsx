import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gauge, Zap, Mic, TrendingDown } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const USE_CASES = [
  { key: "demandingRoutine", icon: Gauge, accent: "text-seafoam bg-seafoam/10" },
  { key: "highPressure", icon: Zap, accent: "text-info bg-info/10" },
  { key: "noSecondChance", icon: Mic, accent: "text-cyan bg-cyan/10" },
  { key: "badPatch", icon: TrendingDown, accent: "text-destructive bg-destructive/10" },
] as const;

const UseCases = () => {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <SiteHeader />

      <section className="relative px-6 md:px-8 pt-24 md:pt-32 pb-16 md:pb-20 max-w-6xl mx-auto text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("useCasesPage.eyebrow")}</p>
        <h1 className="animate-title-blur-in mt-4 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">{t("useCasesPage.title")}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">{t("useCasesPage.subtitle")}</p>
      </section>

      <main className="px-6 md:px-8 pb-24">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
          {USE_CASES.map(({ key, icon: Icon, accent }) => (
            <div key={key} className="rounded-3xl border border-border/50 bg-card p-8 shadow-card">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full ${accent}`}>
                <Icon size={20} />
              </span>
              <h2 className="mt-5 font-display font-bold text-xl tracking-tight">{t(`useCasesPage.cases.${key}.title`)}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t(`useCasesPage.cases.${key}.painPoint`)}</p>
              <p className="mt-4 text-sm leading-relaxed">{t(`useCasesPage.cases.${key}.solution`)}</p>
            </div>
          ))}
        </div>
      </main>

      <section className="relative overflow-hidden bg-gradient-deep px-6 py-20 text-center text-white md:px-8">
        <div className="pointer-events-none absolute -top-1/3 right-1/3 h-[400px] w-[400px] rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="animate-title-blur-in text-3xl font-bold tracking-tight md:text-4xl">{t("useCasesPage.cta.title")}</h2>
          <p className="mt-4 text-white/70">{t("useCasesPage.cta.subtitle")}</p>
          <Link
            to="/auth?mode=signup"
            className="mt-8 inline-block bg-gradient-primary text-primary-foreground font-bold px-8 py-3.5 rounded-full shadow-glow text-sm">
            {t("useCasesPage.cta.button")}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UseCases;
