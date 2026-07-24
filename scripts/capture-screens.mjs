/**
 * Genera las capturas de public/screens/ que muestra el carrusel de la landing
 * (src/components/site/AppScreensCarousel.tsx).
 *
 *   bun dev                          # en otra terminal
 *   node scripts/capture-screens.mjs
 *
 * Requiere `playwright` y `sharp` instalados (ver docs/capturas.md) — son
 * dependencias solo de esta herramienta, no de la app, así que no están en
 * package.json.
 *
 * Cómo funciona: abre la ruta de dev /__capture/:screen (src/pages/CaptureScreen.tsx)
 * en un viewport de iPhone, con una sesión de Supabase falsa en localStorage y todas
 * las llamadas al backend interceptadas y respondidas con los datos de demo de este
 * archivo. Nunca toca la base real: si querés cambiar lo que se ve en las capturas
 * (nombres, notas de la comunidad, racha, etc.), editá las constantes de acá abajo.
 */
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE_URL = process.env.CAPTURE_URL ?? "http://localhost:8080";
const OUT_DIR = "public/screens";
const SUPABASE_HOST = "wpjufgefhcyncseuikel.supabase.co";
const SUPABASE_REF = "wpjufgefhcyncseuikel";
const UID = "11111111-1111-4111-8111-111111111111";

// Ancho final de las imágenes. 780 = 390 CSS px × 2 (retina) — se capturan a ×3 y se
// bajan a ×2 al pasar a webp, que da mejor resultado que capturar directo a ×2.
const OUTPUT_WIDTH = 780;
const SCREENS = ["home", "tilt", "cards", "calendar", "community", "profile"];

// ---------------------------------------------------------------- sesión falsa
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const EXP = now + 60 * 60 * 24 * 365;

// JWT sin firma válida: nunca sale a la red porque interceptamos todo el host de
// Supabase; solo tiene que parsear y no estar vencido para que supabase-js lo acepte.
const JWT = [
  b64({ alg: "HS256", typ: "JWT" }),
  b64({ sub: UID, aud: "authenticated", role: "authenticated", email: "martin@kognit.app", exp: EXP, iat: now }),
  "ZmFrZS1zaWduYXR1cmU",
].join(".");

const USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "martin@kognit.app",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date(Date.now() - 86400e3 * 90).toISOString(),
  updated_at: new Date().toISOString(),
};

const SESSION = {
  access_token: JWT,
  token_type: "bearer",
  expires_in: 31536000,
  expires_at: EXP,
  refresh_token: "demo-refresh-token",
  user: USER,
};

// ---------------------------------------------------------------- datos de demo
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const daysAgo = (d, h = 12) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(h, 20, 0, 0);
  return x.toISOString();
};

const PEERS = [
  { id: "22222222-2222-4222-8222-222222222222", display_name: "Lucía R.", avatar_url: null },
  { id: "33333333-3333-4333-8333-333333333333", display_name: "Nico F.", avatar_url: null },
  { id: "44444444-4444-4444-8444-444444444444", display_name: "Sofi M.", avatar_url: null },
  { id: UID, display_name: "Martín", avatar_url: null },
];

const PUBLIC_NOTES = [
  {
    id: "n1", user_id: PEERS[0].id, title: "Solté una mano que quería pagar",
    content: "River incómodo, sabía que estaba atrás. Respiré tres veces antes de actuar y foldeé. Chiquito, pero es la disciplina que venía buscando.",
    mood: "focus", image_url: null, created_at: hoursAgo(2),
  },
  {
    id: "n2", user_id: PEERS[1].id, title: "Bad beat y no me fui al tilt",
    content: "Me metieron un runner runner en un pote grande. Antes cerraba tres mesas más de bronca. Hoy hice el reset de 90 segundos y seguí jugando igual de bien.",
    mood: "calm", image_url: null, created_at: hoursAgo(7),
  },
  {
    id: "n3", user_id: PEERS[2].id, title: "Me está costando cerrar la sesión a horario",
    content: "Sigo jugando cansada porque quiero recuperar. Lo escribo acá para tenerlo presente mañana: el límite es el límite.",
    mood: "frustrated", image_url: null, created_at: hoursAgo(26),
  },
];

const NOTE_REACTIONS = [
  { note_id: "n1", reaction: "focus", user_id: PEERS[1].id },
  { note_id: "n1", reaction: "focus", user_id: PEERS[2].id },
  { note_id: "n1", reaction: "identify", user_id: UID },
  { note_id: "n2", reaction: "breathe", user_id: PEERS[0].id },
  { note_id: "n2", reaction: "inspire", user_id: PEERS[2].id },
  { note_id: "n2", reaction: "inspire", user_id: UID },
  { note_id: "n3", reaction: "identify", user_id: PEERS[0].id },
  { note_id: "n3", reaction: "reflect", user_id: PEERS[1].id },
];

