const KEYS = {
  darkMode: "kognit:dark-mode",
  sound: "kognit:sound-enabled",
  vibration: "kognit:vibration-enabled",
  notificationsEnabled: "kognit:notifications-enabled",
  notificationSound: "kognit:notification-sound",
  calmAnchorPhrase: "kognit:calm-anchor-phrase",
  proTrialJoined: "kognit:pro-trial-joined",
  proTrialSeen: "kognit:pro-trial-seen",
} as const;

export function getDarkMode(): boolean {
  return localStorage.getItem(KEYS.darkMode) === "1";
}

export function setDarkMode(enabled: boolean) {
  localStorage.setItem(KEYS.darkMode, enabled ? "1" : "0");
  document.documentElement.classList.toggle("dark", enabled);
}

export function applyStoredDarkMode() {
  document.documentElement.classList.toggle("dark", getDarkMode());
}

export function getSoundEnabled(): boolean {
  return localStorage.getItem(KEYS.sound) === "1";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(KEYS.sound, enabled ? "1" : "0");
}

export function getVibrationEnabled(): boolean {
  return localStorage.getItem(KEYS.vibration) !== "0";
}

export function setVibrationEnabled(enabled: boolean) {
  localStorage.setItem(KEYS.vibration, enabled ? "1" : "0");
}

/** Sonido del recordatorio diario. `classic` es el default. */
export const NOTIFICATION_SOUNDS = ["soft", "classic", "alert"] as const;
export type NotificationSoundId = (typeof NOTIFICATION_SOUNDS)[number];

export function getNotificationsEnabled(): boolean {
  return localStorage.getItem(KEYS.notificationsEnabled) !== "0";
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(KEYS.notificationsEnabled, enabled ? "1" : "0");
}

export function getNotificationSound(): NotificationSoundId {
  const stored = localStorage.getItem(KEYS.notificationSound);
  return (NOTIFICATION_SOUNDS as readonly string[]).includes(stored ?? "")
    ? (stored as NotificationSoundId)
    : "classic";
}

export function setNotificationSound(id: NotificationSoundId) {
  localStorage.setItem(KEYS.notificationSound, id);
}

export function getCalmAnchorPhrase(): string {
  return localStorage.getItem(KEYS.calmAnchorPhrase) ?? "";
}

export function setCalmAnchorPhrase(phrase: string) {
  localStorage.setItem(KEYS.calmAnchorPhrase, phrase);
}

/**
 * Modal del programa de testers (Pro gratis por 6 meses). Se muestra una vez por
 * sesión del navegador (sessionStorage) para no interrumpir en cada navegación, y deja
 * de aparecer para siempre (localStorage) una vez que el usuario acepta sumarse.
 */
export function hasJoinedProTrial(): boolean {
  return localStorage.getItem(KEYS.proTrialJoined) === "1";
}

export function markProTrialJoined() {
  localStorage.setItem(KEYS.proTrialJoined, "1");
}

export function hasSeenProTrialThisSession(): boolean {
  return sessionStorage.getItem(KEYS.proTrialSeen) === "1";
}

export function markProTrialSeenThisSession() {
  sessionStorage.setItem(KEYS.proTrialSeen, "1");
}
