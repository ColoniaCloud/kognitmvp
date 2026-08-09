import { useCallback, useEffect, useState } from "react";
import { supabase } from "@kognit/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getCalmAnchorPhrase, setCalmAnchorPhrase } from "@kognit/ui/lib/preferences";

export interface CalmAnchor {
  phrase: string;
  /** ISO. No cambia al editar la frase: es la misma ancla, refinada. */
  createdAt: string;
}

/** Días calendario completos desde que el ancla existe. Recién creada da 0. */
function daysSince(createdAt: string): number {
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
}

/**
 * El ancla de calma del usuario: la frase que fija en un buen momento para
 * poder volver a ella cuando está en tilt. La leen el Home (para proponerla o
 * recordarla) y el Reset (para devolvérsela en la fase de grounding).
 *
 * Vive en la tabla `calm_anchors`, una fila por usuario. Antes vivía en
 * localStorage; la primera carga sube lo que haya quedado ahí para no comerse
 * el ancla de quien ya tenía una.
 */
export function useCalmAnchor() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState<CalmAnchor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAnchor(null);
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("calm_anchors")
        .select("phrase, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;

      if (data) {
        setAnchor({ phrase: data.phrase, createdAt: data.created_at });
        setLoading(false);
        return;
      }

      const legacy = getCalmAnchorPhrase().trim();
      if (!legacy) {
        setLoading(false);
        return;
      }
      const { data: migrated } = await supabase
        .from("calm_anchors")
        .insert({ user_id: user.id, phrase: legacy })
        .select("phrase, created_at")
        .maybeSingle();
      if (cancelled) return;
      if (migrated) {
        setCalmAnchorPhrase("");
        setAnchor({ phrase: migrated.phrase, createdAt: migrated.created_at });
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  /**
   * El Home autoguarda mientras se escribe, así que esto se llama muchas veces
   * y con estados intermedios del texto.
   *
   * Vaciar el campo **no borra** el ancla: sin un botón que confirme, borrar
   * para reescribir pasaría por acá con el texto vacío y se llevaría puesto el
   * `created_at` — o sea el contador de días — entre dos pulsaciones de tecla.
   * El ancla anterior sobrevive hasta que la reemplace un texto real.
   */
  const save = useCallback(async (raw: string): Promise<"saved" | "skipped" | "error"> => {
    const phrase = raw.trim();
    if (!phrase) return "skipped";

    if (!user) {
      // Showcase sin login (capturas): no persiste, pero la UI avanza igual.
      setAnchor(prev => ({ phrase, createdAt: prev?.createdAt ?? new Date().toISOString() }));
      return "saved";
    }

    const { data, error } = await supabase
      .from("calm_anchors")
      .upsert({ user_id: user.id, phrase }, { onConflict: "user_id" })
      .select("phrase, created_at")
      .maybeSingle();
    if (error || !data) return "error";
    setAnchor({ phrase: data.phrase, createdAt: data.created_at });
    return "saved";
  }, [user]);

  return {
    anchor,
    loading,
    save,
    days: anchor ? daysSince(anchor.createdAt) : 0,
  };
}