// Notas propias del mes en curso — pintan los días del calendario del diario mental.
const MY_NOTES = [
  { id: "m1", user_id: UID, title: "Sesión sólida", content: "Tres horas enfocado, sin abrir otra pestaña. El ancla de calma funcionó.", mood: "focus", visibility: "private", created_at: daysAgo(0, 11) },
  { id: "m2", user_id: UID, title: "Arranqué caliente", content: "Venía de discutir antes de sentarme. Hice el reset rápido y recién ahí abrí las mesas.", mood: "frustrated", visibility: "private", created_at: daysAgo(1, 20) },
  { id: "m3", user_id: UID, title: "Día tranquilo", content: "Poco volumen pero decisiones limpias.", mood: "calm", visibility: "private", created_at: daysAgo(3, 18) },
  { id: "m4", user_id: UID, title: "Revisé manos en frío", content: "Sin resultados encima, se piensa distinto.", mood: "neutral", visibility: "private", created_at: daysAgo(5, 10) },
  { id: "m5", user_id: UID, title: "Corté a tiempo", content: "Sentí el tilt subiendo y cerré. Primera vez que lo hago sin discutirlo conmigo mismo.", mood: "calm", visibility: "private", created_at: daysAgo(8, 22) },
];

// Sesiones de reset — alimentan "días con actividad" y el gráfico de foco semanal.
const POST_INTENSITIES = [3, 2, 4, 2, 3, 2, 1, 3, 2, 2, 4, 3, 2, 1];
const RESET_SESSIONS = POST_INTENSITIES
  .map((post_intensity, d) => ({
    id: `r${d}`, user_id: UID, mode: d % 3 === 0 ? "deep" : "fast",
    pre_intensity: 7, post_intensity, created_at: daysAgo(d, 19),
  }))
  .filter((_, d) => d % 5 !== 4); // algún día sin actividad, para que no parezca sintético

const PROFILE = {
  id: UID, display_name: "Martín", avatar_url: null,
  focus_level: 78, emotional_control: 71, total_resets: 34, streak_days: 12, xp: 1840,
  reminder_enabled: true, reminder_time: "20:00",
  plan: "pro", plan_status: "authorized", plan_current_period_end: null,
  onboarding_completed_at: new Date(Date.now() - 86400e3 * 80).toISOString(),
  onboarding_goals: ["tilt"], onboarding_emotions: ["frustration"],
  created_at: new Date(Date.now() - 86400e3 * 90).toISOString(), updated_at: new Date().toISOString(),
};

// ---------------------------------------------------------------- interceptor
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "*",
  "access-control-expose-headers": "content-range, x-supabase-api-version",
};

function restBody(url) {
  const table = url.pathname.replace("/rest/v1/", "");
  switch (table) {
    case "notes":
      // Comunidad pide las públicas; el diario mental, las del usuario.
      return url.searchParams.get("visibility") === "eq.public" ? PUBLIC_NOTES : MY_NOTES;
    case "note_reactions":
      return NOTE_REACTIONS;
    case "profiles":
      return url.searchParams.get("id")?.startsWith("in.") ? PEERS : [PROFILE];
    case "reset_sessions":
      return RESET_SESSIONS;
    default:
      return [];
  }
}

// ---------------------------------------------------------------- captura
const raw = mkdtempSync(join(tmpdir(), "kognit-shots-"));
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "es-AR",
  timezoneId: "America/Argentina/Buenos_Aires",
  colorScheme: "light",
});

await context.addInitScript(([session, key]) => {
  // El modal del programa de testers aparece a los 10s en cualquier ruta.
  sessionStorage.setItem("kognit:pro-trial-seen", "1");
  localStorage.setItem("kognit:pro-trial-joined", "1");
  localStorage.setItem(key, JSON.stringify(session));
}, [SESSION, `sb-${SUPABASE_REF}-auth-token`]);

await context.route(`**://${SUPABASE_HOST}/**`, async (route) => {
  const request = route.request();
  if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS, body: "" });

  const url = new URL(request.url());
  let body;
  if (url.pathname.startsWith("/rest/v1/")) body = restBody(url);
  else if (url.pathname === "/auth/v1/user") body = USER;
  else if (url.pathname.startsWith("/auth/v1/token")) body = SESSION;
  else body = [];

  // .single()/.maybeSingle() esperan un objeto, no un array.
  if ((request.headers()["accept"] ?? "").includes("vnd.pgrst.object") && Array.isArray(body)) {
    body = body[0] ?? null;
  }

  await route.fulfill({
    status: 200,
    headers: { ...CORS, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
});

const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && console.warn("  [console]", m.text().slice(0, 200)));

for (const screen of SCREENS) {
  const png = join(raw, `${screen}.png`);
  await page.goto(`${BASE_URL}/__capture/${screen}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // animaciones de entrada (framer-motion)
  await page.screenshot({ path: png });

  const info = await sharp(png)
    .resize({ width: OUTPUT_WIDTH })
    .webp({ quality: 86 })
    .toFile(join(OUT_DIR, `${screen}.webp`));
  console.log(`${OUT_DIR}/${screen}.webp — ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
}

await browser.close();
rmSync(raw, { recursive: true, force: true });
