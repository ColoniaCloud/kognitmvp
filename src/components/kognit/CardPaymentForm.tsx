import { useEffect, useState } from "react";
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useTranslation } from "react-i18next";

const PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY as string | undefined;

let initialized = false;

interface Props {
  amount: number;
  onToken: (token: string) => void;
  onCancel: () => void;
}

// Wrapper del Brick "CardPayment" de Mercado Pago — lo usamos solo para
// tokenizar la tarjeta (formData.token), no para cobrar acá: una suscripción
// (preapproval) no tiene cuotas ni payment_method_id propios, esos campos del
// Brick están pensados para pagos únicos y los descartamos.
export const CardPaymentForm = ({ amount, onToken, onCancel }: Props) => {
  const { t } = useTranslation();
  const [brickError, setBrickError] = useState(false);

  useEffect(() => {
    if (PUBLIC_KEY && !initialized) {
      initMercadoPago(PUBLIC_KEY, { locale: "es-UY" });
      initialized = true;
    }
  }, []);

  if (!PUBLIC_KEY) {
    return (
      <p className="text-[11px] text-destructive font-semibold bg-destructive/10 rounded-xl p-2.5">
        {t("profile.plan.cardForm.misconfigured")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {brickError && (
        <p className="text-[11px] text-destructive font-semibold bg-destructive/10 rounded-xl p-2.5">
          {t("profile.plan.cardForm.error")}
        </p>
      )}
      <CardPayment
        key={amount}
        initialization={{ amount }}
        locale="es-UY"
        customization={{ visual: { hideFormTitle: true } }}
        onSubmit={async (formData) => {
          setBrickError(false);
          onToken(formData.token);
        }}
        onError={(error) => {
          console.error("[mercadopago:brick]", error);
          setBrickError(true);
        }}
      />
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-xs font-semibold text-muted-foreground py-2">
        {t("profile.plan.cardForm.cancel")}
      </button>
    </div>
  );
};
