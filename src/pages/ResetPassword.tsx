import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast({ title: t("resetPassword.toastErrorTitle"), description: error.message, variant: "destructive" });
    toast({ title: t("resetPassword.toastSuccessTitle"), description: t("resetPassword.toastSuccessDescription") });
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-card rounded-3xl shadow-card p-7">
        <h1 className="text-xl font-bold mb-2">{t("resetPassword.title")}</h1>
        <p className="text-sm text-muted-foreground mb-5">{t("resetPassword.subtitle")}</p>
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
          placeholder={t("resetPassword.placeholder")}
          className="w-full px-4 py-3 rounded-xl bg-secondary text-sm font-medium outline-none focus:ring-2 focus:ring-primary" />
        <button disabled={loading} className="mt-4 w-full bg-gradient-primary text-primary-foreground font-bold py-3.5 rounded-xl shadow-soft flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" size={18} /> : t("resetPassword.submit")}
        </button>
      </form>
    </div>
  );
}