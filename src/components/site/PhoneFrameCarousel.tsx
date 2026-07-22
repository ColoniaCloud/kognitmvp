import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { PhoneFrame } from "@/components/kognit/PhoneFrame";
import { OnboardingScreen } from "@/pages/kognit/Onboarding";
import { HomeScreen } from "@/pages/kognit/Home";
import { TiltScreen } from "@/pages/kognit/Tilt";
import { CardsScreen } from "@/pages/kognit/Cards";
import { CalendarScreen } from "@/pages/kognit/Calendar";
import { CommunityScreen } from "@/pages/kognit/Community";
import { ProfileScreen } from "@/pages/kognit/Profile";

const SCREENS = [
  { key: "onboarding", Component: OnboardingScreen },
  { key: "home", Component: HomeScreen },
  { key: "reset", Component: TiltScreen },
  { key: "cards", Component: CardsScreen },
  { key: "calendar", Component: CalendarScreen },
  { key: "community", Component: CommunityScreen },
  { key: "profile", Component: ProfileScreen },
] as const;

const PhoneFrameCarousel = () => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const go = (delta: number) => {
    setDirection(delta);
    setIndex((i) => (i + delta + SCREENS.length) % SCREENS.length);
  };

  const select = (i: number) => {
    setDirection(i > index ? 1 : -1);
    setIndex(i);
  };

  const { key, Component } = SCREENS[index];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <PhoneFrame label={t(`landing.frames.${key}`)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={key}
              initial={{ opacity: 0, x: direction >= 0 ? 32 : -32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction >= 0 ? -32 : 32 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="h-full w-full"
            >
              <Component />
            </motion.div>
          </AnimatePresence>
        </PhoneFrame>

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

      <div className="flex items-center gap-2">
        {SCREENS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => select(i)}
            aria-label={t(`landing.frames.${s.key}`)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export { PhoneFrameCarousel };
