import flowState from "@/assets/achievements/flow-state.png";
import firstAlly from "@/assets/achievements/first-ally.png";
import fiveDayStreak from "@/assets/achievements/five-day-streak.png";
import unstoppable from "@/assets/achievements/unstoppable.png";
import twoMinuteRule from "@/assets/achievements/two-minute-rule.png";
import caterpillarEffect from "@/assets/achievements/caterpillar-effect.png";
import onePercentBetter from "@/assets/achievements/one-percent-better.png";
import closingRitual from "@/assets/achievements/closing-ritual.png";
import calmAnchor from "@/assets/achievements/calm-anchor.png";

export type AchievementId =
  | "flowState" | "firstAlly" | "fiveDayStreak" | "unstoppable" | "twoMinuteRule"
  | "caterpillarEffect" | "onePercentBetter" | "closingRitual" | "calmAnchor";

/** Señales de actividad real que la app registra hoy. */
export interface AchievementProgress {
  totalResets: number;
  streakDays: number;
  hasPublicNote: boolean;
  hasReceivedReaction: boolean;
}

interface Achievement {
  id: AchievementId;
  icon: string;
  /**
   * `null` = logro informativo: describe un hábito que la app todavía no puede medir
   * (flow sostenido, corregir tu error más frecuente, etc.). Se muestra siempre
   * bloqueado, como referencia de la práctica, hasta que exista la señal que lo cierre.
   */
  isUnlocked: ((p: AchievementProgress) => boolean) | null;
  /** Umbral numérico para la barra de progreso de Kognit Pro. */
  progress?: (p: AchievementProgress) => { current: number; total: number };
}

/**
 * Los nueve logros con su ilustración. Los criterios vienen de literatura de hábitos
 * y rendimiento (flow, regla de los dos minutos, efecto Zeigarnik), así que varios
 * describen conductas que la app no observa: esos quedan como referencia.
 *
 * Los cinco que sí se cierran solos usan las señales que ya calcula
 * `computeProfileMetrics` (resets, racha) más las de comunidad (nota pública,
 * reacción recibida), mapeadas al logro que corresponde temáticamente.
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Primer reset completado: el "gesto condicionado para calmarte" de la ficha.
  {
    id: "calmAnchor",
    icon: calmAnchor,
    isUnlocked: (p) => p.totalResets >= 1,
    progress: (p) => ({ current: Math.min(p.totalResets, 1), total: 1 }),
  },
  // Constancia: cinco días seguidos con actividad.
  {
    id: "fiveDayStreak",
    icon: fiveDayStreak,
    isUnlocked: (p) => p.streakDays >= 5,
    progress: (p) => ({ current: Math.min(p.streakDays, 5), total: 5 }),
  },
  // Acumulación de ganancias marginales: diez resets.
  {
    id: "onePercentBetter",
    icon: onePercentBetter,
    isUnlocked: (p) => p.totalResets >= 10,
    progress: (p) => ({ current: Math.min(p.totalResets, 10), total: 10 }),
  },
  // Cerrar el día por escrito: la primera nota pública en la comunidad.
  { id: "closingRitual", icon: closingRitual, isUnlocked: (p) => p.hasPublicNote },
  // Compromiso social: alguien reaccionó a una nota tuya.
  { id: "firstAlly", icon: firstAlly, isUnlocked: (p) => p.hasReceivedReaction },

  // Informativos: la app todavía no tiene cómo detectarlos.
  { id: "flowState", icon: flowState, isUnlocked: null },
  { id: "unstoppable", icon: unstoppable, isUnlocked: null },
  { id: "twoMinuteRule", icon: twoMinuteRule, isUnlocked: null },
  { id: "caterpillarEffect", icon: caterpillarEffect, isUnlocked: null },
];

export function isAchievementUnlocked(id: AchievementId, p: AchievementProgress): boolean {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  return a?.isUnlocked ? a.isUnlocked(p) : false;
}

/**
 * Progreso numérico hacia el logro (ej. "3/10") — es parte de las "estadísticas
 * detalladas" de Kognit Pro. Solo tiene sentido para logros con umbral numérico.
 */
export function getAchievementProgress(
  id: AchievementId,
  p: AchievementProgress,
): { current: number; total: number } | null {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  return a?.progress ? a.progress(p) : null;
}
