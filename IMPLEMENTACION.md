# IMPLEMENTACION.md — Plan de implementación para el MVP de Kognit

> Basado en `AGENTE.md` (análisis técnico del 2026-07-05) y en las decisiones de alcance tomadas para el MVP:
> - **Monetización**: sí, incluida en el MVP (plan Free + Kognit Pro pago).
> - **Notificaciones**: push reales (service worker + Web Push + trigger backend).
> - **PWA**: instalable completa (manifest + service worker + iconos).

## Cómo usar este documento

Cada sprint tiene una checklist. A medida que se completan tareas, marcar `- [x]`. Cuando se termina un sprint completo:

1. Marcar todos sus checkboxes.
2. Cambiar el estado del sprint en la tabla de abajo a `✅ Completado` y agregar la fecha real de cierre.
3. Si algo del sprint quedó afuera, moverlo explícitamente al backlog del sprint siguiente (no dejarlo tachado sin hacerlo).

No borrar sprints completados — este documento es el historial de avance del MVP.

## Estado general

| # | Sprint | Foco | Estado | Cierre |
|---|---|---|---|---|
| 0 | [Housekeeping y limpieza](#sprint-0--housekeeping-y-limpieza) | Sacar mock data y placeholders del flujo real | ✅ Completado | 2026-07-05 |
| 1 | [Onboarding y logros reales](#sprint-1--onboarding-y-logros-reales) | Conectar onboarding a Supabase, logros basados en actividad | ✅ Completado | 2026-07-05 |
| 2 | [PWA instalable](#sprint-2--pwa-instalable) | Manifest, service worker, iconos, instalación | 🟡 En curso (falta QA manual en dispositivo real) | — |
| 3 | [Notificaciones push](#sprint-3--notificaciones-push-reales) | Recordatorio diario funcionando de verdad | 🟡 En curso (falta deploy + QA en dispositivo real) | — |
| 4 | [Monetización](#sprint-4--monetización-planes-y-pagos) | Plan Free/Pro, Mercado Pago, paywall | 🟡 En curso (falta `MERCADOPAGO_WEBHOOK_SECRET` completo + probar el flujo de punta a punta en sandbox) | — |
| 5 | [Testing y QA](#sprint-5--testing-y-qa) | Cobertura de la lógica crítica | ⬜ Pendiente | — |
| 6 | [Pulido y lanzamiento](#sprint-6--pulido-y-lanzamiento) | Performance, copy, checklist de salida | ⬜ Pendiente | — |

Estados posibles: `⬜ Pendiente` · `🟡 En curso` · `✅ Completado` · `⏸️ Pausado`.

---

## Sprint 0 — Housekeeping y limpieza

**Por qué primero**: varios de estos cambios tocan los mismos archivos que van a modificar los sprints siguientes (Perfil, Calendar). Conviene dejar el terreno limpio antes de construir onboarding, logros y paywall encima.

- [x] `Calendar.tsx`: se eliminó `moodByDay` (mock fijo por día) y se reemplazó por `dayMoodMap`, calculado a partir de las notas reales del usuario (`resolveMoodId` sobre `rows`, filtrado por mes/año actual). La grilla del calendario ahora solo pinta días donde el usuario realmente registró un mood.
- [x] `Calendar.tsx`: se sacó `fallbackNotes`/`FALLBACK_NOTE_COLORS` (notas "· ejemplo") y se reemplazó por un estado vacío real (`calendar.empty.title`/`subtitle`, agregado a los 10 idiomas) cuando el día seleccionado no tiene notas.
- [x] **Hallazgo extra durante la limpieza**: `calendar.monthSummary`/`monthDetail` también eran texto fijo ("14 días enfocado · 3 resets · 9 sesiones registradas") para *todos* los usuarios. Se reemplazó por `monthStats` (activeDays/resets/notes) calculado con una query real a `notes` y `reset_sessions` del mes visible, con keys i18n interpoladas (`{{count}}`, `{{resets}}`, `{{notes}}`) en los 10 idiomas.
- [x] `Profile.tsx` / `MobileApp.tsx`: se unificó el default de `focusLevel`/`emotionalControl` en `MobileApp.tsx` a `50` (antes `60`), que es el `DEFAULT` real de la columna en Supabase (migración `20260503002741`). Los defaults `72`/`64` de `Profile.tsx` quedan documentados con un comentario: solo se usan en el showcase de `Index.tsx` (`<ProfileScreen />` sin props), nunca en `/app` real.
- [x] `Profile.tsx:210`: se quitó el botón "Ver todos" de logros (no tenía `onClick`) y la key `profile.achievementsAll` de los 10 idiomas. Se reconecta a una vista real en el Sprint 1 cuando los logros dejen de ser una lista fija.
- [x] `Index.tsx`: se sacaron los enlaces `href="#"` de App Store/Google Play (íconos `Apple`/`Smartphone` y las keys `landing.appStoreLabel/appStoreName/googlePlayLabel/googlePlayName` en los 10 idiomas). Vuelven en el Sprint 2 como CTA de instalación PWA.
- [x] Dependencias sin uso real:
  - [x] **TanStack Query**: se deja instalado, adoptar recién en los sprints de notificaciones/monetización (no se tocaron las pantallas existentes, tal como estaba previsto).
  - [x] **React Hook Form + Zod**: adoptado en `Auth.tsx` — login/signup/forgot ahora usan `useForm` + `zodResolver`, con mensajes de error traducidos (`auth.errors.*`, agregado a los 10 idiomas) en vez de solo `required`/`minLength` del HTML.
  - [x] **Recharts**: se quitó del `package.json` y se borró `src/components/ui/chart.tsx` (wrapper de shadcn), que era el único lugar que lo importaba — el gráfico de foco semanal sigue siendo el de `<div>` manual en `Calendar.tsx`.
- [x] Confirmado: `package-lock.json` restaurado desde `HEAD` (ver sesión anterior) — el proyecto usa `bun.lockb`, no npm.

**Validación real ejecutada** (Bun instalado en la máquina vía `npm install -g bun`, luego `bun install` para regenerar `bun.lockb`):
- `bun run test` → 1 passed (el placeholder existente; no había suite real que correr).
- `bunx tsc --noEmit` → sin errores de tipos.
- `bun run lint` → 26 problemas (15 errores, 11 warnings). Se comparó contra el lint de `HEAD` sin los cambios de este sprint (vía `git stash`/`git stash pop`): en `HEAD` había **28** (17 errores, 11 warnings) — los mismos, más los 2 errores de `no-explicit-any` que tenía `components/ui/chart.tsx` (borrado en este sprint). **Cero errores nuevos introducidos**; los 26 restantes son deuda técnica preexistente fuera del alcance de este sprint (`sound.ts`, `Community.tsx`, `Home.tsx`, `Tilt.tsx`, `tailwind.config.ts`, warnings de `react-refresh` en varios `components/ui/*`).

---

## Sprint 1 — Onboarding y logros reales

- [x] Schema: migración `supabase/migrations/20260705120000_onboarding_and_metrics.sql` agrega `onboarding_emotions text[]`, `onboarding_goals text[]`, `onboarding_completed_at timestamptz` a `profiles`. `types.ts` actualizado a mano (no hay CLI de Supabase conectada en este entorno para `gen types`).
- [x] `Onboarding.tsx` dejó de ser decorativo:
  - [x] `MobileApp.tsx` ahora gatea: mientras `profile.onboarding_completed_at` sea `null`, se renderiza `<OnboardingScreen>` en vez del shell normal (antes de la vista `home`), tanto en mobile como en el frame de desktop.
  - [x] `onSubmit(emotions, goals)` persiste la selección en Supabase al pasar de `"form"` a `"welcome"`; `onFinish()` (nuevo CTA "Empezar a entrenar" en la pantalla de bienvenida, antes un callejón sin salida sin botón) marca `onboarding_completed_at`.
  - [x] `Home.tsx` recibe `primaryGoal` (primer objetivo elegido) y muestra una línea personalizada (`home.goalMessages.<goalId>`) debajo del nombre.
- [x] Logros reales (`src/data/achievements.ts`, reemplaza `profile.achievements` fijo):
  - [x] 5 logros definidos: `first_reset`, `streak_3`, `ten_resets`, `first_public_note`, `first_reaction_received`.
  - [x] `Profile.tsx` calcula el progreso real: `totalResets`/`streakDays` vía props (ya calculados en `MobileApp.tsx`), `hasPublicNote`/`hasReceivedReaction` vía queries a `notes` y `note_reactions` (excluyendo reacciones propias).
  - [x] Render con estado desbloqueado/bloqueado (`opacity-50 grayscale` + ícono de candado) en vez de la lista fija.
- [x] `focus_level`/`emotional_control`: confirmado que no había ningún trigger ni lógica que los actualizara (quedaban pisados en el `DEFAULT 50` de la columna para siempre). Se creó `src/lib/metrics.ts` con `computeProfileMetrics()`: foco/control emocional se calculan sobre los `reset_sessions` de los últimos 30 días (score igual al de `focusWeek` en `Calendar.tsx`); `MobileApp.tsx` recalcula y persiste en cada apertura de la app.
- [x] **Hallazgo extra**: `streak_days` y `xp` tenían el mismo problema (nunca se escribían, siempre en el default `0`) — inconsistente con construir logros reales que dependen de ellos. `computeProfileMetrics()` los calcula también: `xp` acumulado de por vida (10 por reset + 5 por nota, nunca decrece), `streak_days` como racha de días consecutivos con actividad (nota o reset), derivada de todo el historial, no solo la ventana de 30 días usada para foco/control emocional.

**Validación real ejecutada** (`bun install`, `bunx tsc --noEmit`, `bun run lint`, `bun run test` en `kognitapp-mvp`):
- `tsc --noEmit` → sin errores.
- `test` → 1 passed (el mismo placeholder).
- `lint` → 25 problemas (14 errores, 11 warnings), uno menos que el baseline de Sprint 0 (26) — `MobileApp.tsx` dejó de usar `data as any` al tipar el fetch de perfil contra `Database`. Cero errores nuevos.

---

## Sprint 2 — PWA instalable

- [x] `vite-plugin-pwa` instalado y configurado en `vite.config.ts` (estrategia `generateSW`, `registerType: "autoUpdate"`).
- [x] Manifest generado por el propio plugin (no hace falta `public/manifest.json` a mano): nombre "Kognit", `theme_color` `#2E6F9E` y `background_color` `#F8FAFC` (derivados de los tokens `--primary`/`--background` de `index.css`), `display: "standalone"`.
- [x] Set de íconos generado a partir de `kognit-logo.png` (1034×1034) con un script de PowerShell (`System.Drawing`, sin dependencias nuevas): `icon-192.png`, `icon-512.png` (purpose `any`), `maskable-512.png` (purpose `maskable`, contenido al 60% centrado sobre fondo `#2E6F9E`) y `apple-touch-icon.png` (180×180, opaco). Todos en `public/icons/`.
- [x] Service worker (Workbox vía el plugin): precache del shell completo + `navigateFallback: "/index.html"` (rutas de la SPA abren offline) + runtime caching `CacheFirst` para `*.supabase.co/storage/*` y `NetworkFirst` para `*.supabase.co/(rest|auth)/*`.
- [x] CTA de instalación propio: `src/hooks/use-install-prompt.ts` escucha `beforeinstallprompt`/`appinstalled`; botón "Instalar app" en `Index.tsx` (reemplaza el hueco que quedó tras sacar los links muertos de tiendas en Sprint 0), visible solo cuando el navegador realmente puede instalar.
- [x] Offline mínimo: verificado que el precache + `navigateFallback` cubre la apertura de cualquier ruta sin red. No se construyó una pantalla dedicada de "sin conexión" — las pantallas que dependen de Supabase ya degradan a sus estados vacíos/default existentes en vez de crashear (comportamiento ya usado en toda la app, ver `Community.tsx`/`Calendar.tsx`), que es el mínimo pedido por este ítem.
- [x] `CLAUDE.md` actualizado: agregada fila de PWA a la tabla de stack, sección "## PWA" con el detalle de manifest/SW/instalación/regeneración de íconos, y sacada `Recharts` de la tabla (ya no está en el proyecto desde el Sprint 0).
- [ ] **Pendiente manual, no automatizable desde acá**: probar instalación real en un dispositivo Android (Chrome) y en desktop (Chrome/Edge), y confirmar visualmente las limitaciones de iOS Safari (instalación manual vía "Compartir → Agregar a pantalla de inicio", sin `beforeinstallprompt`). Requiere un dispositivo/navegador real, no se puede validar desde este entorno.

**Validación real ejecutada**: `bun add -d vite-plugin-pwa`, `bun run build` (genera `dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest`, íconos copiados a `dist/icons/`, `index.html` con el `<link rel="manifest">` y el script de registro del SW auto-inyectados), `bunx tsc --noEmit` limpio, `bun run lint` → mismos 25 problemas que al cierre del Sprint 1 (cero nuevos), `bun run test` → 1 passed.

---

## Sprint 3 — Notificaciones push reales

- [x] Par de claves VAPID generado (`bunx web-push generate-vapid-keys`). La pública queda en `.env.example` (`VITE_VAPID_PUBLIC_KEY`, vacía en el repo — cada entorno pone la suya); la privada **no se commitea en ningún archivo**, va solo como secret de la Edge Function (`supabase secrets set VAPID_PRIVATE_KEY=...`).
- [x] El service worker de `generateSW` (Sprint 2) no permite código custom — se cambió la estrategia a `injectManifest`: `src/sw.ts` (fuente propia) + `tsconfig.sw.json` (lib `WebWorker`, separado de `tsconfig.app.json` que usa `DOM`, para que no choquen los tipos). `sw.ts` reimplementa el precache/runtime-caching que antes generaba `generateSW` (`workbox-precaching`/`routing`/`strategies`/`expiration`/`cacheable-response`) y agrega los listeners `push` (muestra la notificación) y `notificationclick` (foca la ventana existente o abre `/app`).
- [x] Cliente: `src/lib/push.ts` (`enablePushReminders`/`disablePushReminders`) — al activar el toggle en `Profile.tsx` pide permiso (`Notification.requestPermission`), suscribe (`pushManager.subscribe`) y guarda `endpoint`/`p256dh`/`auth` en `push_subscriptions` (upsert por `endpoint`). Si el permiso se rechaza o el navegador no soporta push, el toggle vuelve solo a apagado (no se llega a guardar `reminder_enabled: true`) y se muestra un toast (`profile.reminders.pushDenied`, en los 10 idiomas).
- [x] Nueva tabla `push_subscriptions` (migración `20260706090000_push_subscriptions.sql`) con RLS por `user_id`, y columna `profiles.reminder_timezone` (se guarda el `Intl.DateTimeFormat().resolvedOptions().timeZone` del navegador cada vez que se toca el recordatorio).
- [x] Edge Function `supabase/functions/send-reminder-push/index.ts`: lee perfiles con `reminder_enabled = true`, compara la hora actual en `reminder_timezone` contra `reminder_time`, y manda el push (librería `web-push` vía `npm:` en Deno) a cada `push_subscriptions` del usuario.
- [x] Cron: migración `20260706090100_reminder_push_cron.sql` — `pg_cron` dispara la función cada minuto vía `pg_net`, usando la service role key guardada en Supabase Vault (no en texto plano en la migración).
- [x] Limpieza de subscriptions muertas: si `web-push` devuelve 404/410, la Edge Function borra esa fila de `push_subscriptions`. Al desactivar el recordatorio o borrar la cuenta (`deleteAccount()` en `Profile.tsx`), se desuscribe del navegador y se borra la fila.
- [ ] **Pendiente manual, no ejecutable desde acá**: no hay proyecto Supabase ni dispositivo real conectados a este entorno. Falta, contra el proyecto real (`urebsukvtbdhtkixyyaw`):
  - Aplicar las 2 migraciones nuevas (`supabase db push` o vía dashboard).
  - Habilitar las extensiones `pg_cron`/`pg_net` y crear el secret de Vault `service_role_key` (una vez).
  - `supabase functions deploy send-reminder-push --no-verify-jwt` (la invoca únicamente el cron interno) y `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`.
  - Probar en un dispositivo Android real (Chrome) que el permiso, la suscripción y la recepción del push funcionan de punta a punta — los navegadores de escritorio simulan distinto que mobile.

**Validación real ejecutada**: `bunx tsc --noEmit` limpio (incluye `src/sw.ts` vía `tsconfig.sw.json`), `bun run build` genera `dist/sw.js` con el código custom de push/notificationclick incluido (confirmado leyendo el bundle), `bun run lint`/`bun run test` sin regresiones respecto al cierre del Sprint 2.

---

## Sprint 4 — Monetización (planes y pagos)

**Tabla de gating final confirmada con el usuario (2026-07-06)** — reemplaza la propuesta inicial de más abajo, que quedó desactualizada:

| Feature | Free | Kognit Pro |
|---|---|---|
| Protocolo Tilt (ambos modos) | ✅ Ilimitado | ✅ Ilimitado |
| Notas privadas (diario) | 4 por mes | Ilimitadas |
| Comunidad | ✅ (feed público) | ✅ |
| Mensajería privada (DMs) | ❌ | ✅ |
| Calendario / Diario | Últimos 10 días | Historial completo |
| Estadísticas personales | Básicas | Detalladas |
| Cartas mentales | 1 carta por día (cualquier categoría) | Ilimitadas |

**Precio**: Kognit Pro — USD 8,90/mes o USD 89,00/año.

> Reemplaza el esquema anterior (cartas por categoría 1/5, calendario con tendencia semanal solo Pro) — ver detalle de la propuesta original más abajo, ya no vigente.

> **Nota**: este sprint se implementó una primera vez con Stripe (commits `953a77e`/`4b7716d`) y se revirtió (`e2e1fa4`) para rehacerlo con **Mercado Pago** — más relevante para el mercado de LATAM al que apunta la app. La arquitectura general (columnas de plan en `profiles`, Edge Function de webhook como única fuente de verdad, gating en `Cards.tsx`/`Calendar.tsx`, cancelar suscripción antes de borrar cuenta) se mantiene conceptualmente igual; cambia el proveedor y su modelo de API (Mercado Pago usa "preferencias" de pago y el objeto `preapproval` para suscripciones recurrentes, en vez de Customer/Subscription/Checkout Session de Stripe).

- [x] Confirmar con negocio la tabla de gating final antes de implementar el paywall — confirmado con el usuario, ver tabla arriba (2026-07-06, reemplaza el esquema de categorías/tendencia semanal).
- [x] Modelo de datos: `plan` (`free`|`pro`), `plan_status`, `mercadopago_customer_id`, `mercadopago_preapproval_id`, `plan_current_period_end` en `profiles` — migración `20260706120000_mercadopago_plans.sql`, protegidas por trigger `protect_plan_columns` (solo service role puede escribirlas).
- [x] Billing mensual + anual con descuento: se modelan como **dos `preapproval_plan` distintos** en Mercado Pago (uno por frecuencia), seleccionados por `MERCADOPAGO_PLAN_ID_MONTHLY`/`MERCADOPAGO_PLAN_ID_ANNUAL` en la Edge Function `create-checkout-preference`.
- [x] Edge Function `create-checkout-preference`: crea una suscripción (`preapproval`) referenciando el `preapproval_plan_id` correspondiente y devuelve `init_point`/`sandbox_init_point` para redirigir.
- [x] Edge Function `mercadopago-webhook`: valida la firma `x-signature` (HMAC-SHA256 con `MERCADOPAGO_WEBHOOK_SECRET`), procesa el topic `subscription_preapproval` y sincroniza `profiles` — única fuente de verdad del plan.
- [x] Edge Function `cancel-subscription`: cancela el `preapproval` del usuario autenticado (`status: "cancelled"`). No existe un "Customer Portal" de Mercado Pago equivalente al de Stripe, así que "gestionar suscripción" en `Profile.tsx` cancela directamente desde la propia app en vez de redirigir a un portal externo.
- [x] Frontend: sección "Kognit Pro" en `Profile.tsx` (reemplaza el badge decorativo, ahora condicionado a `plan === "pro"`) con selector mensual/anual y CTA a Checkout.
- [x] **Refactor de gating (2026-07-06)**: el gating implementado originalmente (cartas por categoría 1/5, calendario con tendencia semanal solo Pro) no coincidía con la tabla final de negocio. Reimplementado:
  - [x] **Cartas** (`Cards.tsx`): pasa de "1 categoría / 5 categorías" a "1 carta random por día (cualquier categoría) / ilimitadas". La carta del día es fija: se sortea una sola vez y se persiste en `profiles` (`free_card_drawn_on`, `free_card_category`, `free_card_index`, migración `20260706130000_free_daily_card.sql`, sin protección de trigger — no son sensibles como `plan`) para que sea la misma si el usuario cierra y reabre la app ese día. El botón "Sacar carta" se deshabilita hasta el día siguiente (hora local del dispositivo, sin normalizar a UTC); Pro sigue mezclando sin límite como hasta ahora.
  - [x] **Calendario** (`Calendar.tsx`): pasa de "tendencia semanal solo Pro" a "últimos 10 días / historial completo". Free no puede navegar (`goPrev`) a meses anteriores a la ventana de 10 días ni seleccionar días bloqueados en la grilla (se muestran con candado, tocar dispara `onUpgrade` en vez de navegar/seleccionar) — pero las estadísticas generales de la cuenta (racha, xp, foco semanal) siguen calculándose con todo el historial real, sin recortar. `load()` de notas pasa a depender del mes visible (`year`/`month`) en vez de un límite fijo de 20 notas global, para que Pro vea el historial completo real al navegar a meses viejos.
  - [x] **Notas privadas**: límite de 4 por mes calendario en Free (se resetea el día 1; ilimitadas en Pro) — antes no existía ningún límite. Se cuenta en `NoteComposer.tsx` (compartido entre `Calendar.tsx` y `Community.tsx`) porque ahí es donde el usuario elige visibilidad; solo cuentan las notas con `visibility = "private"`, las públicas de Comunidad siguen sin límite para todos los planes.
  - [x] **Mensajería privada** (DMs en `Messages.tsx`/`ReplyComposer.tsx`): pasa a ser exclusiva de Pro (antes era libre para todos). La Comunidad (feed público, reacciones) se mantiene libre para todos los planes. Se gatea en el punto de entrada (`Community.tsx`: botón de "Mensajes" y botón de "Responder" en cada nota) — no hace falta gating defensivo dentro de `Messages.tsx` porque no hay otra forma de llegar a esa vista en la UI actual.
  - [x] **Estadísticas personales**: "básicas" (Free) = streak/resets/xp + lista de logros con estado bloqueado/desbloqueado, igual que hoy. "Detalladas" (Pro) = además, progreso numérico hacia los logros bloqueados que tienen un umbral numérico (`streak_3`, `ten_resets`; los logros booleanos como `first_public_note` no tienen progreso posible, vía `getAchievementProgress` en `data/achievements.ts`) + el gráfico de tendencia semanal de foco en `Calendar.tsx` (ya estaba implementado del esquema anterior, se mantiene sin cambios).
- [x] Manejar pago pendiente: Mercado Pago reintenta automáticamente los cobros fallidos (hasta 3 veces) antes de cancelar la suscripción por su cuenta — no hace falta un grace period propio como el `past_due` de Stripe; el webhook solo refleja `plan_status` y se muestra un aviso si está `pending`.
- [x] Actualizar `deleteAccount()` en `Profile.tsx` para cancelar la suscripción de Mercado Pago antes de borrar el perfil.
- [x] Documentar en `CLAUDE.md` las nuevas variables de entorno (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_PLAN_ID_MONTHLY`, `MERCADOPAGO_PLAN_ID_ANNUAL`) sin commitear valores reales.
- [x] **Deploy contra el proyecto real (2026-07-06)**: el proyecto original (`urebsukvtbdhtkixyyaw`) no tenía datos reales, así que se migró todo a un proyecto Supabase nuevo (`goqrqtfdsrmjqjimjtwx`, org `KognitMer`, región `sa-east-1`) usando un `SUPABASE_ACCESS_TOKEN` provisto por el usuario:
  - Se linkeó el proyecto y se corrió `supabase db push` con las 13 migraciones del repo (historial completo, desde el schema inicial hasta Sprint 4).
  - Se deployaron las 4 Edge Functions (`create-checkout-preference`, `cancel-subscription` con JWT; `mercadopago-webhook` y `send-reminder-push` con `--no-verify-jwt`).
  - Se habilitó `external_anonymous_users_enabled` (modo invitado) vía Management API — no es parte de las migraciones SQL, es config de proyecto.
  - Se guardó el `service_role_key` real en Supabase Vault (`vault.create_secret`, nombre `service_role_key`) y se confirmó que `pg_cron`/`pg_net` quedaron habilitadas.
  - **Bug encontrado y corregido** (migración `20260706140000_fix_reminder_push_cron_url.sql`): la migración `20260706090100` tenía hardcodeada la URL del proyecto viejo en el `net.http_post` del cron — al cambiar de proyecto el cron quedaba apuntando al lugar equivocado. Si el proyecto vuelve a cambiar de ref, hay que repetir este fix con la URL nueva (Postgres no puede leer su propio project ref en runtime).
  - **Bug preexistente encontrado y corregido** (migración `20260706150000_fix_anonymous_user_display_name.sql`, no relacionado a la migración de proyecto): `handle_new_user()` fallaba con "Database error creating anonymous user" para el modo invitado, porque `NEW.email` es `NULL` para usuarios anónimos y `split_part(NULL, '@', 1)` da `NULL`, violando el `NOT NULL` de `display_name`. Se agregó `'Jugador'` como fallback final del `COALESCE`. Verificado con un signup anónimo real contra el proyecto (usuario de prueba borrado después).
  - Se crearon los dos `preapproval_plan` reales en Mercado Pago (cuenta de Uruguay, no Argentina — `currency_id: "UYU"`, MP no admite cobrar en USD directamente): mensual UYU 347,10 (`147594b9dc9f477ab7c2416d43cff176`) y anual UYU 3.471,00 cobrado una vez cada 12 meses ya que `frequency_type` solo admite `days`/`months`, no `years` (`6ee19006a06b47e18871e4e47a362ad9`). Conversión hecha a 1 USD = 39 UYU (precio de referencia del usuario: USD 8,90/mes y USD 89,00/año) — si el tipo de cambio se mueve hay que reajustar el monto en ARS/UYU manualmente, esto no se automatiza.
  - Se configuró el webhook de Mercado Pago vía `save_webhook` (topic `subscription_preapproval`) apuntando a la función del proyecto nuevo.
  - Se setearon todos los secrets de Edge Functions salvo uno (`supabase secrets set`): `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PLAN_ID_MONTHLY`, `MERCADOPAGO_PLAN_ID_ANNUAL`, `APP_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generadas nuevas con `web-push generate-vapid-keys`).
  - `.env` actualizado con la URL/project ID/anon key del proyecto nuevo.
- [ ] **Pendiente**: `MERCADOPAGO_WEBHOOK_SECRET` — Mercado Pago enmascara el secret completo en la respuesta de `save_webhook` (solo se ven los primeros caracteres); hay que copiarlo del panel de developers.mercadopago.com → Tus integraciones → la app → Webhooks, y correr `supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=...`. Sin esto, `mercadopago-webhook` no puede validar firmas y el plan no se sincroniza cuando llegan notificaciones reales.
- [ ] Probar el flujo completo en sandbox (usuario de prueba comprador de Mercado Pago) antes de anunciar el lanzamiento: checkout → autorización → webhook → gating actualizado → cancelación.

---

## Sprint 5 — Testing y QA

- [ ] Configurar cobertura mínima objetivo (ej. lógica crítica, no UI completa) y agregarla a `bun test`.
- [ ] Tests unitarios de lógica pura sin mockear Supabase de más:
  - [ ] Motor de fases del protocolo Tilt (`PATTERNS`, avance de fase/ciclo).
  - [ ] Cálculo de score de foco semanal (`loadFocusWeek` en `Calendar.tsx`) — extraerlo a una función pura testeable si hace falta.
  - [ ] `resolveMoodId` (moods.ts) incluyendo el mapeo legacy de emojis.
  - [ ] Lógica de agrupación de conversaciones en `Messages.tsx`.
- [ ] Tests de integración de los flujos de auth (login, signup, guest, forgot password) contra un proyecto Supabase de test/staging, no producción.
- [ ] Test manual guiado (checklist, no automatizado) de:
  - [ ] Flujo completo de pago Stripe en modo test (checkout → webhook → gating actualizado).
  - [ ] Instalación de la PWA y recepción de una notificación push de prueba.
  - [ ] Eliminación de cuenta (verificar que borra notas, reacciones, sesiones, mensajes, imágenes de Storage y suscripción de Stripe).
- [ ] Activar el lint y los tests en CI (si no existe todavía un pipeline, ver Sprint 6).

---

## Sprint 6 — Pulido y lanzamiento

- [ ] Revisar los 10 idiomas para confirmar que las keys nuevas de los sprints anteriores (onboarding conectado, logros, paywall, notificaciones) están traducidas al menos en `es.json`, con fallback correcto en el resto.
- [ ] Auditoría de performance (Lighthouse: PWA, performance, accesibilidad) sobre el build de producción.
- [ ] Revisar políticas RLS de Supabase para las tablas nuevas (`push_subscriptions`, `subscriptions`) — mismo criterio de seguridad que las tablas existentes.
- [ ] Preparar CI/CD básico (build + lint + test en cada PR) si no existe.
- [ ] Checklist de variables de entorno de producción (Supabase, Stripe, VAPID) documentado y separado de test/staging.
- [ ] Página de estado vacío / error genérico para cuando Supabase no responde (hoy varias pantallas asumen que la data siempre llega).
- [ ] Definir y comunicar la fecha de lanzamiento del MVP una vez cerrado este sprint.

---

## Backlog post-MVP (fuera de alcance por ahora)

Cosas identificadas en `AGENTE.md` que quedan explícitamente para después del MVP:
- App nativa real (Capacitor/React Native) más allá de la PWA.
- Plan anual con descuento u otros niveles de precio además de Free/Pro.
- Analítica de producto (funnels, retención) más allá de las stats propias de la app.
- Moderación de contenido en Comunidad (reportes, baneos).
