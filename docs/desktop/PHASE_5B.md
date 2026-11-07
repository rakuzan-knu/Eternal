# Фаза 5b — YouTube через системний браузер

Реалізовано окремий desktop OAuth flow. Google відкривається системним
браузером, повернення відбувається через `eternal://oauth/youtube`.
Вебсценарій і popup OAuth інших провайдерів збережено. Production не розгортали.

## Потік і межі довіри

1. Renderer генерує 32 випадкові байти verifier, тримає його лише в пам'яті
   поточної спроби та передає SHA-256 challenge в authenticated
   `POST /v1/integrations/youtube/desktop/start`.
2. Music видає одноразовий launch ticket/proof і transaction. Fragment URL
   містить launch capability, без Bearer або Google credentials. Launch HTML
   прибирає fragment з історії та робить same-origin POST. Сервер перевіряє
   proof, frontend origin і власний launch origin, встановлює окрему HttpOnly
   cookie `youtube_desktop_oauth_state`
   та повертає Google authorization URL.
3. Google повертає code/state на Music callback. Backend перевіряє browser
   cookie і атомарно споживає state. Google code тимчасово зберігається
   сервером, а браузер отримує випадковий handoff-код у deep link.
4. Main приймає тільки точний callback, що відповідає активній transaction.
   Код передається через валідований `invoke/handle` міст головному renderer.
   Це не загальна навігація React Router.
5. Authenticated `POST /v1/integrations/youtube/desktop/redeem` потребує
   handoff-коду, transaction і verifier. Сервер звіряє користувача та challenge
   перед атомарним compare-and-delete. Лише після цього обмінює Google code,
   читає канал і зберігає інтеграцію через наявний OAuth механізм.
   Обмін використовує єдиний redirect URI, виданий на старті.
6. Після успіху modal оновлює дані та інвалідує user/showcase/profile cache.
   Disconnect використовує наявний authenticated unlink.

Усі нові маршрути належать Music через `roleControllers('music', ...)`;
чинний `/integrations/*` transport і Vercel rewrite не змінюються.
Нових залежностей, таблиць, міграцій або фонових задач немає.

Redis працює через raw client без process-local fallback. OAuth state і
desktop transaction живуть 600 секунд, launch ticket — 60 секунд,
handoff — 60 секунд. У Redis ключ handoff містить SHA-256 коду.
Неправильний користувач/verifier не споживає правильний handoff; конкурентний
redeem має лише одного переможця. Відмова Google повертається тим самим
прив'язаним handoff, без обміну токенів або запису інтеграції.

Main обмежує очікування десятьма хвилинами. Закриття modal, зміна акаунта,
logout/resetNativeState, reload, crash renderer або нова спроба скасовують
очікування. Секрет не зберігається на диску: після перезапуску застосунку
потрібно почати підключення знову. Старий binary без нового bridge отримує
повідомлення про необхідність оновлення.

## Google і rollout

На Music потрібні наявні `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`RENDER_EXTERNAL_URL`, Redis і коректний `CORS_ORIGIN`.
Секрет Google залишається на backend. Для production callback обчислюється
з `RENDER_EXTERNAL_URL`; Host header клієнта його не визначає.

У Google OAuth client типу Web application потрібно **додатково** зареєструвати
точний Authorized redirect URI:

```text
https://eternal-music-hub.onrender.com/v1/integrations/youtube/desktop/callback
```

Для іншого Music deployment використовується його справжній HTTPS origin.
Наявний web `GOOGLE_CALLBACK_URL` та його Google registration зберігаються.
У dev без `RENDER_EXTERNAL_URL` callback:
`http://localhost:3000/v1/integrations/youtube/desktop/callback`.
Dev binary не реєструє OS protocol автоматично; тести подають Electron
`open-url` event. Для ручного приймання повернення через ОС потрібна
встановлена desktop-збірка з protocol registration.

Порядок постачання: зареєструвати додатковий Google callback → розгорнути
адитивні маршрути Music → доставити новий renderer і desktop binary →
перевірити реальний connect/disconnect. Hosted renderer потребує окремого
оновлення Vercel. Старий web продовжує використовувати попередні маршрути.
Rollback клієнта не потребує міграції; незавершені Redis-записи закінчуються
за TTL. Правила сервісного rollout: [SERVICE_OWNERSHIP.md](../SERVICE_OWNERSHIP.md).

Google вимагає відповідності redirect URI зареєстрованому значенню:
[Web server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
Використання зовнішнього user-agent та захист перехопленого return code
відповідають рекомендаціям [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252).
Handoff verifier тут захищає власний обмін desktop ↔ backend; це не PKCE
параметр Google authorization request.

## Перевірки та приймання

Автоматичні сценарії перевіряють JWT окремо від DTO validation, Music ownership,
trailing slash, browser cookie, launch origin/proof, Google callback extras
з production ValidationPipe, одноразовість і конкурентний redeem, чужий
акаунт/verifier, denial, відсутність Google code/token у відповідях renderer,
скасування й запізнілі результати, UI loading/error, cache refresh та
збереження звичайного web popup.

Electron OAuth e2e перевіряє реальний preload/IPC, whitelist launch URL,
повернення лише активної transaction і скасування. Виклик OS browser
перехоплено тестом; Google і системний браузер не відкриваються. Інші чотири
provider fixtures цього тесту далі перевіряють справжній Chromium network
stack і cookie transport. Це не перевірка реального Google consent.

Локально на Windows пройшли:

- 180 desktop unit tests, desktop TypeScript/build/ESLint.
- 7 нових backend handoff tests, чинні OAuth transport, security boundaries
  та service-role tests; backend TypeScript і Nest build.
- 57 web tests: handoff helper, modal connect/error/cancel, web popup,
  service routing і callback URL compatibility; web TypeScript/build:desktop
  та ESLint змінених web-файлів.
- Electron OAuth e2e з чотирма popup providers і новим YouTube IPC сценарієм.
- Prettier змінених TypeScript-файлів. Повний backend ESLint завершився
  без помилок, із 474 warnings наявного коду.

Новий backend fixture використовує JWT/Fastify та in-memory Redis/DB doubles;
Google HTTP відповіді контрольовані. Реальні Google, PostgreSQL і production
Redis не використовувалися для цієї перевірки.

Перед production-прийманням потрібні встановлена збірка і справжній Google
акаунт: consent/MFA, відмова, відсутній YouTube channel, повторна спроба,
повернення через системний protocol prompt, connect/disconnect на кожній ОС.
Google client registration і live OAuth у цьому чаті не змінювалися.
