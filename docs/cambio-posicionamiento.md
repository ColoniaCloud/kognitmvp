# Cambio de posicionamiento: de jugadores de poker a público general

Registro completo de los textos que cambiaron. Sirve para revisar las traducciones y para
saber qué se tocó si algo suena raro en producción.

En ningún caso cambiaron los identificadores internos — solo el texto visible.

## Fuera de los locales

| Archivo | Antes | Ahora |
|---|---|---|
| `apps/web/index.html` · meta description | …rituales diarios para **jugadores de poker y atletas cognitivos**. | …hábitos diarios para **pensar con claridad cuando más importa**. |
| `apps/app/index.html` · meta description | Reset mental en segundos **para jugadores de poker**. | Reset mental en segundos. |
| `apps/web/public/manifest.webmanifest` · description | Reset mental en segundos **para jugadores de poker**. | Reset mental en segundos. |
| `supabase/functions/send-reminder-push` · push diaria | **Antes de jugar**, escuchate un segundo. ¿Cómo llegás hoy? | **Antes de empezar**, escuchate un segundo. ¿Cómo llegás hoy? |
| `supabase/migrations/20260730120000_…sql` | `display_name DEFAULT 'Jugador'` | `display_name DEFAULT 'Usuario'` |

La push vive en una Edge Function y la migración en la base: **ninguna de las dos se publica**
con el deploy del sitio. Ver la sección de Supabase en `APP-WEB.md`.

---

## Metadatos

No se ven en la interfaz. Son lo que muestran Google, los previews de links al compartir y el cartel de «Instalar app». `chrome.logoAlt` va en el `alt` del logo de **todas** las páginas: lo leen lectores de pantalla y crawlers.

### `common` · `chrome.logoAlt`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Logo de kognit, app de entrenamiento mental para jugadores de poker | Logo de kognit, app de entrenamiento mental |
| English | kognit logo, mental training app for poker players | kognit logo, mental training app |
| Português | Logo do kognit, app de treinamento mental para jogadores de poker | Logo do kognit, app de treinamento mental |
| Italiano | Logo di kognit, app di allenamento mentale per giocatori di poker | Logo di kognit, app di allenamento mentale |
| Français | Logo de kognit, application d'entraînement mental pour joueurs de poker | Logo de kognit, application d'entraînement mental |
| Deutsch | Logo von kognit, App für mentales Training für Pokerspieler | Logo von kognit, App für mentales Training |
| हिन्दी ⚠️ | kognit का लोगो, पोकर खिलाड़ियों के लिए मानसिक ट्रेनिंग ऐप | kognit का लोगो, मानसिक ट्रेनिंग ऐप |
| 日本語 ⚠️ | kognitのロゴ、ポーカープレイヤーのためのメンタルトレーニングアプリ | kognitのロゴ、メンタルトレーニングアプリ |
| 简体中文 ⚠️ | kognit 标志，一款面向扑克玩家的心理训练应用 | kognit 标志，一款心理训练应用 |
| 繁體中文 ⚠️ | kognit 標誌，為撲克玩家打造的心智訓練 App | kognit 標誌，心智訓練 App |

## Nombre del protocolo: «Tilt» → «Reset» / «Rabia»

«Tilt» es jerga del nicho, y además contradecía al landing, que ya llamaba RESET al protocolo. Los identificadores internos (`tilt` en el código, `reset_sessions` en la base) **no** cambian: esto es solo texto visible.

