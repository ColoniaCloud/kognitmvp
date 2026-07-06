import { Settings, Award, Flame, Brain, ChevronRight, Bell, Shield, LogOut, Sparkles, Volume2, UserRound, Trash2, X, Moon, Vibrate, Languages, Lock } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { BottomNav } from "@/components/kognit/BottomNav";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playBong } from "@/lib/sound";
import { toast } from "@/components/ui/sonner";
import { ACHIEVEMENTS, isAchievementUnlocked, getAchievementProgress, type AchievementProgress } from "@/data/achievements";
import { enablePushReminders, disablePushReminders } from "@/lib/push";
import { startCheckout, cancelSubscription, type BillingCycle } from "@/lib/billing";
import {
  getDarkMode, setDarkMode, getSoundEnabled, setSoundEnabled, getVibrationEnabled, setVibrationEnabled,
  getLanguage, setLanguage, SUPPORTED_LANGUAGES, type LanguageCode,
} from "@/lib/preferences";

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
  onSignOut?: () => void;
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
  onSignOut,
}: ProfileProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const resolvedName = name ?? t("profile.defaultName");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("19:00");
  const [openReminders, setOpenReminders] = useState(false);
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);
  const [openPlan, setOpenPlan] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [redirecting, setRedirecting] = useState(false);

  const [displayName, setDisplayName] = useState(resolvedName);
  const [openEditProfile, setOpenEditProfile] = useState(false);
  const [editName, setEditName] = useState(resolvedName);
  const [savingName, setSavingName] = useState(false);

  const [openPrivacy, setOpenPrivacy] = useState(false);

  const [openPreferences, setOpenPreferences] = useState(false);
  const [darkMode, setDarkModeState] = useState(getDarkMode);
  const [soundPref, setSoundPref] = useState(getSoundEnabled);
  const [vibrationPref, setVibrationPref] = useState(getVibrationEnabled);
  const [languagePref, setLanguagePref] = useState(getLanguage);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress>({
    totalResets, streakDays, hasPublicNote: false, hasReceivedReaction: false,
  });

  useEffect(() => { setDisplayName(resolvedName); setEditName(resolvedName); }, [resolvedName]);
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

  const playTestSound = () => {
    playBong();
    setSoundFeedback(t("profile.testSound.playing"));
    window.setTimeout(() => setSoundFeedback(null), 1800);
  };

  useEffect(() => {

    if (!user) return;
    supabase.from("profiles").select("reminder_enabled, reminder_time").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setReminderEnabled(!!data.reminder_enabled);
          setReminderTime(data.reminder_time ?? "19:00");
        }
      });
  }, [user]);

  const saveReminders = async (enabled: boolean, time: string) => {
    if (!user) { setReminderEnabled(enabled); setReminderTime(time); return; }

    if (enabled) {
      const subscribed = await enablePushReminders(user.id);
      if (!subscribed) {
        toast.error(t("profile.reminders.pushDenied"));
        return; // el Switch vuelve solo a su valor anterior al no cambiar el estado
      }
    } else {
      await disablePushReminders(user.id);
    }

    setReminderEnabled(enabled); setReminderTime(time);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await supabase.from("profiles")
      .update({ reminder_enabled: enabled, reminder_time: time, reminder_timezone: timezone })
      .eq("id", user.id);
  };

  const saveName = async () => {
    if (!user || !editName.trim()) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ display_name: editName.trim() }).eq("id", user.id);
    setSavingName(false);
    if (error) {
      toast.error(t("profile.toasts.nameSaveError"));
      return;
    }
    setDisplayName(editName.trim());
    toast.success(t("profile.toasts.nameSaveSuccess"));
    setOpenEditProfile(false);
  };

  const toggleDarkMode = (v: boolean) => {
    setDarkModeState(v);
    setDarkMode(v);
  };
  const toggleSoundPref = (v: boolean) => {
    setSoundPref(v);
    setSoundEnabled(v);
  };
  const toggleVibrationPref = (v: boolean) => {
    setVibrationPref(v);
    setVibrationEnabled(v);
  };
  const changeLanguage = (code: LanguageCode) => {
    setLanguagePref(code);
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const upgradeToPro = async () => {
    setRedirecting(true);
    const url = await startCheckout(billingCycle);
    setRedirecting(false);
    if (!url) { toast.error(t("profile.plan.checkoutError")); return; }
    window.location.href = url;
  };

  const manageSubscription = async () => {
    setRedirecting(true);
    const ok = await cancelSubscription();
    setRedirecting(false);
    if (!ok) { toast.error(t("profile.plan.cancelError")); return; }
    toast.success(t("profile.plan.cancelSuccess"));
  };

  const deleteAccount = async () => {
    if (!user || deleteConfirmText !== t("profile.deleteAccount.confirmWord")) return;
    setDeleting(true);
    try {
      const { data: files } = await supabase.storage.from("note-images").list(user.id);
      if (files?.length) {
        await supabase.storage.from("note-images").remove(files.map(f => `${user.id}/${f.name}`));
      }
      await disablePushReminders(user.id);
      await cancelSubscription();
      await Promise.all([
        supabase.from("notes").delete().eq("user_id", user.id),
        supabase.from("note_reactions").delete().eq("user_id", user.id),
        supabase.from("reset_sessions").delete().eq("user_id", user.id),
        supabase.from("ritual_entries").delete().eq("user_id", user.id),
        supabase.from("messages").delete().eq("sender_id", user.id),
        supabase.from("messages").delete().eq("recipient_id", user.id),
        supabase.from("push_subscriptions").delete().eq("user_id", user.id),
        supabase.from("profiles").delete().eq("id", user.id),
      ]);
      toast.success(t("profile.toasts.deleteSuccess"));
    } catch {
      toast.error(t("profile.toasts.deleteError"));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteConfirmText("");
      onSignOut?.();
    }
  };

  return (
  <div className="min-h-full bg-gradient-hero pb-28 relative">
    <div className="px-6 pt-3 flex items-center justify-between">
      <p className="text-sm font-bold">{t("profile.title")}</p>
      <button onClick={() => setOpenPreferences(o => !o)} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center"><Settings size={16} /></button>
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
          <span className="text-xs font-bold text-accent">{emotionalControl}%</span>
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
                <span className="absolute top-2.5 right-2.5 text-muted-foreground" aria-label={t("profile.achievementLocked")}>
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
      {/* Editar perfil */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setOpenEditProfile(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><UserRound size={16} /></div>
          <span className="flex-1 text-sm font-semibold text-left">{t("profile.editProfile.label")}</span>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${openEditProfile ? "rotate-90" : ""}`} />
        </button>
        {openEditProfile && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm font-semibold">{t("profile.editProfile.nameLabel")}</p>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("profile.editProfile.namePlaceholder")}
                className="mt-1.5 w-full bg-secondary px-3 py-2 rounded-lg text-sm font-semibold focus:outline-none"
              />
            </div>
            <button
              onClick={saveName}
              disabled={!editName.trim() || savingName}
              className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">
              {savingName ? t("profile.editProfile.saving") : t("profile.editProfile.save")}
            </button>
          </div>
        )}
      </div>

      {/* Recordatorio diario */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setOpenReminders(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Bell size={16} /></div>
          <span className="flex-1 text-sm font-semibold text-left">{t("profile.reminders.label")}</span>
          <span className="text-xs text-muted-foreground">{reminderEnabled ? reminderTime : t("profile.reminders.off")}</span>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${openReminders ? "rotate-90" : ""}`} />
        </button>
        {openReminders && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{t("profile.reminders.enableLabel")}</p>
                <p className="text-[11px] text-muted-foreground">{t("profile.reminders.enableHint")}</p>
              </div>
              <Switch checked={reminderEnabled} onCheckedChange={(v) => saveReminders(v, reminderTime)} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t("profile.reminders.scheduleLabel")}</p>
              <input type="time" value={reminderTime}
                onChange={(e) => saveReminders(reminderEnabled, e.target.value)}
                className="bg-secondary px-3 py-1.5 rounded-lg text-sm font-semibold focus:outline-none" />
            </div>
            <p className="text-[11px] text-muted-foreground italic">{t("profile.reminders.quote")}</p>
          </div>
        )}
      </div>

      {/* Probar sonido */}
      <button
        onClick={playTestSound}
        aria-label={t("profile.testSound.aria")}
        className="w-full flex items-center gap-3 p-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Volume2 size={16} /></div>
        <span className="flex-1 text-sm font-semibold text-left">{t("profile.testSound.label")}</span>
        <span className="text-xs text-primary font-semibold">{soundFeedback ?? t("profile.testSound.cta")}</span>
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>

      {/* Kognit Pro */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setOpenPlan(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Sparkles size={16} /></div>
          <span className="flex-1 text-sm font-semibold text-left">{t("profile.plan.label")}</span>
          <span className="text-xs text-muted-foreground">{plan === "pro" ? t("profile.plan.proTag") : t("profile.plan.freeTag")}</span>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${openPlan ? "rotate-90" : ""}`} />
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
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        billingCycle === cycle ? "bg-gradient-info text-info-foreground shadow-soft" : "text-muted-foreground"
                      }`}>
                      {cycle === "monthly" ? t("profile.plan.monthly") : t("profile.plan.annual")}
                    </button>
                  ))}
                </div>
                <button
                  onClick={upgradeToPro}
                  disabled={redirecting}
                  className="w-full bg-gradient-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm disabled:opacity-40">
                  {redirecting ? t("profile.plan.redirecting") : t("profile.plan.upgrade")}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preferencias */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setOpenPreferences(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Settings size={16} /></div>
          <span className="flex-1 text-sm font-semibold text-left">{t("profile.preferences.label")}</span>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${openPreferences ? "rotate-90" : ""}`} />
        </button>
        {openPreferences && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Moon size={15} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{t("profile.preferences.darkMode")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profile.preferences.darkModeHint")}</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 size={15} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{t("profile.preferences.soundDefault")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profile.preferences.soundDefaultHint")}</p>
                </div>
              </div>
              <Switch checked={soundPref} onCheckedChange={toggleSoundPref} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Vibrate size={15} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{t("profile.preferences.vibration")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profile.preferences.vibrationHint")}</p>
                </div>
              </div>
              <Switch checked={vibrationPref} onCheckedChange={toggleVibrationPref} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Languages size={15} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">{t("profile.preferences.language")}</p>
                  <p className="text-[11px] text-muted-foreground">{t("profile.preferences.languageHint")}</p>
                </div>
              </div>
              <Select value={languagePref} onValueChange={changeLanguage}>
                <SelectTrigger className="w-32 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Privacidad */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setOpenPrivacy(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Shield size={16} /></div>
          <span className="flex-1 text-sm font-semibold text-left">{t("profile.privacy.label")}</span>
          <ChevronRight size={16} className={`text-muted-foreground transition-transform ${openPrivacy ? "rotate-90" : ""}`} />
        </button>
        {openPrivacy && (
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            {t("profile.privacy.text")}
          </p>
        )}
      </div>

      {/* Cerrar sesión */}
      <button onClick={onSignOut}
        className="w-full flex items-center gap-3 p-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><LogOut size={16} /></div>
        <span className="flex-1 text-sm font-semibold text-left">{t("profile.signOut")}</span>
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>

      {/* Eliminar cuenta */}
      <button onClick={() => setDeleteOpen(true)}
        className="w-full flex items-center gap-3 p-4 text-destructive">
        <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center"><Trash2 size={16} /></div>
        <span className="flex-1 text-sm font-semibold text-left">{t("profile.deleteAccount.label")}</span>
        <ChevronRight size={16} className="text-muted-foreground" />
      </button>
    </div>

    <BottomNav active="profile" />

    {deleteOpen && (
      <div className="absolute inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center">
        <div className="w-full bg-card rounded-t-3xl md:rounded-3xl shadow-card p-5 max-h-[85%] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-destructive">{t("profile.deleteAccount.title")}</p>
            <button onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); }} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <X size={14} />
            </button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
            {t("profile.deleteAccount.warning")}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed italic">
            {t("profile.deleteAccount.technicalNote")}
          </p>

          <p className="mt-4 text-xs font-semibold"><Trans i18nKey="profile.deleteAccount.confirmPrompt" components={{ b: <span className="font-bold" /> }} /></p>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={t("profile.deleteAccount.confirmWord")}
            className="mt-2 w-full bg-secondary px-3 py-2.5 rounded-lg text-sm font-semibold focus:outline-none"
          />

          <button
            onClick={deleteAccount}
            disabled={deleteConfirmText !== t("profile.deleteAccount.confirmWord") || deleting}
            className="mt-4 w-full bg-destructive text-destructive-foreground font-bold py-3.5 rounded-2xl text-sm shadow-card disabled:opacity-40">
            {deleting ? t("profile.deleteAccount.deleting") : t("profile.deleteAccount.cta")}
          </button>
        </div>
      </div>
    )}
  </div>
  );
};
