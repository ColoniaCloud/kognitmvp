import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
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
  const currentFlag = SUPPORTED_LANGUAGES.find(l => l.code === current)?.flag ?? "🏳️";

  const changeLanguage = (code: LanguageCode) => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("landing.nav.languageAria")}
          className={`flex items-center gap-1.5 text-lg leading-none hover:opacity-80 transition-opacity ${className}`}>
          <span aria-hidden="true">{currentFlag}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
          <DropdownMenuItem key={code} onClick={() => changeLanguage(code)} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{flag}</span>
              {label}
            </span>
            {code === current && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