### `common` · `plans.free.features.tilt`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Protocolo Tilt ilimitado, ambos modos | Protocolo de Reset ilimitado, ambos modos |
| English | Unlimited Tilt protocol, both modes | Unlimited Reset protocol, both modes |
| Português | Protocolo Tilt ilimitado, os dois modos | Protocolo de Reset ilimitado, os dois modos |
| Italiano | Protocollo Tilt illimitato, entrambe le modalità | Protocollo di Reset illimitato, entrambe le modalità |
| Français | Protocole Tilt illimité, les deux modes | Protocole de Reset illimité, les deux modes |
| Deutsch | Unbegrenztes Tilt-Protokoll, beide Modi | Unbegrenztes Reset-Protokoll, beide Modi |
| हिन्दी ⚠️ | अनलिमिटेड टिल्ट प्रोटोकॉल, दोनों मोड | अनलिमिटेड रीसेट प्रोटोकॉल, दोनों मोड |
| 日本語 ⚠️ | ティルトプロトコル無制限(両モード) | リセットプロトコル無制限(両モード) |
| 简体中文 ⚠️ | 无限次 Tilt 重置流程，两种模式 | 无限次 Reset 重置流程，两种模式 |
| 繁體中文 ⚠️ | 無限次 Tilt 重置流程，兩種模式 | 無限次 Reset 重置流程，兩種模式 |

### `common` · `plans.pro.features.tilt`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Protocolo Tilt ilimitado, ambos modos | Protocolo de Reset ilimitado, ambos modos |
| English | Unlimited Tilt protocol, both modes | Unlimited Reset protocol, both modes |
| Português | Protocolo Tilt ilimitado, os dois modos | Protocolo de Reset ilimitado, os dois modos |
| Italiano | Protocollo Tilt illimitato, entrambe le modalità | Protocollo di Reset illimitato, entrambe le modalità |
| Français | Protocole Tilt illimité, les deux modes | Protocole de Reset illimité, les deux modes |
| Deutsch | Unbegrenztes Tilt-Protokoll, beide Modi | Unbegrenztes Reset-Protokoll, beide Modi |
| हिन्दी ⚠️ | अनलिमिटेड टिल्ट प्रोटोकॉल, दोनों मोड | अनलिमिटेड रीसेट प्रोटोकॉल, दोनों मोड |
| 日本語 ⚠️ | ティルトプロトコル無制限(両モード) | リセットプロトコル無制限(両モード) |
| 简体中文 ⚠️ | 无限次 Tilt 重置流程，两种模式 | 无限次 Reset 重置流程，两种模式 |
| 繁體中文 ⚠️ | 無限次 Tilt 重置流程，兩種模式 | 無限次 Reset 重置流程，兩種模式 |

### `app` · `onboarding.emotions.tilt.name`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Tilt / Rabia | Rabia |
| English | Tilt / Anger | Anger |
| Português | Tilt / Raiva | Raiva |
| Italiano | Tilt / Rabbia | Rabbia |
| Français | Tilt / Rage | Rage |
| Deutsch | Tilt / Wut | Wut |
| हिन्दी ⚠️ | टिल्ट / गुस्सा | गुस्सा |
| 日本語 ⚠️ | ティルト／怒り | 怒り |
| 简体中文 ⚠️ | 上头 / 愤怒 | 愤怒 |
| 繁體中文 ⚠️ | 情緒失控 / 憤怒 | 憤怒 |

### `app` · `moods.options.tilt`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Tilt | Rabia |
| English | Tilt | Anger |
| Português | Tilt | Raiva |
| Italiano | Tilt | Rabbia |
| Français | Tilt | Colère |
| Deutsch | Tilt | Wut |
| हिन्दी ⚠️ | टिल्ट | गुस्सा |
| 日本語 ⚠️ | ティルト | 怒り |
| 简体中文 ⚠️ | 上头 | 愤怒 |
| 繁體中文 ⚠️ | 失控 | 憤怒 |

## Copy de la app

Textos que enmarcaban el uso como una partida.

### `app` · `auth.submit.login`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Entrar al juego | Entrar |
| English | Enter the game | Log in |
| Português | Entrar no jogo | Entrar |
| Italiano | Entra in gioco | Accedi |
| Français | Entrer dans le jeu | Se connecter |
| Deutsch | Ins Spiel einsteigen | Anmelden |
| हिन्दी ⚠️ | गेम में एंटर करें | लॉग इन करें |
| 日本語 ⚠️ | ゲームに入る | ログイン |
| 简体中文 ⚠️ | 进入游戏 | 登录 |
| 繁體中文 ⚠️ | 進入賽局 | 登入 |

