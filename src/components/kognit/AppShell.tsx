import { ReactNode } from "react";
import { BottomNav } from "@/components/kognit/BottomNav";
import { SideNav } from "@/components/kognit/SideNav";
import { cn } from "@/lib/utils";

type Key = "home" | "cards" | "calendar" | "community" | "profile";

interface Props {
  /** Item resaltado en la navegación. `null` en pantallas que no mapean a una sección. */
  navActive: Key | null;
  /** Barra inferior en mobile — se oculta en las pantallas de flujo completo. */
  showBottomNav: boolean;
  /** Barra lateral en desktop — solo se oculta en el flujo inmersivo de Tilt. */
  showSideNav: boolean;
  /** Pantallas de alto fijo sin scroll de página (mazo de Cartas, protocolo Tilt). */
  fullHeight?: boolean;
  /** Ancho de la columna de contenido en desktop. */
  width?: "narrow" | "default";
  /** Fondo de la página. Debe coincidir con el de la pantalla para que en desktop no se
   *  vea una franja de otro color a los costados de la columna. */
  surface?: "hero" | "deep";
  onNavigate?: (k: Key) => void;
  onReset?: () => void;
  children: ReactNode;
}

const WIDTHS = {
  narrow: "md:max-w-md",
  default: "md:max-w-2xl",
} as const;

const SURFACES = {
  hero: "bg-gradient-hero",
  deep: "bg-gradient-deep",
} as const;

/**
 * Layout de /app: barra lateral en desktop, barra inferior en mobile, y el contenido
 * de la pantalla en una única columna centrada. Las pantallas están diseñadas
 * mobile-first, así que en desktop se limitan a un ancho de lectura en vez de estirarse.
 */
export const AppShell = ({
  navActive,
  showBottomNav,
  showSideNav,
  fullHeight = false,
  width = "default",
  surface = "hero",
  onNavigate,
  onReset,
  children,
}: Props) => (
  <div className={cn(SURFACES[surface], fullHeight ? "h-dvh overflow-hidden" : "min-h-dvh")}>
    {showSideNav && <SideNav active={navActive} onChange={onNavigate} onReset={onReset} />}

    <div className={cn("h-full", showSideNav && "md:pl-64")}>
      <main className={cn("mx-auto w-full h-full", WIDTHS[width])}>{children}</main>
    </div>

    {showBottomNav && navActive && (
      <BottomNav active={navActive} onChange={onNavigate} onReset={onReset} className="md:hidden" />
    )}
  </div>
);
