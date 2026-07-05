import { MascotEmoji } from "./MascotEmoji";
import { resolveMoodId, type MoodId, type ReactionId } from "@/data/moods";
import mascotNeutral from "@/assets/mascot-neutral.png";
import mascotAngry from "@/assets/mascot-angry.png";
import mascotWorried from "@/assets/mascot-worried.png";
import mascotMeditating from "@/assets/mascot-meditating.png";
import mascotFocus from "@/assets/mascot-focus.png";
import mascotFrustrated from "@/assets/mascot-frustrated.png";
import mascotInspired from "@/assets/mascot-inspired.png";

interface Props {
  size?: number;
  className?: string;
}

type Adjust = "none" | "recolor";

const ADJUST_CLASS: Record<Adjust, string> = {
  none: "",
  recolor: "mascot-recolor", // todavía verde/turquesa → recolorea a azul
};

const img = (src: string, size: number, className: string, adjust: Adjust = "none") => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    style={{ width: size, height: size }}
    className={`object-contain ${ADJUST_CLASS[adjust]} ${className}`}
  />
);

export const MoodIcon = ({ mood, size = 24, className = "" }: Props & { mood: string | null | undefined }) => {
  const id = resolveMoodId(mood);
  return img(moodMascotSrc(id), size, className);
};

// Mismo mapeo que MoodIcon, pero devuelve el src crudo — para usar la mascota
// del estado también en ilustraciones grandes (no solo íconos chicos).
export function moodMascotSrc(id: MoodId | null): string {
  switch (id) {
    case "calm":
      return mascotMeditating;
    case "focus":
      return mascotFocus;
    case "frustrated":
      return mascotFrustrated;
    case "tilt":
      return mascotAngry;
    case "neutral":
    default:
      return mascotNeutral;
  }
}

export const ReactionIcon = ({ reaction, size = 20, className = "" }: Props & { reaction: ReactionId }) => {
  switch (reaction) {
    case "breathe":
      return img(mascotMeditating, size, className);
    case "focus":
      return img(mascotFocus, size, className);
    case "inspire":
      return img(mascotInspired, size, className);
    case "reflect":
      return img(mascotWorried, size, className, "recolor");
    case "identify":
      return <MascotEmoji pose="bond" size={size} className={className} />;
  }
};
