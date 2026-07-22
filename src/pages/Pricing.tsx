import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SitePricing } from "@/components/site/SitePricing";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQ_ITEMS = ["cancel", "trial", "switch", "payment"] as const;

const Pricing = () => {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      <SiteHeader />

      <div className="pt-20 md:pt-24">
        <SitePricing />
      </div>

      <main className="px-6 md:px-8 py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="animate-title-blur-in text-center text-3xl font-bold tracking-tight md:text-4xl">{t("pricingPage.faq.title")}</h2>
          <Accordion type="single" collapsible className="mt-10">
            {FAQ_ITEMS.map((key) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {t(`pricingPage.faq.items.${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(`pricingPage.faq.items.${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Pricing;
