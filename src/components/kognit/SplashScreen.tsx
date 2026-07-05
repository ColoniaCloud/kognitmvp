import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import mascot from "@/assets/kognit-mascot.png";

const PARTICLE_COUNT = 20;

export const SplashScreen = () => {
  const { t } = useTranslation();
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 6}s`,
        duration: `${5 + Math.random() * 3}s`,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-hero overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 w-0.5 h-0.5 rounded-full bg-primary/30 animate-float-up"
            style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse-ring" />
          <img
            src={mascot}
            alt=""
            aria-hidden="true"
            className="relative w-full h-full object-contain drop-shadow-[0_0_20px_hsl(var(--primary)/0.4)] animate-breathe"
          />
        </div>

        <h1 className="mt-6 font-display text-4xl tracking-wide">{t("app.name")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("splash.subtitle")}</p>

        <div className="mt-8 mx-auto w-48 h-0.5 rounded-full bg-primary/10 overflow-hidden">
          <div className="h-full bg-gradient-primary animate-progress-load" />
        </div>
      </div>
    </div>
  );
};
