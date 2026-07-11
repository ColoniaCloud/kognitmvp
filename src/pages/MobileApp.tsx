import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { startCheckout } from "@/lib/billing";
import { useToast } from "@/hooks/use-toast";
import { PhoneFrame } from "@/components/kognit/PhoneFrame";
import { SplashScreen } from "@/components/kognit/SplashScreen";
import { HomeScreen } from "./kognit/Home";
import { TiltScreen } from "./kognit/Tilt";
import { CardsScreen } from "./kognit/Cards";
import { CalendarScreen } from "./kognit/Calendar";
import { ProfileScreen } from "./kognit/Profile";
import { SettingsScreen } from "./kognit/Settings";
import { CommunityScreen } from "./kognit/Community";
import { MessagesScreen } from "./kognit/Messages";
import { OnboardingScreen, type GoalId } from "./kognit/Onboarding";
import { BottomNav } from "@/components/kognit/BottomNav";
import { computeProfileMetrics } from "@/lib/metrics";

type Tab = "home" | "cards" | "calendar" | "community" | "profile";
type View = Tab | "tilt" | "messages" | "settings";

interface Profile {
  display_name: string;
  focus_level: number;
  emotional_control: number;
  total_resets: number;
  streak_days: number;
  xp: number;
  onboarding_completed_at: string | null;
  onboarding_goals: string[];
  plan: string;
  plan_status: string | null;
}

