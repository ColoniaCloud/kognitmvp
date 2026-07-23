import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Flame, Brain, Award, HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/kognit/Avatar";
import { resolveAvatarUrl } from "@/lib/avatar";

interface Props {
  userId: string;
  onClose: () => void;
}

interface PeerProfile {
  display_name: string;
  avatarUrl: string | null;
  focus_level: number;
  emotional_control: number;
  total_resets: number;
  streak_days: number;
  xp: number;
}

export const PublicProfileSheet = ({ userId, onClose }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<PeerProfile | null>(null);
  const [admirationCount, setAdmirationCount] = useState(0);
  const [admired, setAdmired] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prof }, { count }, { data: mine }] = await Promise.all([
      supabase.from("profiles")
        .select("display_name, avatar_url, focus_level, emotional_control, total_resets, streak_days, xp")
        .eq("id", userId).maybeSingle(),
      supabase.from("profile_admirations").select("id", { count: "exact", head: true }).eq("recipient_id", userId),
      user
        ? supabase.from("profile_admirations").select("id").eq("giver_id", user.id).eq("recipient_id", userId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setProfile(prof ? {
      ...prof,
      avatarUrl: resolveAvatarUrl(prof.avatar_url),
    } as PeerProfile : null);
    setAdmirationCount(count ?? 0);
    setAdmired(!!mine);
    setLoading(false);
  }, [userId, user]);

  useEffect(() => { load(); }, [load]);

  const toggleAdmiration = async () => {
    if (!user) return;
    if (admired) {
      setAdmired(false);
      setAdmirationCount(c => Math.max(0, c - 1));
      await supabase.from("profile_admirations").delete().eq("giver_id", user.id).eq("recipient_id", userId);
    } else {
      setAdmired(true);
      setAdmirationCount(c => c + 1);
      await supabase.from("profile_admirations")
        .upsert({ giver_id: user.id, recipient_id: userId }, { onConflict: "giver_id,recipient_id" });
    }
  };

  const displayName = profile?.display_name ?? t("community.defaultAuthor");

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="w-full bg-card rounded-t-3xl md:rounded-3xl shadow-card p-5 max-h-[85%] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{t("publicProfile.title")}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        {loading && <p className="mt-8 text-xs text-muted-foreground text-center py-10">{t("publicProfile.loading")}</p>}

        {!loading && profile && (
          <>
            <div className="mt-5 flex flex-col items-center">
              <Avatar src={profile.avatarUrl} name={displayName} size={64} shape="square" className="text-2xl shadow-glow" />
              <p className="mt-3 text-base font-bold">{displayName}</p>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { icon: Flame, label: t("profile.stats.streak"), value: String(profile.streak_days), c: "text-cyan" },
                { icon: Brain, label: t("profile.stats.resets"), value: String(profile.total_resets), c: "text-primary" },
                { icon: Award, label: t("profile.stats.xp"), value: String(profile.xp), c: "text-accent" },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl bg-secondary/40 text-center">
                  <s.icon size={18} className={`${s.c} mx-auto`} />
                  <p className="text-lg font-bold mt-1.5">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-secondary/40 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">{t("profile.focusLevel")}</p>
                  <span className="text-xs font-bold text-primary">{profile.focus_level}%</span>
                </div>
                <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${profile.focus_level}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold">{t("profile.emotionalControl")}</p>
                  <span className="text-xs font-bold text-accent">{profile.emotional_control}%</span>
                </div>
                <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${profile.emotional_control}%` }} />
                </div>
              </div>
            </div>

            {user && user.id !== userId && (
              <div className="mt-5">
                <button onClick={toggleAdmiration}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    admired ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-foreground"
                  }`}>
                  <HandHeart size={16} />
                  {t("publicProfile.admire")} · {admirationCount}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
