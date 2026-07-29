import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Capturas reales de la app en mobile (390×844 @2x), en public/screens/. Antes acá se
// montaba la app de verdad dentro de un PhoneFrame, con sus llamadas a Supabase y sus
// estados vacíos; ahora son imágenes fijas. Para regenerarlas, ver docs/capturas.md.
const SCREENS = [
  { key: "home", src: "/screens/home.webp" },
  { key: "reset", src: "/screens/tilt.webp" },
  { key: "cards", src: "/screens/cards.webp" },
  { key: "calendar", src: "/screens/calendar.webp" },
  { key: "community", src: "/screens/community.webp" },
  { key: "profile", src: "/screens/profile.webp" },
] as const;

const AppScreensCarousel = () => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const go = (delta: number) => setIndex((i) => (i + delta + SCREENS.length) % SCREENS.length);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[75vw] max-w-[320px] md:w-[320px]">
        <div
          className="overflow-hidden rounded-[2.25rem] shadow-card ring-1 ring-foreground/10"
          style={{ aspectRatio: "390 / 844" }}>
          <div
            className="flex h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}>
            {SCREENS.map((s, i) => (
              <img
                key={s.key}
                src={s.src}
                alt={t(`landing.screens.${s.key}`)}
                width={780}
                height={1688}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="h-full w-full flex-shrink-0 object-cover"
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={t("landing.carousel.prevAria")}
          className="absolute left-0 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition-colors hover:bg-secondary md:h-11 md:w-11">
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={t("landing.carousel.nextAria")}
          className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card transition-colors hover:bg-secondary md:h-11 md:w-11">
          <ChevronRight size={18} />
        </button>
      </div>

      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
        {t(`landing.screens.${SCREENS[index].key}`)}
      </span>

      <div className="flex items-center gap-2">
        {SCREENS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t(`landing.screens.${s.key}`)}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export { AppScreensCarousel };
