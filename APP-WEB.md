# Separación web / app — qué tenés que hacer vos

El repo pasó a ser un monorepo con **dos aplicaciones separadas servidas desde el mismo dominio**:

| | Antes | Ahora |
|---|---|---|
| Sitio público | `kognit.in/` | `kognit.in/` — build de `apps/web` → `dist/` |
| App (PWA) | `kognit.in/app` (misma SPA) | `kognit.in/app/` — build de `apps/app` → `dist/app/` |
| Login | `kognit.in/auth` | `kognit.in/app/auth` |
| Reset de contraseña | `kognit.in/reset-password` | `kognit.in/app/reset-password` |

El código ya está hecho, buildeado y probado. Lo que queda son cosas que solo podés hacer vos, porque son paneles de control a los que yo no tengo acceso.

**Andá en este orden.** Los pasos 1 y 2 son obligatorios antes de que el deploy funcione bien; el 3 es obligatorio para que el login siga andando.

---

## 1. Hostinger — verificar el comando de build

Inspeccioné el sitio en producción y ya sé exactamente cómo está sirviendo:

| Lo que responde `kognit.in` | Qué significa |
|---|---|
| `Server: LiteSpeed`, `platform: hostinger` | Es Hostinger (no Vercel, pese a lo que sugería `IMPLEMENTACION.md`) |
| `/precio` devuelve 200 con el SPA | **El `.htaccess` ya está funcionando hoy** |
| Sin `x-powered-by`, con `ETag` y `Accept-Ranges` | Sirve archivos estáticos del disco; **no corre un proceso Node** |
| Sirve `/assets/index-*.js` aunque `dist/` está gitigneado | **El deploy sí corre un build** |

Conclusión: **el ruteo lo van a hacer los dos `.htaccess`, no `server.js`.** Los dos archivos se copian solos dentro del build (`dist/.htaccess` y `dist/app/.htaccess`), así que eso funciona sin que toques nada. El *document root* tampoco cambia: el sitio sigue saliendo a `dist/` y la app queda en `dist/app/`.

`server.js` queda en el repo como respaldo por si algún día pasás a modo Node, pero hoy no se usa.

### Lo único que tenés que verificar

**El comando de build.** Yo borré el `vite.config.ts` de la raíz (ahora hay uno por app), así que:

| Si el comando es… | Resultado |
|---|---|
| `npm run build` | ✅ Funciona |
| `npm ci && npm run build` | ✅ Funciona (lo ideal) |
| `vite build` / `npx vite build` | ❌ **Falla** — ya no hay config de Vite en la raíz |

Andá a **hPanel → tu sitio → Avanzado → Node.js** (o **Git / Auto deployment**, según dónde esté configurado el repo) y confirmá que diga `npm run build`. Si dice otra cosa, cambialo.

También borré el `bun.lockb`, que estaba desactualizado desde el 9 de julio y no conocía ni los workspaces ni `express`. Si el build llegara a correr `bun install`, habría instalado desde ese lockfile viejo y producido un build roto de forma difícil de diagnosticar. Ahora el único lockfile es `package-lock.json`, y `package.json` declara `packageManager: npm` y `engines.node >= 20` para que ningún autodetect elija otra cosa.

**Cómo confirmar que quedó bien** (después del primer deploy):

```
https://kognit.in/            → landing
https://kognit.in/precio      → página de precios (no 404)
https://kognit.in/app         → la app (o el login si no hay sesión)
https://kognit.in/app/auth    → login (no 404)
https://kognit.in/app/manifest.webmanifest  → un JSON
```

Si `/precio` o `/app/auth` dan 404, el fallback de SPA no está funcionando: avisame con cuál de los dos casos estás y lo ajusto.

---

## 2. Verificar que el service worker viejo se muera

**Este es el punto más importante de toda la migración, y es silencioso si falla.**

Hasta ahora la PWA registraba un service worker en `kognit.in/sw.js` con alcance sobre **todo** el sitio, configurado para responder cualquier URL con el HTML cacheado. Ese service worker sigue instalado en el navegador de todos los que alguna vez entraron a kognit.in. Si no se lo saca, esas personas **van a seguir viendo el sitio viejo para siempre**, aunque el deploy nuevo esté arriba.

Ya dejé la solución puesta (un `sw.js` nuevo en la misma URL que se autodestruye, más una limpieza desde el JS del sitio). Lo que necesito de vos es **verificar que funcionó**, porque no lo puedo probar sin el dominio real.

