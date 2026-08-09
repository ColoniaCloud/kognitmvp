import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertOctagon, ChevronRight, UserRound, Info } from "lucide-react";
import { MoodIcon, moodMascotSrc } from "@/components/kognit/MoodIcon";
import { Avatar } from "@/components/kognit/Avatar";
import { MOOD_OPTIONS, needsReset, type MoodId } from "@/data/moods";
import { supabase } from "@kognit/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useCalmAnchor } from "@/hooks/use-calm-anchor";
import { toast } from "@kognit/ui/components/sonner";
import mascot from "@kognit/ui/assets/kognit-mascot.png";
import calmAnchorIcon from "@/assets/calm-anchor.png";

interface HomeProps {
  name?: string;
  avatarUrl?: string | null;
  // Primer objetivo elegido en el onboarding (data/mentalCards no aplica acá; ids definidos en Onboarding.tsx).
  primaryGoal?: "calm" | "recover" | "decide" | "resilience";
  onTilt?: () => void;
  onProfile?: () => void;
}

// El explicador largo del ancla se puede abrir desde dos lugares y se rendea
// junto al que lo abrió: un panel al pie de la pantalla no se ve como respuesta
// al `?` de la tarjeta de arriba.
type InfoSource = "hero" | "tile";

const AnchorSteps = () => {
  const { t } = useTranslation();
  const steps = t("home.calmAnchor.steps", { returnObjects: true }) as { title: string; body: string }[];
  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2.5">
      {steps.map((s, i) => (
        <div key={s.title}>
          <p className="text-xs font-bold">{i + 1}. {s.title}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{s.body}</p>
        </div>
      ))}
    </div>
  );
};

