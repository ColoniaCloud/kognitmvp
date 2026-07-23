import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronRight, Volume2, VolumeX, Plus } from "lucide-react";
import mascot from "@/assets/kognit-mascot.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { playBong } from "@/lib/sound";
import { getSoundEnabled, getVibrationEnabled } from "@/lib/preferences";
import { PATTERNS, advanceBreathPhase, type Mode } from "@/lib/tiltEngine";


interface TiltProps { onExit?: () => void; }

type Stage = "intro" | "pulse" | "breathe" | "grounding" | "state" | "check" | "exit";

const STATE_IDS = ["frustration", "anxiety", "impatience", "fatigue", "overconfidence", "distraction", "fear"] as const;

export const TiltScreen = ({ onExit }: TiltProps) => {
  const { t } = useTranslation();
  const GROUNDING_Q = useMemo(() => t("tilt.grounding.questions", { returnObjects: true }) as { q: string; options: string[] }[], [t]);
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("intro");
  const [mode, setMode] = useState<Mode>("deep");
  const [sound, setSound] = useState(getSoundEnabled);

  // breathing state
  const [cycle, setCycle] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(1);
  const [extraCycles, setExtraCycles] = useState(0);

  // grounding state
  const enteredGrounding = stage === "grounding";
  // eslint-disable-next-line react-hooks/exhaustive-deps -- enteredGrounding intentionally re-triggers the random pick on entering this stage
  const groundingQs = useMemo(() => [GROUNDING_Q[Math.floor(Math.random() * GROUNDING_Q.length)], GROUNDING_Q[Math.floor(Math.random() * GROUNDING_Q.length)]], [enteredGrounding, GROUNDING_Q]);
  const [gIdx, setGIdx] = useState(0);

  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const [preIntensity, setPreIntensity] = useState(6);
  const [postIntensity, setPostIntensity] = useState(4);
  const sessionSavedRef = useRef(false);

  const primaryState = selectedStates[0] ?? null;
  const exitText = useMemo(() => {
    const pool = primaryState
      ? (t(`tilt.state.messages.${primaryState}`, { returnObjects: true }) as string[])
      : [t("tilt.defaultExitMessage")];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [primaryState, stage === "exit", t]);

  const toggleState = (s: string) => {
    setSelectedStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const confirmStates = () => {
    if (selectedStates.length === 0) return;
    setStage("check");
  };

  const finishReset = async () => {
    if (user && !sessionSavedRef.current) {
      sessionSavedRef.current = true;
      await supabase.from("reset_sessions").insert({
        user_id: user.id,
        state: primaryState,
        states: selectedStates,
        mode,
        pre_intensity: preIntensity,
        post_intensity: postIntensity,
        note: customNote.trim() || null,
      });
    }
    setStage("exit");
  };

  const vibrate = (ms: number | number[]) => {
    if (!getVibrationEnabled()) return;
    try { (navigator as any).vibrate?.(ms); } catch {}
  };

  const beep = (freq = 660) => {
    if (!sound) return;
    playBong(freq);
  };


  // Breathing engine
  useEffect(() => {
    if (stage !== "breathe") return;
    const pattern = PATTERNS[mode];
    const secs = pattern.secs[phaseIdx];
    if (count === 1) {
      beep(phaseIdx === 0 ? 740 : phaseIdx === 1 ? 520 : 420);
      vibrate(phaseIdx === 1 ? 25 : 60);
    }
    if (count >= secs) {
      const timer = setTimeout(() => {
        const result = advanceBreathPhase(pattern, { cycle, phaseIdx }, extraCycles);
        if (result.done) {
          setStage("grounding");
          setCycle(0); setPhaseIdx(0); setCount(1);
          return;
        }
        setCycle(result.cycle); setPhaseIdx(result.phaseIdx); setCount(1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setCount(c => c + 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, count, phaseIdx, cycle, mode, extraCycles]);

  const startBreath = (m: Mode) => {
    setMode(m);
    setStage("pulse");
    setCycle(0); setPhaseIdx(0); setCount(1);
    setExtraCycles(0);
    sessionSavedRef.current = false;
  };

  const pattern = PATTERNS[mode];
  const phase = pattern.phases[phaseIdx];
  const phaseSecs = pattern.secs[phaseIdx];
  const scale = phase === "in" ? 0.7 + (count / phaseSecs) * 0.55 : phase === "out" ? 1.25 - (count / phaseSecs) * 0.55 : 1.25;
  const totalCycles = pattern.cycles + extraCycles;
  const delta = preIntensity - postIntensity;

  return (
    <div className="h-full flex flex-col overflow-hidden text-primary-foreground relative">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-primary-glow/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-primary/30 blur-3xl" />

      {/* Header */}
      <div className="relative shrink-0 px-6 pt-3 flex items-center justify-between">
        <button onClick={onExit} aria-label={t("tilt.exitAria")} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
          <X size={18} />
        </button>
        <span className="text-[10px] font-bold opacity-80 tracking-[0.25em]">{t("tilt.header")}</span>
        <button onClick={() => setSound(s => !s)} aria-label={sound ? t("tilt.muteAria") : t("tilt.unmuteAria")} aria-pressed={sound} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
          {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* INTRO — pick mode */}
      {stage === "intro" && (
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pt-4">
          <div className="flex justify-center">
          <img src={mascot} alt="" aria-hidden="true" className="animate-float-slow w-28 h-28 object-contain drop-shadow-[0_8px_30px_rgba(86,179,210,0.35)]" />
          </div>

          <div className="mt-5 space-y-3">
            <div className="w-full bg-gradient-emergency text-destructive-foreground rounded-2xl p-4 shadow-emergency text-center">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-current animate-breathe" style={{ animationDuration: "8s" }} />
                <span className="text-xs font-bold tracking-widest">{t("tilt.patternLabels.fast")}</span>
              </div>
              <p className="mt-2 text-lg font-bold">{t("tilt.fastMode.title")}</p>
              <p className="text-xs opacity-90 mt-1">{t("tilt.fastMode.subtitle")}</p>
              <button onClick={() => startBreath("fast")}
                className="mt-4 w-full bg-white/15 backdrop-blur font-bold py-3 rounded-xl active:scale-[0.98] transition-transform">
                {t("tilt.fastMode.cta")}
              </button>
            </div>

            <div className="w-full bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-4 text-center">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-primary-glow animate-breathe" style={{ animationDuration: "15s" }} />
                <span className="text-xs font-bold tracking-widest">{t("tilt.patternLabels.deep")}</span>
              </div>
              <p className="mt-2 text-lg font-bold">{t("tilt.deepMode.title")}</p>
              <p className="text-xs opacity-80 mt-1">{t("tilt.deepMode.subtitle")}</p>
              <button onClick={() => startBreath("deep")}
                className="mt-4 w-full bg-primary-foreground text-foreground font-bold py-3 rounded-xl active:scale-[0.98] transition-transform">
                {t("tilt.deepMode.cta")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BREATHING */}
      {stage === "breathe" && (
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6">
          <div className="mt-5 flex justify-center gap-1.5">
            {Array.from({ length: totalCycles }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i < cycle ? "w-8 bg-primary-glow" : i === cycle ? "w-10 bg-primary-glow shadow-glow" : "w-4 bg-white/25"}`} />
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <div className="absolute -inset-10 rounded-full bg-primary-glow/25 blur-3xl" />
              <div
                className="absolute inset-0 rounded-full bg-primary-glow/25"
                style={{ transform: `scale(${scale})`, transition: `transform 1s ease-in-out` }}
              />
              <div
                className="absolute inset-6 rounded-full bg-primary-glow/40"
                style={{ transform: `scale(${scale})`, transition: `transform 1s ease-in-out` }}
              />
              <div
                className="absolute inset-12 rounded-full bg-gradient-primary shadow-glow ring-4 ring-primary-glow/30"
                style={{ transform: `scale(${scale})`, transition: `transform 1s ease-in-out` }}
              />
              <div className="relative text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] opacity-80 font-bold">{t(`tilt.phases.${phase}`)}</p>
                <p className="text-6xl font-bold mt-1">{count}</p>
                <p className="text-[10px] opacity-70 mt-1">{t("tilt.of")} {phaseSecs}</p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs opacity-70 font-semibold tracking-widest">{t("tilt.patternCycleLabel", { pattern: t(`tilt.patternLabels.${mode}`), current: cycle + 1, total: totalCycles })}</p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => setExtraCycles(n => n + 1)}
              aria-label={t("tilt.extendCycleAria")}
              className="inline-flex items-center gap-1.5 text-xs opacity-90 bg-white/10 backdrop-blur border border-white/15 rounded-full px-3 py-1.5">
              <Plus size={12} /> {t("tilt.extendCycle")}
            </button>
            <button onClick={() => setStage("grounding")} className="text-xs opacity-80 underline-offset-4 underline">
              {t("tilt.skipToGrounding")}
            </button>
          </div>
        </div>
      )}

      {/* GROUNDING */}
      {stage === "grounding" && (() => {
        const q = groundingQs[gIdx];
        return (
          <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pt-6">
            <p className="text-center text-[10px] uppercase tracking-[0.3em] opacity-70 font-bold">{t("tilt.grounding.eyebrow")} · {gIdx + 1}/2</p>
            <h2 className="mt-3 text-center text-2xl font-bold leading-tight px-2">{q.q}</h2>
            <p className="mt-3 text-center text-xs opacity-75 px-4">{t("tilt.grounding.hint")}</p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {q.options.map(opt => (
                <button key={opt}
                  onClick={() => {
                    if (gIdx < groundingQs.length - 1) setGIdx(gIdx + 1);
                    else setStage("state");
                  }}
                  className="p-5 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-sm font-bold text-left active:scale-95 transition-transform">
                  {opt}
                </button>
              ))}
            </div>

            <p className="mt-8 text-center text-[11px] opacity-60 px-6">
              {t("tilt.grounding.footer")}
            </p>
          </div>
        );
      })()}

      {/* STATE — pick what you're feeling */}
      {stage === "state" && (
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pt-6">
          <p className="text-center text-[10px] uppercase tracking-[0.3em] opacity-70 font-bold">{t("tilt.state.eyebrow")}</p>
          <h2 className="mt-2 text-center text-xl font-bold leading-tight px-4">{t("tilt.state.title")}</h2>
          <p className="mt-2 text-center text-xs opacity-75 px-6">{t("tilt.state.subtitle")}</p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            {STATE_IDS.map(id => {
              const active = selectedStates.includes(id);
              return (
                <button key={id} onClick={() => toggleState(id)} aria-pressed={active}
                  className={`p-4 rounded-2xl border text-sm font-bold active:scale-95 transition-all ${
                    active ? "bg-info/30 border-info shadow-glow" : "bg-white/10 backdrop-blur border-white/15"
                  }`}>
                  {t(`tilt.state.options.${id}`)}
                </button>
              );
            })}
          </div>

          <textarea
            value={customNote}
            onChange={e => setCustomNote(e.target.value)}
            placeholder={t("tilt.state.notePlaceholder")}
            rows={2}
            maxLength={200}
            className="mt-4 w-full bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-3 text-sm placeholder:text-white/50 focus:outline-none resize-none"
          />

          <button
            onClick={confirmStates}
            disabled={selectedStates.length === 0}
            className="mt-4 w-full bg-primary-foreground text-foreground font-bold py-3.5 rounded-2xl disabled:opacity-40">
            {t("tilt.state.continue")}
          </button>
        </div>
      )}

      {/* PULSE — pre intensity */}
      {stage === "pulse" && (
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pt-8">
          <p className="text-center text-[10px] uppercase tracking-[0.3em] opacity-70 font-bold">{t("tilt.pulse.eyebrow")}</p>
          <h2 className="mt-2 text-center text-xl font-bold leading-tight px-4">{t("tilt.pulse.title")}</h2>
          <p className="mt-2 text-center text-xs opacity-75 px-6">{t("tilt.pulse.subtitle")}</p>

          <div className="mt-10 text-center">
            <p className="text-7xl font-bold leading-none">{preIntensity}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest opacity-70 font-bold">{t("tilt.of")} 10</p>
          </div>

          <input
            type="range" min={1} max={10} value={preIntensity}
            onChange={e => setPreIntensity(parseInt(e.target.value, 10))}
            aria-label={t("tilt.pulse.sliderAria")}
            className="mt-8 w-full accent-primary-glow"
          />
          <div className="mt-1 flex justify-between text-[10px] opacity-60 font-semibold">
            <span>{t("tilt.pulse.low")}</span><span>{t("tilt.pulse.high")}</span>
          </div>

          <button
            onClick={() => setStage("breathe")}
            className="mt-8 w-full bg-primary-foreground text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-glow">
            {t("tilt.pulse.cta")} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* CHECK — post intensity */}
      {stage === "check" && (
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pt-8">
          <p className="text-center text-[10px] uppercase tracking-[0.3em] opacity-70 font-bold">{t("tilt.check.eyebrow")}</p>
          <h2 className="mt-2 text-center text-xl font-bold leading-tight px-4">{t("tilt.check.title")}</h2>
          <p className="mt-2 text-center text-xs opacity-75 px-6">{t("tilt.check.subtitle")}</p>

          <div className="mt-8 text-center">
            <p className="text-7xl font-bold leading-none">{postIntensity}</p>
            <p className="mt-1 text-[10px] uppercase tracking-widest opacity-70 font-bold">{t("tilt.of")} 10</p>
          </div>

          <input
            type="range" min={1} max={10} value={postIntensity}
            onChange={e => setPostIntensity(parseInt(e.target.value, 10))}
            aria-label={t("tilt.check.sliderAria")}
            className="mt-6 w-full accent-primary-glow"
          />
          <div className="mt-1 flex justify-between text-[10px] opacity-60 font-semibold">
            <span>{t("tilt.check.low")}</span><span>{t("tilt.check.high")}</span>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-center">
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{t("tilt.check.changeLabel")}</p>
            <p className="mt-1 text-2xl font-bold">
              {delta > 0 ? `−${delta}` : delta < 0 ? `+${Math.abs(delta)}` : "0"} {t("tilt.check.points")}
            </p>
            <p className="text-[11px] opacity-75 mt-0.5">
              {delta >= 3 ? t("tilt.check.feedbackStrong") : delta > 0 ? t("tilt.check.feedbackSome") : t("tilt.check.feedbackNone")}
            </p>
          </div>

          <button onClick={finishReset}
            className="mt-6 w-full bg-primary-foreground text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-glow">
            {t("tilt.check.cta")} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* EXIT */}
      {stage === "exit" && (
        <div className="relative flex-1 min-h-0 overflow-y-auto px-6 pt-8 flex flex-col items-center">
          <img src={mascot} alt="" aria-hidden="true" className="animate-float-slow w-28 h-28 object-contain drop-shadow-[0_8px_30px_rgba(86,179,210,0.4)]" />
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] opacity-70 font-bold">{t("tilt.exit.eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-bold text-center leading-tight">{t("tilt.exit.title")}</h2>

          <div className="mt-6 mx-2 p-5 rounded-3xl bg-white/10 backdrop-blur border border-white/15 w-full">
            <p className="text-[10px] uppercase tracking-widest opacity-70 font-bold">{t("tilt.exit.instructionLabel")}</p>
            <p className="mt-2 text-lg font-bold leading-snug">"{exitText}"</p>
            {selectedStates.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedStates.map(s => (
                  <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15">{t(`tilt.state.options.${s}`)}</span>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-between text-[10px] opacity-70 font-semibold">
              <span>{t("tilt.exit.before", { value: preIntensity })}</span>
              <span>{t("tilt.exit.after", { value: postIntensity })}</span>
            </div>
          </div>

          <div className="mt-6 w-full space-y-3">
            <button onClick={onExit}
              className="w-full bg-primary-foreground text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-glow">
              {t("tilt.exit.backHome")} <ChevronRight size={18} />
            </button>
            <button onClick={() => {
              setStage("intro");
              setSelectedStates([]); setCustomNote(""); setExtraCycles(0);
              sessionSavedRef.current = false;
            }} className="w-full text-sm opacity-80 font-medium py-2">
              {t("tilt.exit.repeat")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
