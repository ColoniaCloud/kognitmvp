import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  onRetry: () => void;
  className?: string;
}

// Estado genérico para cuando una pantalla no pudo traer datos de Supabase
// (red caída, timeout, etc.) — evita que se muestre un estado vacío falso.
export const ErrorState = ({ onRetry, className = "" }: ErrorStateProps) => {
  const { t } = useTranslation();
  return (
    <div className={`text-center py-10 px-4 ${className}`}>
      <WifiOff size={20} className="mx-auto text-muted-foreground" />
      <p className="mt-3 text-xs font-bold">{t("common.error.title")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("common.error.subtitle")}</p>
      <button
        onClick={onRetry}
        className="mt-4 text-xs font-bold text-primary underline underline-offset-4"
      >
        {t("common.error.retry")}
      </button>
    </div>
  );
};