export const HomeScreen = ({ name = "\n", avatarUrl = null, primaryGoal, onTilt, onProfile }: HomeProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [mood, setMood] = useState<MoodId | null>(null);
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState<InfoSource | null>(null);

  const { anchor, days, save: saveAnchor } = useCalmAnchor();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingAnchor, setSavingAnchor] = useState(false);
  const anchorTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showReset = needsReset(mood);
  // Sin estado elegido todavía no hay nada que afirmar sobre cómo está el
  // usuario, pero sí se puede ofrecer el ancla: es la variante callada.
  const composing = editing || !anchor;

  const resizeAnchorTextarea = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (anchorTextareaRef.current) resizeAnchorTextarea(anchorTextareaRef.current);
  }, [draft, editing, showReset]);

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

  const submitAnchor = async () => {
    if (savingAnchor) return;
    setSavingAnchor(true);
    const ok = await saveAnchor(draft);
    setSavingAnchor(false);
    if (!ok) {
      toast.error(t("home.contextual.prompt.saveError"));
      return;
    }
    setEditing(false);
    setDraft("");
    toast.success(t("home.contextual.prompt.saveSuccess"));
  };

  const startEditing = () => {
    setDraft(anchor?.phrase ?? "");
    setEditing(true);
    setInfoOpen(null);
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

    {/* SLOT CONTEXTUAL — la mascota del estado elegido y, al lado, lo único que
        tiene sentido ofrecerle a alguien en ese estado: en los estados buenos el
        ancla (definirla o recordarla), en los que piden reset el Reset y nada más.
        El Reset igual queda siempre a mano en los tiles de abajo. */}
    <div className="px-6 mt-5 flex items-start gap-3">
      {/* Cuadrada y de alto fijo: si se estirara a la altura de la tarjeta, con
          el explicador abierto quedaría una caja larguísima con la mascota
          flotando en el medio. */}
      <div className="relative shrink-0 w-[4.5rem] h-[4.5rem] md:w-24 md:h-24 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-primary-glow/20 blur-2xl" />
        <img
          key={mood ?? "default"}
          src={mood ? moodMascotSrc(mood) : mascot}
          alt="kognit"
          className="relative w-[3.25rem] h-[3.25rem] md:w-[4.5rem] md:h-[4.5rem] object-contain animate-float-slow"
        />
      </div>

      {showReset ? (
        <button
          onClick={onTilt}
          className="flex-1 min-w-0 bg-gradient-emergency text-destructive-foreground rounded-2xl p-4 shadow-emergency text-left active:scale-[0.98] transition-transform">
          <p className="text-[11px] md:text-xs leading-snug opacity-95 font-medium">
            {t(`home.contextual.reset.lines.${mood}`)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <AlertOctagon size={22} strokeWidth={2.4} />
            <span className="text-xl font-bold tracking-tight">{t("home.resetTitle")}</span>
            <ChevronRight size={20} className="ml-auto" />
          </div>
        </button>
      ) : (
        <div className="flex-1 min-w-0 rounded-2xl bg-secondary p-4 relative">
          <button
            onClick={() => setInfoOpen(o => (o === "hero" ? null : "hero"))}
            aria-label={t("home.calmAnchor.infoAria")}
            aria-expanded={infoOpen === "hero"}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-card flex items-center justify-center text-muted-foreground">
            <Info size={13} />
          </button>

          <div className="pr-9">
            {mood && (
              <p className="text-[11px] font-bold text-secondary-foreground leading-snug">{t("home.contextual.desiredLead")}</p>
            )}
            <p className="text-[11px] text-muted-foreground leading-snug">
              {composing ? t("home.contextual.prompt.title") : t("home.contextual.set.title")}
            </p>
          </div>

          {composing ? (
            <>
              <textarea
                ref={anchorTextareaRef}
                value={draft}
                onChange={e => { setDraft(e.target.value); resizeAnchorTextarea(e.target); }}
                placeholder={t("home.calmAnchor.subtitle")}
                rows={1}
                className="mt-2 w-full rounded-xl bg-card px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground leading-relaxed outline-none resize-none overflow-hidden shadow-soft"
              />
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={submitAnchor}
                  disabled={savingAnchor || !draft.trim()}
                  className="rounded-xl bg-gradient-primary text-primary-foreground text-[11px] font-bold px-3.5 py-2 disabled:opacity-40 active:scale-[0.98] transition-transform">
                  {t("home.contextual.prompt.save")}
                </button>
                {editing && (
                  <button onClick={() => { setEditing(false); setDraft(""); }} className="text-[11px] font-bold text-muted-foreground">
                    {t("home.contextual.set.cancel")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 rounded-xl bg-card px-3 py-2.5 text-sm font-semibold text-foreground leading-snug shadow-soft break-words">
                {anchor?.phrase}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-semibold">
                <span>
                  {days === 0
                    ? t("home.contextual.set.daysToday")
                    : t("home.contextual.set.days", { count: days })}
                </span>
                <span aria-hidden="true">·</span>
                <button onClick={startEditing} className="font-bold text-primary underline underline-offset-2">
                  {t("home.contextual.set.edit")}
                </button>
              </div>
            </>
          )}

          {infoOpen === "hero" && <AnchorSteps />}
        </div>
      )}
    </div>

    {/* Selector de estado mental: grilla de 3×2 en todos los tamaños. Con seis
        opciones, tres columnas dejan cada card lo bastante ancha como para que la
        ilustración se lea incluso en el ancho de un teléfono. En desktop además
        crecen: más aire, ilustración más grande y etiqueta legible. */}
    <div className="mx-6 mt-5 p-5 md:p-7 rounded-3xl bg-card shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm md:text-base font-bold">{t("home.currentMoodTitle")}</p>
        <span className="text-[10px] md:text-xs text-muted-foreground font-semibold">{t("home.currentMoodHint")}</span>
      </div>
      <div className="mt-3 md:mt-5 grid grid-cols-3 gap-2 md:gap-3">
        {MOOD_OPTIONS.map(({ id }) => (
          <button
            key={id}
            onClick={() => pickMood(id)}
            disabled={saving}
            aria-pressed={mood === id}
            className={`flex flex-col items-center gap-1 md:gap-1.5 py-2 md:py-3 rounded-2xl md:rounded-3xl transition-all disabled:opacity-60 ${
              mood === id
                ? "bg-gradient-info text-info-foreground shadow-soft scale-[1.03]"
                : "bg-secondary text-muted-foreground md:hover:bg-secondary/70"
            }`}
          >
            <MoodIcon mood={id} sizeClassName="w-8 h-8 md:w-11 md:h-11" />
            <span className="text-[10px] md:text-xs font-bold leading-none">{t(`moods.options.${id}`)}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Las dos herramientas de la app, siempre en el mismo lugar y con su
        explicación al lado: son lo bastante abstractas como para que un ícono
        suelto no alcance a decir qué hacen. */}
    <div className="mx-6 mt-5 p-4 rounded-3xl bg-card shadow-card">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setInfoOpen(o => (o === "tile" ? null : "tile"))}
          aria-expanded={infoOpen === "tile"}
          className="rounded-2xl bg-secondary p-3.5 text-left active:scale-[0.98] transition-transform">
          <img src={calmAnchorIcon} alt="" className="w-9 h-9 rounded-xl object-contain" />
          <p className="mt-2 text-sm font-bold leading-tight">{t("home.calmAnchor.title")}</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{t("home.tiles.anchor.body")}</p>
          <p className="mt-1.5 text-[10px] font-bold text-primary">{t("home.calmAnchor.infoLinkLabel")}</p>
        </button>

        <button
          onClick={onTilt}
          className="rounded-2xl bg-gradient-emergency text-destructive-foreground p-3.5 text-left shadow-emergency active:scale-[0.98] transition-transform">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <AlertOctagon size={20} strokeWidth={2.4} />
          </div>
          <p className="mt-2 text-sm font-bold leading-tight">{t("home.resetTitle")}</p>
          <p className="mt-1 text-[11px] opacity-90 leading-snug">{t("home.tiles.reset.body")}</p>
          <p className="mt-1.5 text-[10px] font-bold inline-flex items-center gap-0.5">
            {t("home.tiles.reset.cta")} <ChevronRight size={12} />
          </p>
        </button>
      </div>

      {infoOpen === "tile" && <AnchorSteps />}
    </div>
  </div>
  );
};
