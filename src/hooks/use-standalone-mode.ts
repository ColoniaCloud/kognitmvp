import { useEffect, useState } from "react";

// Detecta si la PWA corre "standalone" (instalada, sin la barra de navegación
// del browser) — Chrome/Edge/Android exponen esto vía la media query
// display-mode; iOS Safari no la soporta y usa en cambio navigator.standalone.
function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

export function useStandaloneMode(): boolean {
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay);

  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsStandalone(isStandaloneDisplay());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isStandalone;
}
