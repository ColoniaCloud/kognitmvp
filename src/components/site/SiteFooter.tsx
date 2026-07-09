import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Instagram, Twitter, Youtube } from "lucide-react";
import logo from "@/assets/kognit-logo.png";
import mascot from "@/assets/kognit-mascot.png";

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
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10 md:gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2.5 w-fit">
              <img src={logo} alt={t("landing.logoAlt")} className="w-9 h-9 object-contain" />
              <span className="font-display font-bold text-lg tracking-tight">{t("app.name")}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{t("landing.footerNav.tagline")}</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
              {t("landing.footerNav.linksTitle")}
            </p>
            <nav className="mt-4 flex flex-col gap-3">
              <a href="#prototipo" className="w-fit text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                {t("landing.nav.product")}
              </a>
              <Link to="/auth" className="w-fit text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                {t("landing.nav.login")}
              </Link>
              <Link to="/auth" className="w-fit text-sm font-medium text-foreground/80 transition-colors hover:text-primary">
                {t("landing.ctaStart")}
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] font-bold text-muted-foreground">
              {t("landing.footerNav.socialTitle")}
            </p>
            <div className="mt-4 flex items-center gap-3">
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
