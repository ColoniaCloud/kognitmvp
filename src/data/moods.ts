export type MoodId = "calm" | "focus" | "neutral" | "frustrated" | "tilt";

export const MOOD_OPTIONS: { id: MoodId }[] = [
  { id: "calm" },
  { id: "focus" },
  { id: "neutral" },
  { id: "frustrated" },
  { id: "tilt" },
];

// Notas guardadas antes del paquete de mascota tienen el mood como emoji plano.
const LEGACY_EMOJI_TO_ID: Record<string, MoodId> = {
  "🧘": "calm",
  "🎯": "focus",
  "😐": "neutral",
  "😤": "frustrated",
  "🔥": "tilt",
};

export function resolveMoodId(stored: string | null | undefined): MoodId | null {
  if (!stored) return null;
  if (stored in LEGACY_EMOJI_TO_ID) return LEGACY_EMOJI_TO_ID[stored];
  if (MOOD_OPTIONS.some(m => m.id === stored)) return stored as MoodId;
  return null;
}

export type ReactionId = "breathe" | "focus" | "inspire" | "reflect" | "identify";

export const REACTIONS: { id: ReactionId }[] = [
  { id: "breathe" },
  { id: "focus" },
  { id: "inspire" },
  { id: "reflect" },
  { id: "identify" },
];
