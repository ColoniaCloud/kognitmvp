import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertOctagon, Layers, ChevronRight, UserRound, TrendingUp, Info } from "lucide-react";
import { MoodIcon, moodMascotSrc } from "@/components/kognit/MoodIcon";
import { Avatar } from "@/components/kognit/Avatar";
import { MOOD_OPTIONS, type MoodId } from "@/data/moods";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { getCalmAnchorPhrase, setCalmAnchorPhrase } from "@/lib/preferences";
import mascot from "@/assets/kognit-mascot.png";
import calmAnchorIcon from "@/assets/calm-anchor.png";

interface HomeProps {
  name?: string;
  avatarUrl?: string | null;
  // Primer objetivo elegido en el onboarding (data/mentalCards no aplica acá; ids definidos en Onboarding.tsx).
  primaryGoal?: "calm" | "recover" | "decide" | "resilience";
  onTilt?: () => void;
  onCards?: () => void;
  onProgress?: () => void;
  onProfile?: () => void;
}

export const HomeScreen = ({ name = "\n", avatarUrl = null, primaryGoal, onTilt, onCards, onProgress, onProfile }: HomeProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [saving, setSaving] = useState(false);
  const [anchorInfoOpen, setAnchorInfoOpen] = useState(false);
  const [anchorPhrase, setAnchorPhrase] = useState(() => getCalmAnchorPhrase());
  const anchorTextareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeAnchorTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleAnchorPhraseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnchorPhrase(value);
    setCalmAnchorPhrase(value);
    resizeAnchorTextarea(e.target);
  };

  useEffect(() => {
    if (anchorTextareaRef.current) resizeAnchorTextarea(anchorTextareaRef.current);
  }, []);

  useEffect(() => {
    if (!user) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    supabase
      .from("notes")
      .select("mood")
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data?.mood && setMood(data.mood as MoodId));
  }, [user]);

  const pickMood = async (id: MoodId) => {
    if (saving) return;
    setMood(id);
    if (!user) return; // showcase sin login (landing): solo cambia el personaje, no persiste
    const label = t(`moods.options.${id}`);
    setSaving(true);
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      mood: id,
      content: t("home.moodNoteContent", { label }),
      visibility: "private",
    });
    setSaving(false);
    if (error) {
      toast.error(t("home.toasts.saveError"));
      return;
    }
    toast.success(t("home.toasts.saveSuccess"));
  };

  return (
  <div className="min-h-full pb-28 md:pb-10">
    <div className="px-6 pt-3 flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("home.activeSession")}</p>
        <h1 className="text-xl font-bold">{name}</h1>
      </div>
      <button onClick={onProfile} aria-label={t("home.profileAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center text-primary overflow-hidden">
        {name.trim() ? (
          <Avatar src={avatarUrl} name={name.trim()} size={40} shape="circle" className="text-sm" />
        ) : (
          <UserRound size={16} />
        )}
      </button>
    </div>

    {primaryGoal && (
      <p className="px-6 mt-1 text-xs text-muted-foreground">{t(`home.goalMessages.${primaryGoal}`)}</p>
    )}

    {/* Mascota protagonista — refleja el estado mental elegido */}
    <div className="flex justify-center mt-2 relative">
      <div className="absolute top-6 w-44 h-44 rounded-full bg-primary-glow/25 blur-3xl" />
      <img
        key={mood ?? "default"}
        src={mood ? moodMascotSrc(mood) : mascot}
        alt="kognit"
        className="relative w-28 h-28 object-contain animate-float-slow"
      />
    </div>

    <div className="mx-6 mt-2 p-5 rounded-3xl bg-card shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">{t("home.currentMoodTitle")}</p>
        <span className="text-[10px] text-muted-foreground font-semibold">{t("home.currentMoodHint")}</span>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {MOOD_OPTIONS.map(({ id }) => (
          <button
            key={id}
            onClick={() => pickMood(id)}
            disabled={saving}
            aria-pressed={mood === id}
            className={`flex flex-col items-center gap-1 py-2 rounded-2xl transition-all disabled:opacity-60 ${
              mood === id ? "bg-gradient-info text-info-foreground shadow-soft scale-[1.03]" : "bg-secondary text-muted-foreground"
            }`}
          >
            <MoodIcon mood={id} size={18} />
            <span className="text-[9px] font-bold leading-none">{t(`moods.options.${id}`)}</span>
          </button>
        ))}
      </div>
    </div>

    {/* ACCIÓN PRINCIPAL — RESET DE TILT */}
    <div className="mx-6 mt-5 relative">
      <div className="absolute inset-0 rounded-3xl bg-destructive/30 animate-pulse-ring" />
      <button onClick={onTilt}
        className="relative w-full bg-gradient-emergency text-destructive-foreground rounded-3xl p-6 shadow-emergency flex items-center gap-4 active:scale-[0.98] transition-transform">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
          <AlertOctagon size={32} strokeWidth={2.4} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[10px] uppercase tracking-[0.25em] opacity-90 font-bold">{t("home.protocolLabel")}</p>
          <p className="text-xl font-bold leading-tight mt-0.5">{t("home.resetTitle")}</p>
          <p className="text-xs opacity-90 mt-0.5">{t("home.resetSubtitle")}</p>
        </div>
        <ChevronRight size={26} />
      </button>
    </div>

    {/* ANCLA DE CALMA — técnica de anclaje (PNL), siempre visible */}
    <div className="px-6 mt-5">
      <div className="p-4 rounded-2xl bg-card shadow-soft relative overflow-hidden">
        <button
          onClick={() => setAnchorInfoOpen(o => !o)}
          aria-label={t("home.calmAnchor.infoAria")}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
          <Info size={13} />
        </button>
        <div className="flex items-center gap-3 pr-8">
          <img src={calmAnchorIcon} alt="" className="w-10 h-10 rounded-xl object-contain bg-secondary shrink-0" />
          <div>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{t("home.calmAnchor.eyebrow")}</p>
            <p className="text-sm font-bold leading-tight">{t("home.calmAnchor.title")}</p>
          </div>
        </div>
        <textarea
          ref={anchorTextareaRef}
          value={anchorPhrase}
          onChange={handleAnchorPhraseChange}
          placeholder={t("home.calmAnchor.subtitle")}
          rows={1}
          className="mt-2.5 w-full bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground leading-relaxed outline-none resize-none overflow-hidden"
        />

        {anchorInfoOpen && (
          <div className="mt-3 pt-3 border-t border-border space-y-2.5">
            {(t("home.calmAnchor.steps", { returnObjects: true }) as { title: string; body: string }[]).map((s, i) => (
              <div key={s.title}>
                <p className="text-xs font-bold">{i + 1}. {s.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{s.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* SECUNDARIAS */}
    <div className="px-6 mt-5">
      <ToolCard icon={Layers} title={t("home.mentalCardsTitle")} subtitle={t("home.mentalCardsSubtitle")} onClick={onCards} wide />
    </div>
    <div className="px-6 mt-3">
      <ToolCard icon={TrendingUp} title={t("home.progressTitle")} subtitle={t("home.progressSubtitle")} onClick={onProgress} wide />
    </div>
  </div>
  );
};

const ToolCard = ({ icon: Icon, title, subtitle, gradient, wide, onClick }: any) => (
  <button onClick={onClick} className={`p-4 rounded-2xl text-left transition-all active:scale-95 ${gradient ? "bg-gradient-primary text-primary-foreground shadow-soft" : "bg-card shadow-soft"} ${wide ? "w-full flex items-center gap-3" : ""}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${wide ? "shrink-0" : "mb-3"} ${gradient ? "bg-white/20" : "bg-secondary text-primary"}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-sm font-bold leading-tight">{title}</p>
      <p className={`text-[11px] mt-0.5 ${gradient ? "opacity-90" : "text-muted-foreground"}`}>{subtitle}</p>
    </div>
  </button>
);
