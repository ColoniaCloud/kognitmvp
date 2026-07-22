import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wind, Anchor, Layers, CalendarDays, Users, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PhoneFrameCarousel } from "@/components/site/PhoneFrameCarousel";

const FEATURES = [
  { key: "reset", icon: Wind, accent: "text-primary bg-primary/10" },
  { key: "calmAnchor", icon: Anchor, accent: "text-info bg-info/10" },
  { key: "cards", icon: Layers, accent: "text-cyan bg-cyan/10" },
  { key: "journal", icon: CalendarDays, accent: "text-seafoam bg-seafoam/10" },
  { key: "community", icon: Users, accent: "text-destructive bg-destructive/10" },
  { key: "profile", icon: TrendingUp, accent: "text-warning bg-warning/10" },
] as const;

const Features = () => {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <SiteHeader />

      <section className="relative px-6 md:px-8 pt-24 md:pt-32 pb-16 md:pb-20 max-w-6xl mx-auto text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("featuresPage.eyebrow")}</p>
        <h1 className="animate-title-blur-in mt-4 text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">{t("featuresPage.title")}</h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">{t("featuresPage.subtitle")}</p>
      </section>

      <main className="px-6 md:px-8 pb-24">
        <div className="max-w-6xl mx-auto grid gap-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-12">
          <div className="grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ key, icon: Icon, accent }) => (
              <div key={key} className="rounded-3xl border border-border/50 bg-card p-6 shadow-card">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${accent}`}>
                  <Icon size={20} />
                </span>
                <h2 className="mt-4 font-display font-bold text-lg tracking-tight">{t(`landing.features.${key}.title`)}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`landing.features.${key}.description`)}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <PhoneFrameCarousel />
          </div>
        </div>
      </main>

      <section className="relative overflow-hidden bg-gradient-deep px-6 py-20 text-center text-white md:px-8">
        <div className="pointer-events-none absolute -top-1/3 left-1/3 h-[400px] w-[400px] rounded-full bg-primary/20 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="animate-title-blur-in text-3xl font-bold tracking-tight md:text-4xl">{t("featuresPage.cta.title")}</h2>
          <p className="mt-4 text-white/70">{t("featuresPage.cta.subtitle")}</p>
          <Link
            to="/auth?mode=signup"
            className="mt-8 inline-block bg-gradient-primary text-primary-foreground font-bold px-8 py-3.5 rounded-full shadow-glow text-sm">
            {t("featuresPage.cta.button")}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Features;
