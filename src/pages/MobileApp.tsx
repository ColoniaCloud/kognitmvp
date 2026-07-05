import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PhoneFrame } from "@/components/kognit/PhoneFrame";
import { SplashScreen } from "@/components/kognit/SplashScreen";
import { HomeScreen } from "./kognit/Home";
import { TiltScreen } from "./kognit/Tilt";
import { CardsScreen } from "./kognit/Cards";
import { CalendarScreen } from "./kognit/Calendar";
import { ProfileScreen } from "./kognit/Profile";
import { CommunityScreen } from "./kognit/Community";
import { MessagesScreen } from "./kognit/Messages";
import { BottomNav } from "@/components/kognit/BottomNav";

type Tab = "home" | "cards" | "calendar" | "community" | "profile";
type View = Tab | "tilt" | "messages";

interface Profile {
  display_name: string;
  focus_level: number;
  emotional_control: number;
  total_resets: number;
  streak_days: number;
  xp: number;
}

export default function MobileApp() {
  const { user, loading, signOut } = useAuth();
  const { t } = useTranslation();
  const [view, setView] = useState<View>("home");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data as any));
  }, [user]);

  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/auth" replace />;

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
      case "community":
        return <CommunityScreen onBack={() => setView("home")} onMessages={() => setView("messages")} />;
      case "cards":
        return <CardsScreen onBack={() => setView("home")} />;
      case "calendar":
        return <CalendarScreen />;
      case "profile":
        return <ProfileScreen
          name={profile?.display_name ?? t("common.defaultUserName")}
          email={user.email || t("common.guestAccount")}
          focusLevel={profile?.focus_level ?? 50}
          emotionalControl={profile?.emotional_control ?? 50}
          totalResets={profile?.total_resets ?? 0}
          streakDays={profile?.streak_days ?? 0}
          xp={profile?.xp ?? 0}
          onSignOut={signOut}
        />;
      default:
        return <HomeScreen
          name={profile?.display_name ?? t("common.defaultUserName")}
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
        {view !== "tilt" && view !== "messages" && (
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
            {view !== "tilt" && view !== "messages" && (
              <BottomNav active={view as Tab} onChange={(k) => setView(k)} onReset={goTilt} />
            )}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
