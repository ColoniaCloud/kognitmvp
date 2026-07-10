import { ChevronLeft, Shuffle, RotateCw, Lock } from "lucide-react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/kognit/BottomNav";
import { CATEGORIES } from "@/data/mentalCards";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CardsProps {
  onBack?: () => void;
  // Free ve 1 carta random fija por día; Pro puede mezclar sin límite.
  plan?: "free" | "pro";
  onUpgrade?: () => void;
}

function getRandomCard() {
  const randomCat = Math.floor(Math.random() * CATEGORIES.length);
  const randomCard = Math.floor(Math.random() * CATEGORIES[randomCat].cardCount);
  return { catIdx: randomCat, cardIdx: randomCard };
}

// Clave de fecha en hora local del dispositivo (no UTC) para que "el día" coincida
// con lo que el usuario ve en su calendario, sin depender de la zona horaria del servidor.
function localDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const CardsScreen = ({ onBack, plan = "free", onUpgrade }: CardsProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isPro = plan === "pro";
  const [catIdx, setCatIdx] = useState(0);
  const [cardIdx, setCardIdx] = useState(0);
  const [ready, setReady] = useState(false);

  // Pro: sortea libre en el cliente. Free: la carta del día se sortea una sola vez
  // y se persiste en profiles para que sea la misma si el usuario cierra y reabre la app.
  useEffect(() => {
    let cancelled = false;

    if (isPro || !user) {
      const initial = getRandomCard();
      setCatIdx(initial.catIdx);
      setCardIdx(initial.cardIdx);
      setReady(true);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("free_card_drawn_on, free_card_category, free_card_index")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;

      const todayKey = localDateKey(new Date());
      if (data?.free_card_drawn_on === todayKey && data.free_card_category != null && data.free_card_index != null) {
        setCatIdx(data.free_card_category);
        setCardIdx(data.free_card_index);
      } else {
        const next = getRandomCard();
        setCatIdx(next.catIdx);
        setCardIdx(next.cardIdx);
        await supabase.from("profiles").update({
          free_card_drawn_on: todayKey,
          free_card_category: next.catIdx,
          free_card_index: next.cardIdx,
        }).eq("id", user.id);
      }
      if (!cancelled) setReady(true);
    })();

    return () => { cancelled = true; };
  }, [isPro, user]);

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
    cyan: "bg-gradient-cyan text-cyan-foreground",
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
    cyan: "188 48% 54%",
  };
  const glow = glowColorMap[cat.accent] ?? "195 48% 58%";
  const cardGlowStyle = { boxShadow: `0 0 45px hsl(${glow} / 0.35), inset 0 0 0 1px hsl(${glow} / 0.3)` };

  const drawCard = () => {
    if (!isPro) return;
    const next = getRandomCard();
    setCatIdx(next.catIdx);
    setCardIdx(next.cardIdx);
  };

  if (!ready) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-hero pb-28">
        <p className="text-xs text-muted-foreground">{t("cards.loading")}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-hero pb-28">
      <div className="px-6 pt-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} aria-label={t("common.backAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
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
        <button
          onClick={drawCard}
          disabled={!isPro}
          className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-card transition-opacity ${
            isPro ? "bg-foreground text-background hover:opacity-90" : "bg-secondary text-muted-foreground"
          }`}>
          {isPro ? <Shuffle size={16} /> : <Lock size={14} />}
          {isPro ? t("cards.drawCard") : t("cards.alreadyDrawnToday")}
        </button>
        {!isPro && (
          <button onClick={onUpgrade}
            className="mt-2.5 w-full py-2.5 rounded-2xl bg-secondary text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground">
            <Lock size={12} /> {t("cards.unlockUnlimited")}
          </button>
        )}
      </div>

      <BottomNav active="cards" />
    </div>
  );
};