### `app` · `auth.placeholders.name`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Nombre de jugador | Tu nombre |
| English | Player name | Your name |
| Português | Nome de jogador | Seu nome |
| Italiano | Nome del giocatore | Il tuo nome |
| Français | Nom de joueur | Ton nom |
| Deutsch | Spielername | Dein Name |
| हिन्दी ⚠️ | प्लेयर का नाम | आपका नाम |
| 日本語 ⚠️ | プレイヤー名 | お名前 |
| 简体中文 ⚠️ | 玩家昵称 | 你的名字 |
| 繁體中文 ⚠️ | 玩家名稱 | 你的名字 |

### `app` · `home.goalMessages.calm`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Hoy, enfocate en jugar con la cabeza fría. | Hoy, enfocate en mantener la cabeza fría. |
| English | Today, focus on playing with a cool head. | Today, focus on keeping a cool head. |
| Português | Hoje, foque em jogar com a cabeça fria. | Hoje, foque em manter a cabeça fria. |
| Italiano | Oggi, concentrati sul giocare con la testa fredda. | Oggi, concentrati sul mantenere la testa fredda. |
| Français | Aujourd'hui, concentre-toi sur le fait de jouer la tête froide. | Aujourd'hui, concentre-toi sur le fait de garder la tête froide. |
| Deutsch | Heute geht's darum, mit kühlem Kopf zu spielen. | Heute geht's darum, einen kühlen Kopf zu bewahren. |
| हिन्दी ⚠️ | आज, ठंडे दिमाग़ से खेलने पर ध्यान दो। | आज, ठंडे दिमाग़ बनाए रखने पर ध्यान दो। |
| 日本語 ⚠️ | 今日は、冷静にプレーすることに集中しよう。 | 今日は、冷静さを保つことに集中しよう。 |
| 简体中文 ⚠️ | 今天，专注于保持冷静打牌。 | 今天，专注于保持冷静。 |
| 繁體中文 ⚠️ | 今天，專注在保持冷靜打牌。 | 今天，專注在保持冷靜。 |

### `app` · `calendar.empty.subtitle`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Registrá cómo veniste jugando o cómo te sentiste. | Registrá cómo venís o cómo te sentiste. |
| English | Log how you played or how you felt. | Log how your day went or how you felt. |
| Português | Registre como você jogou ou como se sentiu. | Registre como foi seu dia ou como se sentiu. |
| Italiano | Registra come hai giocato o come ti sei sentito. | Registra com'è andata o come ti sei sentito. |
| Français | Note comment tu as joué ou ce que tu as ressenti. | Note comment s'est passée ta journée ou ce que tu as ressenti. |
| Deutsch | Halte fest, wie du gespielt hast oder dich gefühlt hast. | Halte fest, wie dein Tag lief oder wie du dich gefühlt hast. |
| हिन्दी ⚠️ | लिखो कि आज कैसा खेला या कैसा महसूस किया। | लिखो कि आज का दिन कैसा रहा या कैसा महसूस किया। |
| 日本語 ⚠️ | 今日のプレーや気分を記録しよう。 | 今日の調子や気分を記録しよう。 |
| 简体中文 ⚠️ | 记录一下你今天打得怎么样，或者感觉如何。 | 记录一下你今天过得怎么样，或者感觉如何。 |
| 繁體中文 ⚠️ | 記錄一下你今天打得怎麼樣，或感覺如何。 | 記錄一下你今天過得怎麼樣，或感覺如何。 |

