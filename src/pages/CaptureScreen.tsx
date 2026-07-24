// Ruta de desarrollo (`/__capture/:screen`, registrada solo con import.meta.env.DEV)
// que renderiza una pantalla de /app suelta, sin login, con datos de demo, para que
// scripts/capture-screens.mjs genere las imágenes de public/screens/ que usa la
// landing. No forma parte de la app: ver docs/capturas.md.
import { useParams } from "react-router-dom";
import { AppShell } from "@/components/kognit/AppShell";
import { HomeScreen } from "./kognit/Home";
import { TiltScreen } from "./kognit/Tilt";
import { CardsScreen } from "./kognit/Cards";
import { CalendarScreen } from "./kognit/Calendar";
import { CommunityScreen } from "./kognit/Community";
import { ProfileScreen } from "./kognit/Profile";

const DEMO = {
  name: "Martín",
  email: "martin@kognit.app",
};

type Shot = {
  navActive: "home" | "cards" | "calendar" | "community" | "profile" | null;
  bottomNav: boolean;
  fullHeight?: boolean;
  width?: "narrow" | "default";
  surface?: "hero" | "deep";
  render: () => JSX.Element;
};

const SHOTS: Record<string, Shot> = {
  home: {
    navActive: "home",
    bottomNav: true,
    render: () => <HomeScreen name={DEMO.name} />,
  },
  tilt: {
    navActive: null,
    bottomNav: false,
    fullHeight: true,
    width: "narrow",
    surface: "deep",
    render: () => <TiltScreen />,
  },
  cards: {
    navActive: "cards",
    bottomNav: true,
    fullHeight: true,
    width: "narrow",
    render: () => <CardsScreen plan="pro" />,
  },
  calendar: {
    navActive: "calendar",
    bottomNav: true,
    render: () => <CalendarScreen plan="pro" />,
  },
  community: {
    navActive: "community",
    bottomNav: true,
    render: () => <CommunityScreen plan="pro" />,
  },
  profile: {
    navActive: "profile",
    bottomNav: true,
    render: () => (
      <ProfileScreen
        name={DEMO.name}
        email={DEMO.email}
        focusLevel={78}
        emotionalControl={71}
        totalResets={34}
        streakDays={12}
        xp={1840}
        plan="pro"
        planStatus="authorized"
      />
    ),
  },
};

export default function Capture() {
  const { screen = "home" } = useParams();
  const shot = SHOTS[screen];
  if (!shot) return <div>unknown screen: {screen}</div>;

  return (
    <AppShell
      navActive={shot.navActive}
      showBottomNav={shot.bottomNav}
      showSideNav={false}
      fullHeight={shot.fullHeight}
      width={shot.width}
      surface={shot.surface}>
      {shot.render()}
    </AppShell>
  );
}