Después del deploy, en una computadora donde ya hayas entrado a kognit.in antes:

1. Abrí `https://kognit.in` y esperá unos segundos.
2. F12 → pestaña **Application** (o Aplicación) → **Service Workers** en la barra lateral.
3. **Tiene que aparecer vacío**, o solo con uno cuyo Scope sea `https://kognit.in/app/`.
4. Si todavía ves uno con scope `https://kognit.in/`: recargá con Ctrl+Shift+R un par de veces. Si persiste, hacé click en **Unregister** y avisame.

Repetí en el celular si tenés la PWA instalada.

> **No borres `apps/web/public/sw.js`** aunque parezca un archivo raro que no hace nada. Es lo único que desinstala el worker viejo. Dejalo al menos 3–6 meses, hasta que sea razonable asumir que ya no quedan navegadores con el registro viejo.

---

## 3. Supabase — actualizar las URLs de autenticación

El login se mudó de `/auth` a `/app/auth`. Los links que Supabase manda por mail (reset de contraseña, confirmación) y el callback de Google apuntan a las URLs viejas, así que hay que actualizarlos.

Estado verificado contra la Management API el 2026-07-30:

| Campo | Valor actual | Acción |
|---|---|---|
| **Site URL** | `https://kognit.in` | ⬜ **Cambiar a `https://kognit.in/app`** |
| Redirect `https://kognit.in/app/**` | presente | ✅ nada que hacer |
| Redirect `https://kognit.in/**` | presente | ✅ **dejar** — cubre los links viejos que ya están en las casillas de mail |
| Redirect `http://localhost:8080/**` | presente | ⬜ **Agregar `http://localhost:8081/**`** — 8080 es el dev del sitio, la app corre en 8081 |
| Redirect `http://localhost:5173/**` | presente | 🧹 opcional: puerto viejo, sin uso |
| Redirect `https://kognit-web-git-main-colonia-cloud.vercel.app/**` | presente | 🧹 opcional: preview de Vercel muerto |

Se cambia en **Supabase → proyecto `wpjufgefhcyncseuikel` → Authentication → URL Configuration**.

Si tenés **Google OAuth** configurado, revisá también en la **consola de Google Cloud → Credenciales → tu OAuth Client** que el "URI de redireccionamiento autorizado" siga siendo el de Supabase (`https://wpjufgefhcyncseuikel.supabase.co/auth/v1/callback`). Ese no cambia — solo lo menciono para que no lo toques por las dudas.

> **Los links viejos no se rompen igual**: dejé redirects de `/auth`, `/reset-password` y `/tilt` hacia `/app/...` que preservan los tokens del fragmento de URL (`#access_token=...`), que es la parte delicada del link de reset. Este paso es para que los mails *nuevos* salgan ya con la URL correcta.

---

## 3b. Borrar los archivos del build viejo (una sola vez)

El deploy de Hostinger **sobrescribe pero no borra**. Comprobado después del primer deploy: los archivos del build anterior siguen ahí y se sirven con 200, aunque nada los referencia.

No rompen nada (ningún HTML los linkea), pero son peso muerto que se va a acumular en cada deploy. Borralos una vez desde **hPanel → Administrador de archivos**, dentro de la carpeta que se publica:

```
/manifest.webmanifest          ← el viejo, con scope "/app". Lo pisa el nuevo en el próximo deploy
/registerSW.js                 ← el sitio ya no registra service worker
/assets/index-CiV8LBz6.js      ← bundle viejo de 2 MB
/assets/index-DH2ULwH8.css
/app/manifest.webmanifest      ← quedó huérfano al pasar el manifest a la raíz
```

En general: dentro de `/assets/` y `/app/assets/` se puede borrar todo lo que no aparezca referenciado en el `index.html` correspondiente — los nombres llevan hash, así que los que sobran son de builds viejos.

**La solución de fondo** es que el deploy limpie. Si en hPanel el paso de publicación es un `rsync`/copia configurable, agregarle `--delete`; si podés apuntar el *document root* directamente a `dist/`, mejor todavía, porque `vite build` ya vacía esa carpeta en cada build y el problema desaparece solo.

## 4. Mercado Pago — actualizar la URL de retorno

En el **panel de Mercado Pago**, los dos planes de suscripción (`preapproval_plan` mensual y anual) tienen un `back_url` que apunta a `https://kognit.in/app?upgrade=success`. Esa URL **sigue funcionando** tal cual, así que no es urgente.