### `app` · `profile.reminders.quote`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | "Antes de jugar, escuchate. Tu rendimiento empieza por tu estado mental." | "Antes de empezar, escuchate. Tu rendimiento empieza por tu estado mental." |
| English | "Before you play, listen to yourself. Your performance starts with your mental state." | "Before you start, listen to yourself. Your performance starts with your mental state." |
| Português | "Antes de jogar, escute a si mesmo. Seu desempenho começa pelo seu estado mental." | "Antes de começar, escute a si mesmo. Seu desempenho começa pelo seu estado mental." |
| Italiano | "Prima di giocare, ascoltati. Le tue prestazioni iniziano dal tuo stato mentale." | "Prima di iniziare, ascoltati. Le tue prestazioni iniziano dal tuo stato mentale." |
| Français | « Avant de jouer, écoute-toi. Ta performance commence par ton état mental. » | « Avant de commencer, écoute-toi. Ta performance commence par ton état mental. » |
| Deutsch | "Bevor du spielst, hör auf dich selbst. Deine Leistung beginnt mit deinem mentalen Zustand." | "Bevor du anfängst, hör auf dich selbst. Deine Leistung beginnt mit deinem mentalen Zustand." |
| हिन्दी ⚠️ | "खेलने से पहले, खुद को सुनिए। आपका परफ़ॉर्मेंस आपकी मानसिक स्थिति से शुरू होता है।" | "शुरू करने से पहले, खुद को सुनिए। आपका परफ़ॉर्मेंस आपकी मानसिक स्थिति से शुरू होता है।" |
| 日本語 ⚠️ | 「プレーする前に、自分の声を聞いて。パフォーマンスはメンタルの状態から始まる。」 | 「始める前に、自分の声を聞いて。パフォーマンスはメンタルの状態から始まる。」 |
| 简体中文 ⚠️ | "打牌之前，先倾听自己。你的表现始于你的心理状态。" | "开始之前，先倾听自己。你的表现始于你的心理状态。" |
| 繁體中文 ⚠️ | 「上場前，先傾聽自己。你的表現，從你的心理狀態開始。」 | 「開始前，先傾聽自己。你的表現，從你的心理狀態開始。」 |

## Copy del sitio

Solo existen en español: el resto de los idiomas todavía no tiene traducido `site.json`.

### `site` · `featuresPage.subtitle`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Cada función de Kognit está pensada para un momento específico del juego: antes de sentarte, en medio de la tensión, y después, cuando toca revisar lo que pasó. | Cada función de Kognit está pensada para un momento específico: antes de empezar, en medio de la tensión, y después, cuando toca revisar lo que pasó. |

### `site` · `useCasesPage.cta.subtitle`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | Empezá gratis y probá el reset en tu próxima sesión. | Empezá gratis y probá el reset la próxima vez que lo necesites. |

### `site` · `pricingPage.faq.items.trial.answer`

| Idioma | Antes | Ahora |
|---|---|---|
| Español | El plan Free no tiene límite de tiempo, así que podés probar el protocolo Tilt completo y la comunidad sin pagar nada antes de decidir si querés más. | El plan Free no tiene límite de tiempo, así que podés probar el protocolo de reset completo y la comunidad sin pagar nada antes de decidir si querés más. |

---

## ⚠️ Traducciones sin verificar

Las filas marcadas son हिन्दी, 日本語, 简体中文 y 繁體中文. En la mayoría el cambio fue quitar un
calificativo o reemplazar una palabra por su equivalente, que es de riesgo bajo. Las dos que
conviene que mire un hablante nativo, porque son reescrituras completas:

- `app` · `profile.reminders.quote`
- `app` · `calendar.empty.subtitle`

## Huecos de traducción preexistentes

No los introdujo este cambio, pero quedaron a la vista:

1. Los 9 idiomas que no son español tienen `chrome.nav.product` y les faltan `chrome.nav.features`,
   `useCases`, `pricing` y `contact`. **El menú de navegación del sitio se ve en español** para
   cualquier visitante en otro idioma, en todas las páginas. Son 4 palabras por idioma.
2. 68 de las 120 claves de `site.json` no están traducidas en ninguno de los 9 idiomas: las
   páginas de landing se agregaron después de la traducción original.
