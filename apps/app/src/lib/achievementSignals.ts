/**
 * Señales de logros derivadas del historial de resets.
 *
 * Los criterios de los logros vienen de literatura de hábitos y rendimiento, así que
 * hay que traducirlos a algo que la app efectivamente observe. Cada regla de acá
 * intenta ser fiel al criterio que muestra la ficha, no una excusa para desbloquear:
 * si un criterio no se puede medir con honestidad, el logro se queda informativo
 * (ver `isUnlocked: null` en `data/achievements.ts`).
 */

export interface ResetSessionSignal {
  mode: string | null;
  pre_intensity: number | null;
  post_intensity: number | null;
  created_at: string;
}

export interface ResetSignals {
  /** Resets completados en modo rápido — la versión simplificada del protocolo. */
  fastResets: number;
  /** Hubo al menos un reset que arrancó muy activado y bajó fuerte. */
  hadHardWin: boolean;
  /** El peor resultado reciente es mejor que el peor del período anterior. */
  raisedFloor: boolean;
}

/** "Regla dos minutos": cuántos resets rápidos hacen falta para desbloquear. */
export const FAST_RESETS_TARGET = 3;

/** "Nada me detiene": umbrales de un reset difícil ganado. */
const HARD_WIN_MIN_PRE = 8;
const HARD_WIN_MIN_DROP = 4;

/** "Efecto oruga": tamaño de cada ventana a comparar. */
export const FLOOR_WINDOW = 10;

/**
 * "Efecto oruga" — subir el piso, no el techo.
 *
 * Compara el peor `post_intensity` de los últimos `FLOOR_WINDOW` resets contra el
 * peor de los `FLOOR_WINDOW` anteriores. Se fija en el máximo (el peor resultado) y
 * no en el promedio a propósito: el criterio de la ficha habla de corregir tu error
 * más frecuente, o sea de que tus peores días dejen de ser tan malos.
 *
 * Necesita dos ventanas completas; con menos historial no hay con qué comparar.
 */
function hasRaisedFloor(sortedDesc: ResetSessionSignal[]): boolean {
  const scored = sortedDesc
    .map((s) => s.post_intensity)
    .filter((v): v is number => v != null);
  if (scored.length < FLOOR_WINDOW * 2) return false;

  const recent = scored.slice(0, FLOOR_WINDOW);
  const previous = scored.slice(FLOOR_WINDOW, FLOOR_WINDOW * 2);
  return Math.max(...recent) < Math.max(...previous);
}

export function computeResetSignals(sessions: ResetSessionSignal[]): ResetSignals {
  const sortedDesc = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return {
    fastResets: sessions.filter((s) => s.mode === "fast").length,
    hadHardWin: sessions.some(
      (s) =>
        s.pre_intensity != null &&
        s.post_intensity != null &&
        s.pre_intensity >= HARD_WIN_MIN_PRE &&
        s.pre_intensity - s.post_intensity >= HARD_WIN_MIN_DROP,
    ),
    raisedFloor: hasRaisedFloor(sortedDesc),
  };
}