Lo único a revisar: el secret `APP_URL` de las Edge Functions de Supabase debe seguir siendo `https://kognit.in` (sin `/app`). Verificalo con:

```bash
supabase secrets list
```

No hace falta cambiarlo — solo confirmá que no diga otra cosa.

---

## 5. GitHub — el CI estaba roto

Encontré que el workflow de CI (`.github/workflows/ci.yml`) se disparaba en la rama `main`, pero la rama por defecto del repo es `master`. **O sea que el CI nunca se ejecutó, ni una vez.** Ya lo corregí.

Cuando mergees esto a `master`, el CI va a correr de verdad por primera vez. Lo dejé en verde (lint, typecheck, tests y build pasan localmente), pero avisame si tira algo raro en el runner de GitHub.

De paso: el paso de "Type check" también era decorativo — corría `tsc --noEmit` contra un `tsconfig.json` con `files: []`, así que **no chequeaba ningún archivo**. Al arreglarlo aparecieron 3 errores de tipos reales que estaban escondidos hace tiempo (en `sound.ts` y `Tilt.tsx`); los corregí.

---

## Qué cambió por dentro (para que no te sorprenda)

### El sitio pesa un tercio de lo que pesaba

Primera carga de la landing, comprimida:

| | Antes | Ahora |
|---|---|---|
| JavaScript | 589 kB | **149 kB** |
| CSS | 16 kB | 15 kB |
| **Total** | **606 kB** | **164 kB** (−73%) |

Antes, alguien que entraba a leer los precios se bajaba la app entera: el motor de Tilt, la mensajería con grabador de voz, el SDK de Mercado Pago y los 10 idiomas completos. Ahora el sitio se baja solo lo suyo, y los idiomas se descargan on-demand.

### Cosas que se comportan distinto

- **`/funciones` ya no muestra la app real adentro de un teléfono.** Ese componente montaba las pantallas de verdad de la app dentro del landing, que era justamente el acoplamiento que había que cortar. Lo reemplacé por el mismo carrusel de capturas que ya usabas en el home. Si querés que las capturas se actualicen, `npm run dev:app` + `node scripts/capture-screens.mjs` (ver `docs/capturas.md`).
- **El modal del programa de testers** ahora vive del lado del sitio (que es donde convierte) y su botón lleva a `/app/auth?mode=signup`.
- **La app arranca en `/app/`** cuando se abre instalada. La identidad de la PWA (`id: "/"`) se mantiene a propósito para que **las instalaciones que ya tiene la gente no se pierdan**. Esto es lo que verificás en el paso 2.

### Una deuda que quedó a la vista

Al partir los archivos de traducción quedó expuesto que **68 de las 120 frases de las páginas de landing no están traducidas a ninguno de los 9 idiomas** que no son español. Las páginas nuevas (funciones, casos de uso, precio, contacto, prelanzamiento) se agregaron después de la traducción original y nunca se tradujeron.

No es algo que rompa nada: esos textos caen al español. Pero si alguien entra al sitio con la app en inglés, **ve el landing en español**. La parte de la app (`app.json`) está traducida al 100%.

Los archivos a completar son `packages/i18n/src/locales/<idioma>/site.json`. Si querés que lo encare, decime.

---

## Comandos que vas a usar

```bash
npm install          # una vez, después de traer estos cambios

npm run dev          # sitio en localhost:8080 (y /app proxeado a la app)
npm run dev:app      # app sola en localhost:8081
npm run dev:all      # las dos juntas

npm run build        # buildea las dos → dist/ y dist/app/
npm run preview      # build + levanta server.js, igual que en producción

npm run lint
npm run typecheck
npm test
```

Para probar exactamente lo que va a ver Hostinger: `npm run preview` y abrí `http://localhost:3000`.

---

## Si algo sale mal

El commit anterior sigue intacto en `master`. Para volver atrás:

```bash
git revert <hash-del-merge>
```

Pero **ojo**: si ya se deployó la versión nueva y algún navegador desinstaló el service worker viejo, al volver atrás esos navegadores van a re-registrar el SW viejo. No es grave, pero es un motivo más para no hacer ida y vuelta con esto: mejor probar bien en preview antes de mergear.

Si tenés dudas en cualquiera de los pasos, decime en cuál estás y con qué te encontraste.
