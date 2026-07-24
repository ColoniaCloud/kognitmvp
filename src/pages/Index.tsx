import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Lottie from "lottie-react";
import { Wind, Anchor, Layers, CalendarDays, Users, TrendingUp, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SitePricing } from "@/components/site/SitePricing";
import { AppScreensCarousel } from "@/components/site/AppScreensCarousel";
import { PrelaunchSignup } from "@/components/site/PrelaunchSignup";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FEATURES = [
  { key: "reset", icon: Wind },
  { key: "calmAnchor", icon: Anchor },
  { key: "cards", icon: Layers },
  { key: "journal", icon: CalendarDays },
  { key: "community", icon: Users },
  { key: "profile", icon: TrendingUp },
] as const;

const Index = () => {
  const { t } = useTranslation();
  const [mascotaAnimation, setMascotaAnimation] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/mascota/mascota-parpadea.json")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setMascotaAnimation(data); })
      .catch((err) => console.error("[hero-mascota]", err));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <SiteHeader />
      <section className="relative w-full overflow-hidden">
        <div className="relative flex min-h-screen flex-col px-6 pt-24 pb-6 md:min-h-[720px] md:flex-row md:items-center md:px-8 md:pt-32 md:pb-32 max-w-6xl mx-auto">
          <div className="relative flex w-full flex-1 flex-col gap-10 md:grid md:flex-none md:grid-cols-2 md:items-center">
            {mascotaAnimation && (
              <Lottie
                animationData={mascotaAnimation}
                loop
                autoplay
                aria-hidden="true"
                className="hero-mascot-mask pointer-events-none absolute left-1/2 right-0 bottom-14 h-[17.6rem] w-auto sm:h-[19.8rem] md:bottom-auto md:top-1/2 md:h-[26rem] md:-translate-y-1/2 lg:h-[30rem]"
              />
            )}

            {/* Mobile: título/subtítulo arriba, CTA abajo del todo (mt-auto), dejando el hueco
                del medio libre para que se vea la mascota. Desktop: bloque único centrado, como antes. */}
            <div className="relative flex flex-1 flex-col md:block md:flex-none">
              <div className="md:contents">
                <h1 className="animate-title-blur-in mt-6 text-[1.25rem] sm:text-[1.75rem] md:text-[clamp(1.875rem,5.5vw,3.375rem)] font-bold leading-[1.05] tracking-tight">
                  <span className="block md:whitespace-nowrap">{t("landing.heroTitleLine1")}</span>
                  <span className="text-gradient block md:w-max md:whitespace-nowrap">{t("landing.heroTitleLine2")}</span>
                </h1>
                <p className="mt-6 max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                  {t("landing.heroSubtitle")}
                </p>
              </div>
              <div className="mt-auto flex flex-nowrap items-center gap-3 pt-10 md:mt-6 md:pt-0">
                <Link to="/auth?mode=signup" className="flex-shrink-0 bg-gradient-primary text-primary-foreground font-bold px-6 py-3 rounded-full shadow-soft text-sm">
                  {t("landing.ctaStart")}
                </Link>
                <span className="text-sm text-muted-foreground">{t("landing.ctaNote")}</span>
              </div>
            </div>

            {/* Columna derecha intencionalmente vacía: deja ver la mascota de fondo */}
            <div aria-hidden="true" className="hidden md:block" />
          </div>

          {/* Invitación a scrollear, solo en el hero mobile de 100vh */}
          <div className="flex justify-center pb-2 md:hidden" aria-hidden="true">
            <ChevronDown className="h-7 w-7 animate-bounce text-muted-foreground" />
          </div>
        </div>
      </section>

      <main id="prototipo" className="px-6 md:px-8 py-24">
        <div className="max-w-6xl mx-auto grid gap-16 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <img src="/mascota/mascota1.svg" alt="" aria-hidden="true" className="w-24 h-24 md:w-28 md:h-28 object-contain" />
            <p className="mt-6 text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("landing.prototypeEyebrow")}</p>
            <p className="mt-3 text-base md:text-lg leading-relaxed">{t("landing.featuresIntro")}</p>

            <Accordion type="single" collapsible className="mt-8">
              {FEATURES.map(({ key, icon: Icon }) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon size={18} />
                      </span>
                      <span className="font-semibold">{t(`landing.features.${key}.title`)}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-12 text-muted-foreground">
                    {t(`landing.features.${key}.description`)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="flex justify-center">
            <AppScreensCarousel />
          </div>
        </div>
      </main>

      <PrelaunchSignup />

      <SitePricing />
      <SiteFooter />
    </div>
  );
};

export default Index;
