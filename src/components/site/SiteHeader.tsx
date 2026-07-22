import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, Menu } from "lucide-react";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";

const logo = "/logo.png";

const NAV_LINKS = [
  { to: "/funciones", labelKey: "features" },
  { to: "/casos-de-uso", labelKey: "useCases" },
  { to: "/precio", labelKey: "pricing" },
  { to: "/contacto", labelKey: "contact" },
] as const;

const SiteHeader = () => {
  const { t } = useTranslation();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="fixed top-3 inset-x-3 md:top-4 md:inset-x-6 z-50">
      <div className="max-w-6xl mx-auto bg-background/80 backdrop-blur-md border border-border/50 rounded-2xl shadow-soft px-4 md:px-6 h-14 md:h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center flex-shrink-0">
          <img src={logo} alt={t("landing.logoAlt")} className="h-8 md:h-11 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-semibold transition-colors hover:text-foreground ${
                pathname === to ? "text-foreground" : "text-muted-foreground"
              }`}>
              {t(`landing.nav.${labelKey}`)}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {canInstall && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-1.5 bg-foreground text-background font-bold px-4 py-2 rounded-full text-xs">
              <Download size={16} />
              {t("landing.installApp")}
            </button>
          )}
          <Link to="/auth?mode=login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
            {t("landing.nav.login")}
          </Link>
          <Link to="/auth?mode=signup" className="bg-gradient-primary text-primary-foreground font-bold px-5 py-2 rounded-full shadow-soft text-sm">
            {t("landing.ctaStart")}
          </Link>
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              aria-label={t("landing.nav.menuAria")}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary/60 transition-colors">
              <Menu size={22} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-4/5 flex flex-col gap-1 bg-background">
            <SheetTitle className="sr-only">{t("landing.nav.menuTitle")}</SheetTitle>
            {NAV_LINKS.map(({ to, labelKey }) => (
              <SheetClose key={to} asChild>
                <Link to={to} className="py-3 text-base font-semibold text-foreground border-b border-border/50">
                  {t(`landing.nav.${labelKey}`)}
                </Link>
              </SheetClose>
            ))}
            <SheetClose asChild>
              <Link to="/auth?mode=login" className="py-3 text-base font-semibold text-foreground border-b border-border/50">
                {t("landing.nav.login")}
              </Link>
            </SheetClose>
            <div className="py-3 flex items-center justify-between border-b border-border/50">
              <span className="text-base font-semibold text-foreground">{t("landing.nav.language")}</span>
              <LanguageSwitcher />
            </div>
            {canInstall && (
              <button
                onClick={() => { promptInstall(); setMenuOpen(false); }}
                className="mt-4 flex items-center justify-center gap-1.5 bg-foreground text-background font-bold px-5 py-3 rounded-full text-sm">
                <Download size={16} />
                {t("landing.installApp")}
              </button>
            )}
            <SheetClose asChild>
              <Link
                to="/auth?mode=signup"
                className="mt-2 flex items-center justify-center bg-gradient-primary text-primary-foreground font-bold px-5 py-3 rounded-full shadow-soft text-sm">
                {t("landing.ctaStart")}
              </Link>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export { SiteHeader };
