import { MascotEmoji } from "./MascotEmoji";
import { resolveMoodId, type MoodId, type ReactionId } from "@/data/moods";
import mascotNeutral from "@/assets/mascot-neutral.png";
import mascotAngry from "@/assets/mascot-angry.png";
import mascotWorried from "@/assets/mascot-worried.png";
import mascotMeditating from "@/assets/mascot-meditating.png";
import mascotFocus from "@/assets/mascot-focus.png";
// El estado "enfocado" ya tiene su ilustración vectorial: escala sin perder nitidez
// en la mascota grande del Home, que es donde más se nota. El PNG sigue en uso para
// la reacción de comunidad, que todavía no tiene versión SVG.
import mascotFocusSvg from "@/assets/mascot-focus.svg";
import mascotMotivatedSvg from "@/assets/mascot-motivated.svg";
import mascotFrustrated from "@/assets/mascot-frustrated.png";
import mascotInspired from "@/assets/mascot-inspired.png";

interface Props {
  size?: number;
  /**
   * Clases de tamaño (ej. `"w-5 h-5 md:w-9 md:h-9"`) para cuando el ícono tiene que
   * cambiar por breakpoint. Reemplazan a `size`: el tamaño fijo va como `style`
   * inline y eso le gana a cualquier clase de Tailwind, así que no se pueden mezclar.
   */
  sizeClassName?: string;
  className?: string;
}

type Adjust = "none" | "recolor";

const ADJUST_CLASS: Record<Adjust, string> = {
  none: "",
  recolor: "mascot-recolor", // todavía verde/turquesa → recolorea a azul
};

const img = (
  src: string,
  size: number,
  className: string,
  adjust: Adjust = "none",
  sizeClassName?: string,
) => (
  <img
    src={src}
    alt=""
    aria-hidden="true"
    style={sizeClassName ? undefined : { width: size, height: size }}
    className={`object-contain ${ADJUST_CLASS[adjust]} ${sizeClassName ?? ""} ${className}`}
  />
);

export const MoodIcon = ({ mood, size = 24, sizeClassName, className = "" }: Props & { mood: string | null | undefined }) => {
  const id = resolveMoodId(mood);
  return img(moodMascotSrc(id), size, className, "none", sizeClassName);
};

// Mismo mapeo que MoodIcon, pero devuelve el src crudo — para usar la mascota
// del estado también en ilustraciones grandes (no solo íconos chicos).
export function moodMascotSrc(id: MoodId | null): string {
  switch (id) {
    case "calm":
      return mascotMeditating;
    case "focus":
      return mascotFocusSvg;
    case "motivated":
      return mascotMotivatedSvg;
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
