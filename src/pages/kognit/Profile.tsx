import { Settings, Award, Flame, Brain, Sparkles, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/kognit/BottomNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { ACHIEVEMENTS, isAchievementUnlocked, getAchievementProgress, type AchievementProgress } from "@/data/achievements";
import { subscribeWithCardToken, cancelSubscription, PRO_PRICE_USD, type BillingCycle } from "@/lib/billing";
import { CardPaymentForm } from "@/components/kognit/CardPaymentForm";

interface ProfileProps {
  name?: string;
  email?: string;
  focusLevel?: number;
  emotionalControl?: number;
  totalResets?: number;
  streakDays?: number;
  xp?: number;
  plan?: "free" | "pro";
  planStatus?: string | null;
  onOpenSettings?: () => void;
  autoOpenUpgrade?: boolean;
  onAutoOpenHandled?: () => void;
  onUpgraded?: () => void;
}

// Los defaults de foco/control emocional/email de acá abajo solo se ven en el
// showcase de la landing (Index.tsx renderiza <ProfileScreen /> sin props).
// Un usuario autenticado real siempre recibe estos valores desde MobileApp.tsx,
// que a su vez refleja el default 50 de la columna en Supabase (ver migración inicial).
export const ProfileScreen = ({
  name,
  email = "—",
  focusLevel = 72,
  emotionalControl = 64,
  totalResets = 0,
  streakDays = 0,
  xp = 0,
  plan = "free",
  planStatus = null,
  onOpenSettings,
  autoOpenUpgrade = false,
  onAutoOpenHandled,
  onUpgraded,
}: ProfileProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const displayName = name ?? t("profile.defaultName");
  const [openPlan, setOpenPlan] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [redirecting, setRedirecting] = useState(false);
  const [cardStep, setCardStep] = useState<"idle" | "form" | "submitting">("idle");

  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress>({
    totalResets, streakDays, hasPublicNote: false, hasReceivedReaction: false,
  });

  useEffect(() => {
    setAchievementProgress(p => ({ ...p, totalResets, streakDays }));
  }, [totalResets, streakDays]);

  useEffect(() => {
    if (!user) return;
    supabase.from("notes").select("id, visibility").eq("user_id", user.id).then(async ({ data: myNotes }) => {
      const hasPublicNote = (myNotes ?? []).some(n => n.visibility === "public");
      const noteIds = (myNotes ?? []).map(n => n.id);
      let hasReceivedReaction = false;
      if (noteIds.length) {
        const { data: reactions } = await supabase.from("note_reactions")
          .select("id").in("note_id", noteIds).neq("user_id", user.id).limit(1);
        hasReceivedReaction = (reactions?.length ?? 0) > 0;
      }
      setAchievementProgress(p => ({ ...p, hasPublicNote, hasReceivedReaction }));
    });
  }, [user]);

  // El paso 1 del wizard de registro (Auth.tsx) puede llegar con Pro ya
  // elegido — MobileApp.tsx nos manda derecho al panel de plan con el form
  // de tarjeta abierto en vez de que el usuario tenga que buscarlo.
  useEffect(() => {
    if (!autoOpenUpgrade || plan === "pro") return;
    setOpenPlan(true);
    setCardStep("form");
    onAutoOpenHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenUpgrade]);

  const handleCardToken = async (token: string) => {
    setCardStep("submitting");
    const { ok, status, error } = await subscribeWithCardToken(billingCycle, token);
    if (!ok) {
      toast.error(error ?? t("profile.plan.checkoutError"));
      setCardStep("form");
      return;
    }
    setCardStep("idle");
    toast.success(status === "authorized" ? t("profile.plan.activatedNow") : t("profile.plan.activating"));
    onUpgraded?.();
  };

  const manageSubscription = async () => {
    setRedirecting(true);
    const ok = await cancelSubscription();
    setRedirecting(false);
    if (!ok) { toast.error(t("profile.plan.cancelError")); return; }
    toast.success(t("profile.plan.cancelSuccess"));
  };

  return (
  <div className="min-h-full bg-gradient-hero pb-28 relative">
    <div className="px-6 pt-3 flex items-center justify-between">
      <p className="text-sm font-bold">{t("profile.title")}</p>
      <button onClick={onOpenSettings} aria-label={t("profile.settingsTitle")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center"><Settings size={16} /></button>
    </div>

    <div className="mx-6 mt-4 p-5 rounded-3xl bg-gradient-deep text-primary-foreground shadow-card relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-primary-glow/25 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-2xl font-bold shadow-glow">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-base font-bold">{displayName}</p>
          <p className="text-xs opacity-80">{email}</p>
          {plan === "pro" && (
            <div className="mt-1.5 inline-flex items-center gap-1 bg-white/15 backdrop-blur px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              <Sparkles size={10} /> {t("profile.proBadge")}
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="px-6 mt-4 grid grid-cols-3 gap-3">
      {[
        { icon: Flame, label: t("profile.stats.streak"), value: String(streakDays), c: "text-warning" },
        { icon: Brain, label: t("profile.stats.resets"), value: String(totalResets), c: "text-primary" },
        { icon: Award, label: t("profile.stats.xp"), value: String(xp), c: "text-accent" },
      ].map(s => (
        <div key={s.label} className="p-4 rounded-2xl bg-card shadow-soft text-center">
          <s.icon size={18} className={`${s.c} mx-auto`} />
          <p className="text-lg font-bold mt-1.5">{s.value}</p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>

    <div className="mx-6 mt-4 p-5 rounded-3xl bg-card shadow-soft space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{t("profile.focusLevel")}</p>
          <span className="text-xs font-bold text-primary">{focusLevel}%</span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${focusLevel}%` }} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{t("profile.emotionalControl")}</p>
          <span className="text-xs font-bold text-accent-foreground">{emotionalControl}%</span>
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${emotionalControl}%` }} />
        </div>
      </div>
    </div>

    <div className="px-6 mt-5">
      <h3 className="text-xs font-bold">{t("profile.achievementsTitle")}</h3>
      <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar">
        {ACHIEVEMENTS.map(a => {
          const unlocked = isAchievementUnlocked(a.id, achievementProgress);
          const progress = plan === "pro" && !unlocked ? getAchievementProgress(a.id, achievementProgress) : null;
          return (
            <div key={a.id} className={`relative min-w-[140px] p-4 rounded-2xl bg-card shadow-soft text-center transition-opacity ${unlocked ? "" : "opacity-50 grayscale"}`}>
              {!unlocked && (
                <span className="absolute top-2.5 right-2.5 text-muted-foreground" role="img" aria-label={t("profile.achievementLocked")}>
                  <Lock size={12} />
                </span>
              )}
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-soft flex items-center justify-center text-2xl">{a.emoji}</div>
              <p className="mt-2 text-xs font-bold">{t(`profile.achievementsList.${a.id}.title`)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t(`profile.achievementsList.${a.id}.subtitle`)}</p>
              {progress && (
                <p className="mt-1 text-[10px] font-bold text-primary">
                  {t("profile.achievementProgress", { current: progress.current, total: progress.total })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>

    <div className="mx-6 mt-5 rounded-3xl bg-card shadow-soft overflow-hidden">
      {/* Kognit Pro */}
      <div className="p-4">
        <button onClick={() => setOpenPlan(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Sparkles size={16} /></div>
          <span className="flex-1 text-sm font-semibold text-left">{t("profile.plan.label")}</span>
          <span className="text-xs text-muted-foreground">{plan === "pro" ? t("profile.plan.proTag") : t("profile.plan.freeTag")}</span>
        </button>
        {openPlan && (
          <div className="mt-4 space-y-3">
            {planStatus === "pending" && (
              <p className="text-[11px] text-warning font-semibold bg-warning/10 rounded-xl p-2.5">{t("profile.plan.pendingWarning")}</p>
            )}
            {plan === "pro" ? (
              <>
                <p className="text-[11px] text-muted-foreground">{t("profile.plan.proDescription")}</p>
                <button
                  onClick={manageSubscription}
                  disabled={redirecting}
                  className="w-full bg-secondary font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">
                  {redirecting ? t("profile.plan.redirecting") : t("profile.plan.cancel")}
                </button>
              </>
            ) : (
              <>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                  <li>• {t("profile.plan.perks.cards")}</li>
                  <li>• {t("profile.plan.perks.trend")}</li>
                  <li>• {t("profile.plan.perks.achievements")}</li>
                </ul>
                <div className="flex gap-2 bg-secondary/60 rounded-2xl p-1">
                  {(["monthly", "annual"] as BillingCycle[]).map(cycle => (
                    <button
                      key={cycle}
                      onClick={() => setBillingCycle(cycle)}
                      disabled={cardStep !== "idle"}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 ${
                        billingCycle === cycle ? "bg-gradient-info text-info-foreground shadow-soft" : "text-muted-foreground"
                      }`}>
                      {cycle === "monthly" ? t("profile.plan.monthly") : t("profile.plan.annual")}
                    </button>
                  ))}
                </div>
                {cardStep === "idle" && (
                  <button
                    onClick={() => setCardStep("form")}
                    className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm">
                    {t("profile.plan.upgrade")}
                  </button>
                )}
                {cardStep === "form" && (
                  <CardPaymentForm
                    amount={PRO_PRICE_USD[billingCycle]}
                    onToken={handleCardToken}
                    onCancel={() => setCardStep("idle")}
                  />
                )}
                {cardStep === "submitting" && (
                  <p className="text-xs text-muted-foreground font-semibold text-center py-2.5">{t("profile.plan.processingCard")}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>

    <BottomNav active="profile" />
  </div>
  );
};
