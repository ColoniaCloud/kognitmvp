import { Home, SquareStack, NotebookPen, UsersRound, AlertOctagon } from "lucide-react";
import { useTranslation } from "react-i18next";

type Key = "home" | "cards" | "calendar" | "community" | "profile";
interface Props { active: Key; onChange?: (k: Key) => void; onReset?: () => void; }

const leftItems = [
  { key: "home", icon: Home },
  { key: "cards", icon: SquareStack },
] as const;

const rightItems = [
  { key: "community", icon: UsersRound },
  { key: "calendar", icon: NotebookPen },
] as const;

export const BottomNav = ({ active, onChange, onReset }: Props) => {
  const { t } = useTranslation();
  const renderItem = ({ key, icon: Icon }: { key: Key; icon: typeof Home }) => {
    const isActive = key === active;
    return (
      <button
        key={key}
        onClick={() => onChange?.(key)}
        aria-label={key}
        aria-pressed={isActive}
        className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
          isActive ? "bg-gradient-info text-info-foreground shadow-soft" : "text-muted-foreground"
        }`}
      >
        <Icon size={20} strokeWidth={2.2} />
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 inset-x-0 px-3 pb-4 pt-2 z-20">
      <div className="relative bg-card/50 backdrop-blur-2xl border border-border/50 rounded-[1.75rem] shadow-card flex items-center py-2.5 px-2">
        <div className="flex-1 flex items-center justify-evenly">
          {renderItem(leftItems[0])}
          {renderItem(leftItems[1])}
        </div>
        <div className="w-14 shrink-0" aria-hidden="true" />
        <div className="flex-1 flex items-center justify-evenly">
          {renderItem(rightItems[0])}
          {renderItem(rightItems[1])}
        </div>

        <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 w-14 h-14 p-1 bg-background [clip-path:polygon(29.3%_0%,70.7%_0%,100%_29.3%,100%_70.7%,70.7%_100%,29.3%_100%,0%_70.7%,0%_29.3%)]">
          <button
            onClick={onReset}
            aria-label={t("nav.resetAria")}
            className="w-full h-full flex items-center justify-center bg-gradient-info text-info-foreground active:scale-95 transition-transform [clip-path:polygon(29.3%_0%,70.7%_0%,100%_29.3%,100%_70.7%,70.7%_100%,29.3%_100%,0%_70.7%,0%_29.3%)]"
          >
            <AlertOctagon size={20} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
};
