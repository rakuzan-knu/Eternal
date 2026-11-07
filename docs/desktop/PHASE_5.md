# Фаза 5 — інтеграції

Реалізовано OAuth/OpenID GitHub, Spotify, Steam і Twitch у дочірніх вікнах
Electron. Backend, API-контракти, залежності та production-сервіси не змінювалися.
YouTube залишається окремою фазою 5b.

## Поведінка та межі

- Чинний `ConfigureIntegrationModal` відкриває `about:blank` з іменем
  `<provider>_oauth_window`. Electron зберігає справжній `WindowProxy`,
  `window.opener` і ту саму `persist:eternal` Session. Обмін одноразовим launch
  proof, встановлення HttpOnly state-cookie, callback та очищення кешів
  використовують наявний вебкод.
- Одночасно дозволено одне OAuth-вікно. Воно має sandbox, context isolation,
  вимкнені Node/webview та порожній preload. Desktop-міст відсутній навіть
  у початковому `about:blank`; дочірнє вікно не є авторизованим IPC sender.
- Вікно залишається прихованим до перевірки
  `child.webContents.opener === mainWindow.webContents.mainFrame`.
  Сторонній iframe, зокрема без Referer, не може відкрити видиме OAuth-вікно
  або перейти до провайдера. Ця перевірка використовує
  [документований WebContents.opener](https://www.electronjs.org/docs/latest/api/web-contents#contentsopener).
- Переходи обмежені точними HTTPS origins провайдера й launch/callback маршрутами
  його сервісу. GitHub використовує core, решта — music; origins виводяться
  з `vercel.json`. Дозволено також відповідні маршрути frontend origin,
  включно зі SPA callback Twitch. Dev використовує чинний localhost:3000.
  Provider origins: `github.com`, `accounts.spotify.com`, `steamcommunity.com`,
  `login.steampowered.com`, `id.twitch.tv`, `www.twitch.tv`. Довільних піддоменів немає.
- Вкладені popup, webview, завантаження файлів і переходи на сторонні адреси
  в OAuth-вікні блокуються. Токени, proof і callback query не передаються в shell
  та не записуються в логах. Звичайні зовнішні посилання основного вікна
  продовжують використовувати системний браузер.
- GitHub завершує поточний backend flow перенаправленням на
  `/settings?github=connected` або `/settings?error=oauth_failed`.
  Після переходу до GitHub оболонка закриває popup на цьому точному frontend
  маршруті; наявний web polling завершення інвалідує user/showcase кеші.
  Це працює також для негайного HTTP redirect провайдера без коміту документа.
  Оболонка не створює синтетичного повідомлення про успішну авторизацію.
- App CSP додається тільки до відповідей основного WebContents. Backend
  launch/callback HTML у popup зберігає власні серверні CSP headers, тому
  службові inline-скрипти не блокуються hashes основного React-документа.
- Logout/зміна акаунта через наявний `resetNativeState`, reload, знищення
  або втрата основного renderer закривають дочірні вікна. Завершення процесу
  звільняє listeners без звернення до вже знищеного WebContents.

## Перевірено

На Windows x64 / Electron 45.1.0:

- Desktop TypeScript/build/ESLint, 101 модульний тест.
- 25 web-тестів OAuth routing/callback/modal; нові параметризовані сценарії
  перевіряють connect, повідомлення completion, disconnect і cache invalidation
  для всіх чотирьох провайдерів. Web TypeScript і ESLint зміненого тесту.
- Electron OAuth e2e з локальним HTTPS-сервером: справжній Chromium network stack,
  exact popup source, proof handshake, HttpOnly/Secure cookie від launch POST
  і його обов'язкове передавання на callback; окремо same-origin Twitch flow,
  початковий blank без Node/мосту, заборона сторонньої навігації та nested popup,
  iframe без Referer, негайний GitHub HTTP redirect, logout і reload cleanup.
- Наявні Electron smoke та native UX e2e пройшли після зміни оболонки.
- Незалежний focused review меж авторизації та сумісності; виявлені проблеми
  виправлено й покрито наведеними сценаріями.

OAuth e2e спрямовує DNS лише тестового Electron-процесу на тимчасовий локальний
сервер. Довіра обмежена SPKI тимчасового тестового сертифіката; production-код
не змінює TLS-перевірки. Потрібен OpenSSL, як у наявному protocol spike;
шлях можна задати через `ETERNAL_TEST_OPENSSL`. Використовується окремий профіль,
production credentials і запити до реальних OAuth-провайдерів не потрібні.

```sh
pnpm --filter @eternal/desktop build
pnpm --filter @eternal/desktop test
pnpm --filter @eternal/desktop lint
pnpm --filter @eternal/desktop e2e e2e/oauth.spec.ts
pnpm --filter @eternal/desktop e2e e2e/smoke.spec.ts e2e/native-ux.spec.ts
```

## Приймання, яке ще потрібне

Контрольовані fixtures підтверджують транспорт та ізоляцію, а не live OAuth
конфігурацію провайдерів. Потрібно вручну підключити й відключити кожний сервіс
у справжніх облікових записах, перевірити згоду/відмову, повторний вхід, MFA
та provider-specific login переходи на Windows/macOS/Linux. Нові необхідні
provider origins додаються лише явно після перевірки, без wildcard allowlist.
Frontend origin і callback URLs повинні відповідати поточним CORS/provider
налаштуванням; зокрема GitHub повертає перший CORS_ORIGIN.

Окрема наявна проблема: `useSpotifyPlayerStore.reauthorizeSpotify` використовує
legacy `spotify_oauth_popup` і GET `/integrations/spotify/auth?userId=...`
без Bearer, тоді як backend guard приймає Authorization Bearer. Цей шлях
потребує окремого переходу на authenticated POST + proof flow; він не входить
до підтвердженого основного підключення через профіль і тут не змінювався.

Hosted fallback B збережено. Поточні web/backend розгортання не публікувалися;
локальні зміни попередніх фаз не потрапляють на hosted renderer автоматично.
Фаза 5 реалізована в коді; повне live та кросплатформне приймання ще відкрите.
