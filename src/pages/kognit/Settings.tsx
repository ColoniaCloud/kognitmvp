import { ChevronLeft, ChevronRight, Bell, Shield, LogOut, Volume2, UserRound, Trash2, X, Moon, Vibrate, Languages } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { playBong } from "@/lib/sound";
import { toast } from "@/components/ui/sonner";
import { enablePushReminders, disablePushReminders } from "@/lib/push";
import { cancelSubscription } from "@/lib/billing";
import {
  getDarkMode, setDarkMode, getSoundEnabled, setSoundEnabled, getVibrationEnabled, setVibrationEnabled,
  getLanguage, setLanguage, SUPPORTED_LANGUAGES, type LanguageCode,
} from "@/lib/preferences";

interface SettingsProps {
  name?: string;
  email?: string;
  onBack?: () => void;
  onSignOut?: () => void;
}

export const SettingsScreen = ({ name, email = "—", onBack, onSignOut }: SettingsProps) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const resolvedName = name ?? t("profile.defaultName");

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("19:00");
  const [openReminders, setOpenReminders] = useState(false);
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);

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

  const playTestSound = () => {
    playBong();
    setSoundFeedback(t("profile.testSound.playing"));
    window.setTimeout(() => setSoundFeedback(null), 1800);
  };

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

  const deleteAccount = async () => {
    if (!user || deleteConfirmText !== t("profile.deleteAccount.confirmWord")) return;
    setDeleting(true);
    try {
      const [{ data: imageFiles }, { data: avatarFiles }] = await Promise.all([
        supabase.storage.from("note-images").list(user.id),
        supabase.storage.from("avatars").list(user.id),
      ]);
      if (imageFiles?.length) {
        await supabase.storage.from("note-images").remove(imageFiles.map(f => `${user.id}/${f.name}`));
      }
      if (avatarFiles?.length) {
        await supabase.storage.from("avatars").remove(avatarFiles.map(f => `${user.id}/${f.name}`));
      }
      // Los mensajes de voz viven en carpetas "{idA}_{idB}" (ver migración voice_messages);
      // se listan a partir de las conversaciones del usuario en vez de una sola carpeta propia.
      const { data: ownMessages } = await supabase
        .from("messages")
        .select("sender_id, recipient_id")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
      const peerFolders = Array.from(new Set((ownMessages ?? []).map(m =>
        [m.sender_id, m.recipient_id].sort().join("_")
      )));
      for (const folder of peerFolders) {
        const { data: voiceFiles } = await supabase.storage.from("voice-messages").list(folder);
        if (voiceFiles?.length) {
          await supabase.storage.from("voice-messages").remove(voiceFiles.map(f => `${folder}/${f.name}`));
        }
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
        supabase.from("message_requests").delete().eq("user_min", user.id),
        supabase.from("message_requests").delete().eq("user_max", user.id),
        supabase.from("user_blocks").delete().eq("blocker_id", user.id),
        supabase.from("user_blocks").delete().eq("blocked_id", user.id),
        supabase.from("conversation_settings").delete().eq("owner_id", user.id),
        supabase.from("profile_admirations").delete().eq("giver_id", user.id),
        supabase.from("profile_admirations").delete().eq("recipient_id", user.id),
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
  <div className="min-h-full bg-gradient-hero pb-10 relative">
    <div className="px-6 pt-3 flex items-center gap-3">
      <button onClick={onBack} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center shrink-0">
        <ChevronLeft size={18} />
      </button>
      <p className="text-sm font-bold">{t("profile.settingsTitle")}</p>
    </div>

    <div className="mx-6 mt-4 rounded-3xl bg-card shadow-soft overflow-hidden">
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

      {/* Preferencias */}
      <div className="p-4 border-b border-border">
        <button onClick={() => setOpenPreferences(o => !o)} className="w-full flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-primary"><Moon size={16} /></div>
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
