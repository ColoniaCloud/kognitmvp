import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Brain, Heart, Target, Zap } from "lucide-react";
import mascot from "@/assets/kognit-mascot.png";
import mascotAngry from "@/assets/mascot-angry.png";
import mascotFear from "@/assets/mascot-fear.png";
import mascotOverthinking from "@/assets/mascot-overthinking.png";
import mascotOverwhelmed from "@/assets/mascot-overwhelmed.png";
import mascotFrustrated from "@/assets/mascot-frustrated.png";
import mascotNeutral from "@/assets/mascot-neutral.png";
import { EMOTION_RECOMMENDATION, type EmotionId } from "@/data/emotionRecommendation";

const GOAL_META = [
  { id: "calm", icon: Heart },
  { id: "recover", icon: Zap },
  { id: "decide", icon: Target },
  { id: "resilience", icon: Brain },
] as const;

export type GoalId = (typeof GOAL_META)[number]["id"];

const EMOTION_META = [
  { id: "frustration", face: mascotFrustrated },
  { id: "fear", face: mascotFear },
  { id: "overthinking", face: mascotOverthinking },
  { id: "tilt", face: mascotAngry },
  { id: "unmotivated", face: mascotNeutral },
  { id: "overwhelm", face: mascotOverwhelmed },
] as const;

interface OnboardingProps {
  // Se llama al confirmar la selección (form → welcome), para persistirla.
  onSubmit?: (emotions: string[], goals: string[]) => void;
  // Se llama al tocar el CTA de la pantalla de bienvenida, para entrar a la app.
  onFinish?: () => void;
}

export const OnboardingScreen = ({ onSubmit, onFinish }: OnboardingProps = {}) => {
  const { t } = useTranslation();
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [step, setStep] = useState<"form" | "welcome">("form");

  const toggleEmotion = (id: string) => {
    setSelectedEmotions(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const confirmSelection = () => {
    onSubmit?.(selectedEmotions, selectedGoals);
    setStep("welcome");
  };

  if (step === "welcome") {
    const primaryEmotion = selectedEmotions[0] as EmotionId | undefined;
    const recommendation = primaryEmotion ? EMOTION_RECOMMENDATION[primaryEmotion] : null;
    return (
      <div className="min-h-full px-6 flex flex-col items-center justify-center text-center">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-breathe" />
          <div className="absolute inset-6 rounded-full bg-primary/10" />
          <img src={mascot} alt="" aria-hidden="true" className="relative w-24 h-24 object-contain animate-breathe" />
        </div>
        <h1 className="mt-10 text-[26px] leading-tight font-bold text-foreground">
          {t("onboarding.welcomeTitlePrefix")}<span className="text-gradient">{t("onboarding.welcomeTitleHighlight")}</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-[280px]">
          {t("onboarding.welcomeSubtitle")}
        </p>

        {recommendation && (
          <div className="mt-6 p-4 rounded-2xl bg-card shadow-soft border border-border w-full max-w-[320px] flex gap-3 items-start text-left">
            <img src={recommendation.mascot} alt="" aria-hidden="true" className="w-12 h-12 object-contain shrink-0" />
            <div>
              <p className="text-xs leading-snug text-foreground">{t(`onboarding.recommendation.reasons.${primaryEmotion}`)}</p>
              <p className="mt-2 text-[11px] font-bold text-primary">
                {t("onboarding.recommendation.recommendedModeLabel", {
                  mode: t(recommendation.mode === "fast" ? "tilt.fastMode.title" : "tilt.deepMode.title"),
                  duration: recommendation.duration,
                })}
              </p>
            </div>
          </div>
        )}
        {onFinish && (
          <button
            onClick={onFinish}
            className="mt-8 w-full max-w-xs bg-gradient-primary text-primary-foreground font-semibold py-4 rounded-2xl shadow-soft flex items-center justify-center gap-2">
            {t("onboarding.enterApp")} <ArrowRight size={18} />
          </button>
        )}
      </div>
    );
  }

  return (
  <div className="min-h-full px-6 pt-6 pb-10">
    <div className="flex justify-center">
      <img src={mascot} alt={t("onboarding.mascotAlt")} className="w-28 h-28 object-contain animate-float-slow" />
    </div>

    <h1 className="mt-2 text-[26px] leading-tight font-bold text-foreground">
      {t("onboarding.questionPrefix")}<span className="text-gradient">{t("onboarding.questionHighlight")}</span>
    </h1>
    <p className="mt-2 text-sm text-muted-foreground">{t("onboarding.questionSubtitle")}</p>

    <div className="mt-5 grid grid-cols-2 gap-3">
      {EMOTION_META.map(emotion => {
        const selected = selectedEmotions.includes(emotion.id);
        return (
          <button
            key={emotion.id}
            onClick={() => toggleEmotion(emotion.id)}
            aria-pressed={selected}
            className={`relative flex flex-col items-center text-center gap-1 p-4 rounded-2xl border transition-all active:scale-95 ${
              selected ? "bg-info/10 border-info shadow-glow" : "bg-card border-border"
            }`}
          >
            {selected && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-info text-info-foreground flex items-center justify-center animate-in zoom-in duration-200">
                <Check size={14} strokeWidth={3} />
              </span>
            )}
            <img
              src={emotion.face}
              alt=""
              aria-hidden="true"
              className="w-14 h-14 object-contain"
            />
            <span className="text-sm font-bold leading-tight">{t(`onboarding.emotions.${emotion.id}.name`)}</span>
            <span className="text-[11px] text-muted-foreground leading-snug">{t(`onboarding.emotions.${emotion.id}.description`)}</span>
          </button>
        );
      })}
    </div>

    <h2 className="mt-7 text-sm font-semibold">{t("onboarding.goalsTitle")}</h2>
    <div className="mt-3 space-y-2.5">
      {GOAL_META.map(({ id, icon: Icon }) => {
        const selected = selectedGoals.includes(id);
        return (
          <button
            key={id}
            onClick={() => toggleGoal(id)}
            aria-pressed={selected}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 ${
              selected ? "bg-card border-info shadow-soft" : "bg-card/60 border-border"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected ? "bg-gradient-info text-info-foreground" : "bg-secondary text-primary"}`}>
              <Icon size={18} />
            </div>
            <span className="flex-1 text-sm font-medium text-left">{t(`onboarding.goals.${id}`)}</span>
            {selected && <Check size={18} className="text-info" />}
          </button>
        );
      })}
    </div>

    <button
      disabled={selectedEmotions.length === 0 || selectedGoals.length === 0}
      onClick={confirmSelection}
      className="mt-7 w-full bg-gradient-primary text-primary-foreground font-semibold py-4 rounded-2xl shadow-soft flex items-center justify-center gap-2 disabled:opacity-40">
      {t("onboarding.continue")} <ArrowRight size={18} />
    </button>
  </div>
  );
};
