interface Props {
  pose: "bond";
  size?: number;
  className?: string;
}

/**
 * Ícono simple en el estilo de la mascota (cabeza-neurona + ramas + piernas),
 * dibujado a mano en SVG — para la única pose que todavía no tiene ilustración
 * real (el resto usa los PNG reales en src/assets/).
 */
export const MascotEmoji = ({ pose, size = 28, className = "" }: Props) => {
  const face = FACES[pose];
  const overlay = OVERLAYS[pose];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
    >
      {/* Ramas */}
      <g strokeWidth={3} strokeLinecap="round" opacity={0.85}>
        <path d="M50 24 L50 8" />
        <path d="M50 20 L36 6" />
        <path d="M50 20 L64 6" />
        <path d="M34 28 L18 18" />
        <path d="M66 28 L82 18" />
      </g>
      {/* Cabeza */}
      <circle cx="50" cy="48" r="22" strokeWidth={3} />
      {/* Piernas */}
      <g strokeWidth={3} strokeLinecap="round">
        <path d="M42 68 L38 86 L32 86" />
        <path d="M58 68 L62 86 L68 86" />
      </g>
      {face}
      {overlay}
    </svg>
  );
};

const FACES: Record<Props["pose"], JSX.Element> = {
  bond: (
    <g strokeWidth={3} strokeLinecap="round">
      <path d="M42 47 Q45 44 48 47" />
      <path d="M52 47 Q55 44 58 47" />
      <path d="M44 55 Q50 60 56 55" />
    </g>
  ),
};

const OVERLAYS: Record<Props["pose"], JSX.Element | null> = {
  bond: (
    <g strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}>
      <path d="M78 58 C78 52 70 52 70 58 C70 63 78 70 78 70 C78 70 86 63 86 58 C86 52 78 52 78 58 Z" />
    </g>
  ),
};
