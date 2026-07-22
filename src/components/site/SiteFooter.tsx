import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Instagram, Twitter, Youtube } from "lucide-react";
import mascot from "@/assets/kognit-mascot.png";

const logo = "/logo.png";

const FOOTER_LINKS = [
  { to: "/funciones", labelKey: "features" },
  { to: "/casos-de-uso", labelKey: "useCases" },
  { to: "/precio", labelKey: "pricing" },
  { to: "/contacto", labelKey: "contact" },
] as const;

// TODO: reemplazar "#" por las URLs reales de cada red social.
const SOCIAL_LINKS = [
  { icon: Instagram, href: "#", ariaKey: "instagramAria" },
  { icon: Twitter, href: "#", ariaKey: "twitterAria" },
  { icon: Youtube, href: "#", ariaKey: "youtubeAria" },
] as const;

const SiteFooter = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });

  const blobY = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  const mascotY = useTransform(scrollYProgress, [0, 1], ["25%", "-25%"]);

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-border pt-16 pb-8">
      <motion.div
        style={{ y: blobY }}
        className="pointer-events-none absolute -top-1/2 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-primary/10 blur-3xl"
      />
      <motion.img
        src={mascot}
        alt=""
        aria-hidden="true"
        style={{ y: mascotY }}
        className="mascot-recolor pointer-events-none absolute bottom-0 right-[6%] w-28 h-28 md:w-36 md:h-36 object-contain opacity-[0.08]"
      />

      <div className="relative max-w-6xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-[2fr_1fr_1fr] md:gap-8 md:text-left">
          <div className="flex flex-col items-center md:block md:items-stretch">
            <Link to="/" className="flex items-center w-fit">
              <img src={logo} alt={t("landing.logoAlt")} className="h-8 w-auto object-contain" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("landing.footerNav.tagline")}</p>
          </div>

          <div className="flex flex-col items-center md:block md:items-stretch">
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
              {t("landing.footerNav.linksTitle")}
            </p>
            <nav className="mt-4 flex flex-col items-center gap-3 md:items-stretch">
              {FOOTER_LINKS.map(({ to, labelKey }) => (
                <Link key={to} to={to} className="w-fit text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                  {t(`landing.nav.${labelKey}`)}
                </Link>
              ))}
              <Link to="/auth?mode=login" className="w-fit text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                {t("landing.nav.login")}
              </Link>
              <Link to="/auth?mode=signup" className="w-fit text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                {t("landing.ctaStart")}
              </Link>
            </nav>
          </div>

          <div className="flex flex-col items-center md:block md:items-stretch">
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
              {t("landing.footerNav.socialTitle")}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 md:justify-start">
              {SOCIAL_LINKS.map(({ icon: Icon, href, ariaKey }) => (
                <a
                  key={ariaKey}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(`landing.footerNav.social.${ariaKey}`)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/60 text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border/50 pt-6 text-center">
          <p className="text-xs text-muted-foreground">{t("landing.footer")}</p>
        </div>
      </div>
    </footer>
  );
};

export { SiteFooter };
