import { Home, SquareStack, NotebookPen, UsersRound, UserRound, AlertOctagon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const logo = "/logo.png";

type Key = "home" | "cards" | "calendar" | "community" | "profile";

interface Props {
  /** Item resaltado. `null` en pantallas de flujo que no mapean a ninguna sección. */
  active: Key | null;
  onChange?: (k: Key) => void;
  onReset?: () => void;
}

const ITEMS = [
  { key: "home", icon: Home },
  { key: "cards", icon: SquareStack },
  { key: "community", icon: UsersRound },
  { key: "calendar", icon: NotebookPen },
  { key: "profile", icon: UserRound },
] as const;

/**
 * Navegación lateral de /app en desktop (≥md). En mobile la reemplaza `BottomNav`.
 */
export const SideNav = ({ active, onChange, onReset }: Props) => {
  const { t } = useTranslation();

  return (
    <aside
      aria-label={t("nav.primaryAria")}
      className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border/50 bg-card/40 backdrop-blur-xl px-4 py-6">
      <img src={logo} alt="Kognit" className="h-9 w-auto self-start object-contain px-2" />

      <nav className="mt-8 flex-1 space-y-1">
        {ITEMS.map(({ key, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => onChange?.(key)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all",
                isActive
                  ? "bg-gradient-info text-info-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}>
              <Icon size={18} strokeWidth={2.2} />
              {t(`nav.items.${key}`)}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onReset}
        aria-label={t("nav.resetAria")}
        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-emergency text-destructive-foreground font-bold text-sm shadow-emergency transition-transform active:scale-[0.98]">
        <AlertOctagon size={20} strokeWidth={2.2} />
        {t("nav.reset")}
      </button>
    </aside>
  );
};