export default function MobileApp() {
  const { user, loading, signOut } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [view, setView] = useState<View>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const upgradeAttempted = useRef(false);

  // El paso 1 del wizard de registro (Auth.tsx) no puede escribir profiles.plan
  // directo (protegido por el trigger protect_plan_columns) — si eligieron Pro,
  // el redirect post-login/signup trae "?upgrade=pro" y acá se dispara el
  // checkout real de Mercado Pago apenas hay sesión.
  useEffect(() => {
    if (!user || upgradeAttempted.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") !== "pro") return;
    upgradeAttempted.current = true;
    window.history.replaceState(null, "", window.location.pathname);
    startCheckout("monthly").then(url => {
      if (url) {
        window.location.href = url;
      } else {
        toast({ title: t("auth.toasts.errorTitle"), description: t("profile.plan.checkoutError"), variant: "destructive" });
      }
    });
  }, [user, t, toast]);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!profileData) { setProfileLoaded(true); return; }

    // Foco/control emocional/racha/xp no tenían ninguna lógica que los actualizara
    // (quedaban pisados en el default de la columna) — se recalculan acá a partir
    // de la actividad real cada vez que se abre la app.
    const [{ data: sessions }, { data: notes }] = await Promise.all([
      supabase.from("reset_sessions").select("pre_intensity, post_intensity, created_at").eq("user_id", user.id),
      supabase.from("notes").select("created_at").eq("user_id", user.id),
    ]);
    const metrics = computeProfileMetrics(sessions ?? [], notes ?? []);
    const next: Profile = {
      ...(profileData as Profile),
      focus_level: metrics.focusLevel,
      emotional_control: metrics.emotionalControl,
      streak_days: metrics.streakDays,
      xp: metrics.xp,
    };
    setProfile(next);
    setProfileLoaded(true);

    if (
      sessions?.length || notes?.length
    ) {
      await supabase.from("profiles").update({
        focus_level: metrics.focusLevel,
        emotional_control: metrics.emotionalControl,
        streak_days: metrics.streakDays,
        xp: metrics.xp,
      }).eq("id", user.id);
    }
  }, [user]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const completeOnboarding = async (emotions: string[], goals: string[]) => {
    if (!user) return;
    await supabase.from("profiles").update({
      onboarding_emotions: emotions,
      onboarding_goals: goals,
    }).eq("id", user.id);
    setProfile(prev => prev && { ...prev, onboarding_goals: goals });
  };

  const finishOnboarding = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ onboarding_completed_at: now }).eq("id", user.id);
    setProfile(prev => prev && { ...prev, onboarding_completed_at: now });
  };

  if (loading || (user && !profileLoaded)) return <SplashScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  if (profile && !profile.onboarding_completed_at) {
    return (
      <div className="min-h-screen bg-gradient-hero md:flex md:items-center md:justify-center md:py-8">
        <div className="md:hidden min-h-screen">
          <OnboardingScreen onSubmit={completeOnboarding} onFinish={finishOnboarding} />
        </div>
        <div className="hidden md:block">
          <PhoneFrame>
            <OnboardingScreen onSubmit={completeOnboarding} onFinish={finishOnboarding} />
          </PhoneFrame>
        </div>
      </div>
    );
  }

  const goTilt = async () => {
    setView("tilt");
    if (profile) {
      const next = { ...profile, total_resets: profile.total_resets + 1 };
      setProfile(next);
      await supabase.from("profiles").update({ total_resets: next.total_resets }).eq("id", user.id);
    }
  };

  const screen = (() => {
    switch (view) {
      case "tilt":
        return <TiltScreen onExit={() => setView("home")} />;
      case "messages":
        return <MessagesScreen onBack={() => setView("community")} />;
      case "settings":
        return <SettingsScreen
          name={profile?.display_name ?? t("common.defaultUserName")}
          email={user.email || t("common.guestAccount")}
          onBack={() => { loadProfile(); setView("profile"); }}
          onSignOut={signOut}
        />;
      case "community":
        return <CommunityScreen
          onBack={() => setView("home")}
          onMessages={() => setView("messages")}
          plan={(profile?.plan as "free" | "pro") ?? "free"}
          onUpgrade={() => setView("profile")}
        />;
      case "cards":
        return <CardsScreen onBack={() => setView("home")} plan={(profile?.plan as "free" | "pro") ?? "free"} onUpgrade={() => setView("profile")} />;
      case "calendar":
        return <CalendarScreen plan={(profile?.plan as "free" | "pro") ?? "free"} onUpgrade={() => setView("profile")} />;
      case "profile":
        return <ProfileScreen
          name={profile?.display_name ?? t("common.defaultUserName")}
          email={user.email || t("common.guestAccount")}
          focusLevel={profile?.focus_level ?? 50}
          emotionalControl={profile?.emotional_control ?? 50}
          totalResets={profile?.total_resets ?? 0}
          streakDays={profile?.streak_days ?? 0}
          xp={profile?.xp ?? 0}
          plan={(profile?.plan as "free" | "pro") ?? "free"}
          planStatus={profile?.plan_status ?? null}
          onOpenSettings={() => setView("settings")}
        />;
      default:
        return <HomeScreen
          name={profile?.display_name ?? t("common.defaultUserName")}
          primaryGoal={profile?.onboarding_goals?.[0] as GoalId | undefined}
          onTilt={goTilt}
          onCards={() => setView("cards")}
          onProgress={() => setView("calendar")}
          onProfile={() => setView("profile")}
        />;
    }
  })();

  // Mobile-first: full screen on phones, framed on desktop
  return (
    <div className="min-h-screen bg-gradient-hero md:flex md:items-center md:justify-center md:py-8">
      <div className={`md:hidden relative ${view === "cards" || view === "tilt" ? "h-dvh overflow-hidden" : "min-h-screen"}`}>
        {screen}
        {view !== "tilt" && view !== "messages" && view !== "settings" && (
          <BottomNav
            active={view as Tab}
            onChange={(k) => setView(k)}
            onReset={goTilt}
          />
        )}
      </div>
      <div className="hidden md:block">
        <PhoneFrame>
          <div className="relative h-full">
            {screen}
            {view !== "tilt" && view !== "messages" && view !== "settings" && (
              <BottomNav active={view as Tab} onChange={(k) => setView(k)} onReset={goTilt} />
            )}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
