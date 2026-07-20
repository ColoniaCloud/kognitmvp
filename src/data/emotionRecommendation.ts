import mascotFrustrated from "@/assets/mascot-frustrated.png";
import mascotFear from "@/assets/mascot-fear.png";
import mascotOverthinking from "@/assets/mascot-overthinking.png";
import mascotOverwhelmed from "@/assets/mascot-overwhelmed.png";
import mascotNeutral from "@/assets/mascot-neutral.png";
import mascotAngry from "@/assets/mascot-angry.png";

export type BreathingMode = "fast" | "deep";
export type EmotionId = "frustration" | "fear" | "overthinking" | "tilt" | "unmotivated" | "overwhelm";

export const EMOTION_RECOMMENDATION: Record<EmotionId, { mode: BreathingMode; duration: number; mascot: string }> = {
  frustration: { mode: "deep", duration: 90, mascot: mascotFrustrated },
  fear: { mode: "fast", duration: 35, mascot: mascotFear },
  overthinking: { mode: "fast", duration: 35, mascot: mascotOverthinking },
  overwhelm: { mode: "fast", duration: 35, mascot: mascotOverwhelmed },
  unmotivated: { mode: "deep", duration: 90, mascot: mascotNeutral },
  tilt: { mode: "deep", duration: 90, mascot: mascotAngry },
};
