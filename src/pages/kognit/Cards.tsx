import { ChevronLeft, Shuffle, RotateCw, Lock } from "lucide-react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/kognit/BottomNav";
import { CATEGORIES } from "@/data/mentalCards";
import { useState, useRef, useEffect } from "react";

interface CardsProps {
  onBack?: () => void;
  // Free solo sortea la primera categoría (CATEGORIES[0]); Pro desbloquea las 5.
  plan?: "free" | "pro";
  onUpgrade?: () => void;
}

const FREE_CATEGORY_INDICES = [0];

function getRandomCard(allowedIndices: number[]) {
  const randomCat = allowedIndices[Math.floor(Math.random() * allowedIndices.length)];
  const randomCard = Math.floor(Math.random() * CATEGORIES[randomCat].cardCount);
  return { catIdx: randomCat, cardIdx: randomCard };
}

export const CardsScreen = ({ onBack, plan = "free", onUpgrade }: CardsProps) => {
  const { t } = useTranslation();
  const allowedIndices = plan === "pro" ? CATEGORIES.map((_, i) => i) : FREE_CATEGORY_INDICES;
  const initial = getRandomCard(allowedIndices);
  const [catIdx, setCatIdx] = useState(initial.catIdx);
  const [cardIdx, setCardIdx] = useState(initial.cardIdx);

  const cat = CATEGORIES[catIdx];
  const catName = t(`mentalCards.categories.${cat.id}.name`);
  const catTagline = t(`mentalCards.categories.${cat.id}.tagline`);
  const cardTitle = t(`mentalCards.categories.${cat.id}.cards.${cardIdx}.title`);
  const cardMessage = t(`mentalCards.categories.${cat.id}.cards.${cardIdx}.message`);
  const cardAction = t(`mentalCards.categories.${cat.id}.cards.${cardIdx}.action`);

  const rotateY = useMotionValue(0);
  const wasDragged = useRef(false);

  // Cada carta nueva arranca mostrando el frente, sin animación.
  useEffect(() => {
    rotateY.set(0);
  }, [catIdx, cardIdx, rotateY]);

  const snapTo = (target: number) => {
    animate(rotateY, target, { type: "spring", stiffness: 260, damping: 24 });
  };

  const handlePan = (_e: PointerEvent, info: PanInfo) => {
    wasDragged.current = true;
    rotateY.set(rotateY.get() + info.delta.x * 0.6);
  };

  const handlePanEnd = (_e: PointerEvent, info: PanInfo) => {
    const current = rotateY.get();
    const isFlick = Math.abs(info.velocity.x) > 500;
    const target = isFlick
      ? (info.velocity.x > 0 ? Math.ceil(current / 180) : Math.floor(current / 180)) * 180
      : Math.round(current / 180) * 180;
    snapTo(target);
    setTimeout(() => { wasDragged.current = false; }, 0);
  };

  const handleClick = () => {
    if (wasDragged.current) return;
    snapTo(rotateY.get() + 180);
  };

  const accentMap: Record<string, string> = {
    primary: "bg-gradient-primary text-primary-foreground",
    destructive: "bg-gradient-emergency text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
    accent: "bg-gradient-deep text-primary-foreground",
    info: "bg-gradient-info text-info-foreground",
    violet: "bg-gradient-violet text-violet-foreground",
    gold: "bg-gradient-gold text-gold-foreground",
    seafoam: "bg-gradient-seafoam text-seafoam-foreground",
  };

  // Glow por categoría (mismo tono que su gradiente) en vez del glow cian fijo
  const glowColorMap: Record<string, string> = {
    primary: "205 55% 40%",
    destructive: "226 68% 50%",
    warning: "28 60% 45%",
    accent: "195 48% 58%",
    info: "212 55% 52%",
    violet: "258 33% 65%",
    gold: "43 62% 50%",
    seafoam: "173 43% 56%",
  };
  const glow = glowColorMap[cat.accent] ?? "195 48% 58%";
  const cardGlowStyle = { boxShadow: `0 0 45px hsl(${glow} / 0.35), inset 0 0 0 1px hsl(${glow} / 0.3)` };

  const drawCard = () => {
    const next = getRandomCard(allowedIndices);
    setCatIdx(next.catIdx);
    setCardIdx(next.cardIdx);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-hero pb-28">
      <div className="px-6 pt-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("cards.eyebrow")}</p>
          <p className="text-sm font-bold">{catName}</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Tagline de la categoría */}
      <p className="mt-3 px-6 text-sm font-bold leading-tight shrink-0">{catTagline}</p>

      {/* Carta */}
      <div className="relative mt-4 mx-6 flex-1 min-h-0" style={{ perspective: 1400 }}>
        <div className="absolute inset-x-8 top-6 bottom-4 rounded-3xl bg-card shadow-soft opacity-50" />
        <div className="absolute inset-x-4 top-3 bottom-2 rounded-3xl bg-card shadow-card" />
        <motion.div
          className="absolute inset-x-0 top-0 bottom-3 cursor-grab active:cursor-grabbing"
          style={{ transformStyle: "preserve-3d", rotateY }}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          onClick={handleClick}
        >
          {/* Lado A — título */}
          <div
            className={`absolute inset-0 rounded-3xl p-6 flex flex-col overflow-hidden ${accentMap[cat.accent]}`}
            style={{ backfaceVisibility: "hidden", ...cardGlowStyle }}
          >
            <div className="flex-1 min-h-0 flex items-center justify-center text-center">
              <h2 className="font-serif text-3xl font-semibold leading-tight">{cardTitle}</h2>
            </div>
            <div className="flex items-center justify-center gap-2 opacity-80">
              <RotateCw size={14} />
              <p className="text-[11px] uppercase tracking-widest font-bold">{t("cards.flipHint")}</p>
            </div>
          </div>

          {/* Lado B — mensaje + acción */}
          <div
            className={`absolute inset-0 rounded-3xl p-6 flex flex-col overflow-y-auto no-scrollbar ${accentMap[cat.accent]}`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", ...cardGlowStyle }}
          >
            <div className="flex-1 flex flex-col justify-center">
              <p className="font-serif text-base opacity-90 leading-relaxed">{cardMessage}</p>
            </div>
            <div className="mt-4 pl-4 pr-3 py-3 border-l-4 border-white/50 bg-white/5 rounded-r-xl shrink-0">
              <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">{t("cards.actionLabel")}</p>
              <p className="font-serif mt-1 text-base font-semibold leading-snug">{cardAction}</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 mt-4 shrink-0">
        <button onClick={drawCard}
          className="w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold flex items-center justify-center gap-2 shadow-card hover:opacity-90 transition-opacity">
          <Shuffle size={16} /> {t("cards.drawCard")}
        </button>
        {plan === "free" && (
          <button onClick={onUpgrade}
            className="mt-2.5 w-full py-2.5 rounded-2xl bg-secondary text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground">
            <Lock size={12} /> {t("cards.unlockAllCategories", { count: CATEGORIES.length - FREE_CATEGORY_INDICES.length })}
          </button>
        )}
      </div>

      <BottomNav active="cards" />
    </div>
  );
};
