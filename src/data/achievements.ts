export type AchievementId =
  | "first_reset"
  | "streak_3"
  | "ten_resets"
  | "first_public_note"
  | "first_reaction_received";

export const ACHIEVEMENTS: { id: AchievementId; emoji: string }[] = [
  { id: "first_reset", emoji: "🫁" },
  { id: "streak_3", emoji: "🔥" },
  { id: "ten_resets", emoji: "🧠" },
  { id: "first_public_note", emoji: "📝" },
  { id: "first_reaction_received", emoji: "🤝" },
];

export interface AchievementProgress {
  totalResets: number;
  streakDays: number;
  hasPublicNote: boolean;
  hasReceivedReaction: boolean;
}

export function isAchievementUnlocked(id: AchievementId, p: AchievementProgress): boolean {
  switch (id) {
    case "first_reset":
      return p.totalResets >= 1;
    case "streak_3":
      return p.streakDays >= 3;
    case "ten_resets":
      return p.totalResets >= 10;
    case "first_public_note":
      return p.hasPublicNote;
    case "first_reaction_received":
      return p.hasReceivedReaction;
  }
}

// Progreso numérico hacia el logro (ej. "3/10") — es parte de las "estadísticas detalladas"
// de Kognit Pro. Solo tiene sentido para logros con un umbral numérico; los logros booleanos
// (nota pública, reacción recibida) no tienen un progreso intermedio que mostrar.
export function getAchievementProgress(id: AchievementId, p: AchievementProgress): { current: number; total: number } | null {
  switch (id) {
    case "first_reset":
      return { current: Math.min(p.totalResets, 1), total: 1 };
    case "streak_3":
      return { current: Math.min(p.streakDays, 3), total: 3 };
    case "ten_resets":
      return { current: Math.min(p.totalResets, 10), total: 10 };
    case "first_public_note":
    case "first_reaction_received":
      return null;
  }
}
