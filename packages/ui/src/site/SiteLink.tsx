import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Link a una página del sitio público.
 *
 * El header y el footer los usan las dos apps. Dentro del sitio (`apps/web`) la
 * navegación es del router y no recarga la página. Dentro de la app (`apps/app`,
 * montada con `basename="/app"`) un `<Link to="/precio">` resolvería a /app/precio,
 * que no existe: ahí hace falta una navegación real del browser al otro build.
 */
interface SiteLinkProps {
  to: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}

export const SiteLink = ({ to, external, className, children }: SiteLinkProps) => {
  if (external) {
    return <a href={to} className={className}>{children}</a>;
  }
  return <Link to={to} className={className}>{children}</Link>;
};
