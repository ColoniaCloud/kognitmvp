export type MoodId = "calm" | "focus" | "motivated" | "neutral" | "frustrated" | "tilt";

// El orden es el que se ve en la grilla de 3×2 del Home: arriba los estados en los
// que uno quiere estar, ordenados por energía (calma → foco → impulso); abajo el
// neutro y los dos que piden un reset.
export const MOOD_OPTIONS: { id: MoodId }[] = [
  { id: "calm" },
  { id: "focus" },
  { id: "motivated" },
  { id: "neutral" },
  { id: "frustrated" },
  { id: "tilt" },
];

// La fila de abajo de la grilla. El Home usa esta división para decidir qué
// ofrecer: en los estados de arriba propone o recuerda el ancla de calma, en
// estos tres ofrece el Reset y nada más. "neutral" cae de este lado a
// propósito: no es un mal estado, pero es del que hay que salir.
export const RESET_MOODS: MoodId[] = ["neutral", "frustrated", "tilt"];

export function needsReset(mood: MoodId | null): boolean {
  return mood !== null && RESET_MOODS.includes(mood);
}

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
