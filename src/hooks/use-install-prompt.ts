import { useEffect, useState } from "react";

// Chrome/Edge/Android disparan este evento cuando la PWA cumple los criterios
// de instalabilidad (manifest + service worker + iconos). No existe en iOS Safari.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  };

  return { canInstall: !!deferredEvent && !installed, promptInstall };
}
