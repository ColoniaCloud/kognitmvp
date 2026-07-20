import { useTranslation } from "react-i18next";
import { Check, Languages } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLanguage, setLanguage, SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/preferences";

interface Props {
  className?: string;
}

export const LanguageSwitcher = ({ className = "" }: Props) => {
  const { t, i18n } = useTranslation();
  const current = getLanguage();
  const currentLabel = SUPPORTED_LANGUAGES.find(l => l.code === current)?.code.toUpperCase() ?? current;

  const changeLanguage = (code: LanguageCode) => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("landing.nav.languageAria")}
          className={`flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors ${className}`}>
          <Languages size={16} />
          {currentLabel}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {SUPPORTED_LANGUAGES.map(({ code, label }) => (
          <DropdownMenuItem key={code} onClick={() => changeLanguage(code)} className="flex items-center justify-between gap-3">
            {label}
            {code === current && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
