import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

const FREE_FEATURES = [
  { key: "tilt", included: true },
  { key: "notes", included: true },
  { key: "community", included: true },
  { key: "messages", included: false },
  { key: "calendar", included: true },
  { key: "stats", included: true },
  { key: "cards", included: true },
] as const;

const PRO_FEATURES = FREE_FEATURES.map((f) => f.key);

const SitePricing = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden bg-gradient-deep px-6 py-24 text-white md:px-8">
      <div className="pointer-events-none absolute -top-1/3 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-info/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary-glow">{t("landing.pricing.eyebrow")}</p>
          <h2 className="animate-title-blur-in mt-2 text-3xl font-bold tracking-tight md:text-4xl">{t("landing.pricing.title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/70">{t("landing.pricing.subtitle")}</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-3xl border border-white/15 bg-white/5 p-8 backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-widest text-white/60">{t("landing.pricing.free.name")}</p>
            <p className="mt-4 text-4xl font-bold">{t("landing.pricing.free.price")}</p>
            <p className="mt-1 text-sm text-white/60">{t("landing.pricing.free.priceNote")}</p>

            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map(({ key, included }) => (
                <li
                  key={key}
                  className={`flex items-start gap-2 text-sm ${included ? "text-white/80" : "text-white/40"}`}>
                  {included ? (
                    <Check size={16} className="mt-0.5 flex-shrink-0 text-primary-glow" />
                  ) : (
                    <X size={16} className="mt-0.5 flex-shrink-0" />
                  )}
                  {t(`landing.pricing.free.features.${key}`)}
                </li>
              ))}
            </ul>

            <Link
              to="/auth?mode=signup"
              className="mt-8 block rounded-full border border-white/20 py-3 text-center text-sm font-bold transition-colors hover:bg-white/10">
              {t("landing.pricing.free.cta")}
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-3xl border-2 border-accent bg-white/10 p-8 backdrop-blur">
            <span className="absolute -top-3 right-8 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
              {t("landing.pricing.pro.badge")}
            </span>
            <p className="text-sm font-bold uppercase tracking-widest text-primary-glow">{t("landing.pricing.pro.name")}</p>
            <p className="mt-4 text-4xl font-bold">
              {t("landing.pricing.pro.price")}
              <span className="text-base font-medium text-white/60">{t("landing.pricing.pro.priceSuffix")}</span>
            </p>
            <p className="mt-1 text-sm text-white/60">{t("landing.pricing.pro.priceNote")}</p>

            <ul className="mt-6 space-y-3">
              {PRO_FEATURES.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-white/90">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-primary-glow" />
                  {t(`landing.pricing.pro.features.${key}`)}
                </li>
              ))}
            </ul>

            <Link
              to="/auth?mode=signup"
              className="mt-8 block rounded-full bg-gradient-primary py-3 text-center text-sm font-bold text-primary-foreground shadow-soft">
              {t("landing.pricing.pro.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export { SitePricing };
