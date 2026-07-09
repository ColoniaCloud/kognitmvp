import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wind, Layers, CalendarDays, Users, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SitePricing } from "@/components/site/SitePricing";
import { PhoneFrameCarousel } from "@/components/site/PhoneFrameCarousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import mascot from "@/assets/kognit-mascot.png";

const FEATURES = [
  { key: "reset", icon: Wind },
  { key: "cards", icon: Layers },
  { key: "journal", icon: CalendarDays },
  { key: "community", icon: Users },
  { key: "profile", icon: TrendingUp },
] as const;

const Index = () => {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <SiteHeader />
      <section className="relative w-full overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
        {/* Tapa el video con el color de fondo de la web; en desktop se degrada hacia la derecha para dejarlo ver solo en la mitad derecha */}
        <div className="absolute inset-0 bg-gradient-to-r from-background from-70% to-background/40 md:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-background from-35% via-background/90 via-50% to-transparent md:block" />

        <div className="relative px-6 md:px-8 pt-24 md:pt-28 pb-16 md:pb-32 max-w-6xl mx-auto md:flex md:min-h-[720px] md:items-center">
          <div className="grid w-full items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
                <span className="block">{t("landing.heroTitleLine1")}</span>
                <span className="text-gradient block">{t("landing.heroTitleLine2")}</span>
              </h1>
              <p className="mt-6 max-w-3xl text-lg md:text-xl text-muted-foreground leading-relaxed">
                {t("landing.heroSubtitle")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/auth" className="bg-gradient-primary text-primary-foreground font-bold px-6 py-3 rounded-full shadow-soft text-sm">
                  {t("landing.ctaStart")}
                </Link>
                <span className="text-sm text-muted-foreground">{t("landing.ctaNote")}</span>
              </div>
            </div>

            {/* Columna derecha intencionalmente vacía: deja ver el video de fondo */}
            <div aria-hidden="true" className="hidden md:block" />
          </div>
        </div>
      </section>

      <main id="prototipo" className="px-6 md:px-8 py-24">
        <div className="max-w-6xl mx-auto grid gap-16 md:grid-cols-2 md:items-center md:gap-12">
          <div>
            <img src={mascot} alt="" aria-hidden="true" className="w-20 h-20 md:w-24 md:h-24 object-contain" />
            <p className="mt-6 text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("landing.prototypeEyebrow")}</p>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">{t("landing.prototypeTitle")}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("landing.featuresIntro")}</p>

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
            <PhoneFrameCarousel />
          </div>
        </div>
      </main>

      <SitePricing />
      <SiteFooter />
    </div>
  );
};

export default Index;
