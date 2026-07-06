import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import logo from "@/assets/kognit-logo.png";
import mascot from "@/assets/kognit-mascot.png";
import { PhoneFrame } from "@/components/kognit/PhoneFrame";
import { OnboardingScreen } from "./kognit/Onboarding";
import { HomeScreen } from "./kognit/Home";
import { TiltScreen } from "./kognit/Tilt";
import { CardsScreen } from "./kognit/Cards";
import { CalendarScreen } from "./kognit/Calendar";
import { ProfileScreen } from "./kognit/Profile";
import { CommunityScreen } from "./kognit/Community";

const Index = () => {
  const { t } = useTranslation();
  const { canInstall, promptInstall } = useInstallPrompt();
  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <div className="pointer-events-none absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
      <header className="relative px-6 md:px-8 pt-14 pb-16 max-w-6xl mx-auto">
        <div className="flex items-center gap-5 md:gap-6 group">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl scale-110" />
            <img
              src={logo}
              alt={t("landing.logoAlt")}
              className="relative w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <p className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">{t("app.name")}</p>
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
            <span className="mt-1.5 text-base md:text-lg font-medium text-muted-foreground tracking-wide">{t("app.tagline")}</span>
          </div>
        </div>

        <div className="mt-12">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            {t("landing.badge")}
          </span>
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a href="#prototipo" className="bg-card border border-border font-bold px-6 py-3 rounded-full text-sm">
              {t("landing.ctaPrototype")}
            </a>
            {canInstall && (
              <button
                onClick={promptInstall}
                className="flex items-center gap-2 bg-foreground text-background font-bold px-5 py-2.5 rounded-full text-sm">
                <Download size={18} />
                {t("landing.installApp")}
              </button>
            )}
          </div>

          {/* Visual: respiración en tiempo real (patrón 4·7·8) */}
          <div className="mt-14 flex flex-col items-center gap-4">
            <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-breathe" />
              <div className="absolute inset-6 rounded-full bg-primary/10" />
              <img
                src={mascot}
                alt=""
                aria-hidden="true"
                className="relative w-24 h-24 md:w-28 md:h-28 object-contain animate-breathe"
              />
            </div>
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
              {t("landing.breathingCaption")}
            </p>
          </div>
        </div>
      </header>

      <main id="prototipo" className="px-6 md:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-primary">{t("landing.prototypeEyebrow")}</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">{t("landing.prototypeTitle")}</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-16">
          <PhoneFrame label={t("landing.frames.onboarding")}><OnboardingScreen /></PhoneFrame>
          <PhoneFrame label={t("landing.frames.home")}><HomeScreen /></PhoneFrame>
          <PhoneFrame label={t("landing.frames.reset")}><TiltScreen /></PhoneFrame>
          <PhoneFrame label={t("landing.frames.cards")}><CardsScreen /></PhoneFrame>
          <PhoneFrame label={t("landing.frames.calendar")}><CalendarScreen /></PhoneFrame>
          <PhoneFrame label={t("landing.frames.community")}><CommunityScreen /></PhoneFrame>
          <PhoneFrame label={t("landing.frames.profile")}><ProfileScreen /></PhoneFrame>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        {t("landing.footer")}
      </footer>
    </div>
  );
};

export default Index;
