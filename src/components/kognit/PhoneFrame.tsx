import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
  /** Chrome fijo al pie de la pantalla del teléfono (ej. la barra de navegación), fuera del área que scrollea. */
  overlay?: ReactNode;
  /**
   * Fondo de la pantalla del teléfono. Lo pinta el marco y no la pantalla que va adentro
   * porque `--gradient-hero` recalcula sus radiales según el tamaño de cada caja: si lo
   * pintaran las dos, quedarían dos degradés desfasados (mismo motivo por el que en /app
   * lo pinta el `AppShell`). "deep" es para el flujo oscuro del protocolo de reset.
   */
  surface?: "hero" | "deep";
}

const SURFACES = {
  hero: "bg-gradient-hero",
  deep: "bg-gradient-deep",
} as const;

export const PhoneFrame = ({ children, label, overlay, surface = "hero" }: Props) => (
  <div className="flex flex-col items-center gap-3">
    <div
      className="relative w-[85vw] max-w-[380px] rounded-[3rem] bg-foreground/90 p-3 shadow-card md:w-[380px]"
      style={{ aspectRatio: "380 / 780" }}>
      <div className="absolute inset-0 rounded-[3rem] ring-1 ring-foreground/10 pointer-events-none" />
      <div className={`relative w-full h-full rounded-[2.4rem] overflow-hidden ${SURFACES[surface]}`}>
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 rounded-full bg-foreground/90 z-50" />
        {/* Status bar */}
        <div className="absolute top-0 inset-x-0 h-10 flex items-center justify-between px-8 text-[11px] font-semibold text-foreground/80 z-40">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2 rounded-sm border border-foreground/60" />
          </span>
        </div>
        <div className="absolute inset-0 pt-10 overflow-y-auto no-scrollbar">{children}</div>
        {overlay && <div className="absolute inset-x-0 bottom-0 z-30">{overlay}</div>}
      </div>
    </div>
    {label && <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">{label}</span>}
  </div>
);
