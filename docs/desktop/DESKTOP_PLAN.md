# Eternal Desktop — план внедрения

Статус: утверждённая архитектура, реализация по фазам в отдельных чатах.
Цель: десктопное приложение для Windows, macOS и Linux с полным функционалом и дизайном `apps/web`, бесплатно и на уровне enterprise.

---

## 0. Ключевые решения

| Решение | Выбор | Почему |
|---|---|---|
| Фреймворк | **Electron** (последняя стабильная версия на момент старта) | Один Chromium на всех ОС: WebRTC, `getDisplayMedia`, mediapipe, WebCrypto, hls.js работают одинаково |
| Код UI | **Не копировать.** `apps/desktop` — оболочка, renderer = сборка `apps/web` | Один источник дизайна и логики, нет дублирования |
| Dev-сборка main/preload | `electron-vite` | HMR, тот же Vite, что в `apps/web` |
| Упаковка и обновления | `electron-builder` + `electron-updater` | MSI/NSIS/DMG/AppImage/deb/rpm/Flatpak/Snap из одного конфига, бесплатные автообновления |
| Origin приложения | **`https://eternalnet.vercel.app`, перехваченный локально** | Cookie, CORS, Turnstile, OAuth state и WebAuthn rpId остаются как в вебе — **ноль изменений backend для логина** |
| Хранение релизов | GitHub Releases репозитория `rakuzan-knu/Eternal` (публичный) | Бесплатно, без лимита трафика, `electron-updater` работает без токена |
| Версия | Одна версия с web (существующий semantic-release) | Десктоп и веб всегда совместимы по контрактам |

### Как работает origin (самое важное)

Продакшен-веб ходит в API по относительному пути `/v1/...` ([httpClient.ts](../../apps/web/src/shared/api/httpClient.ts)), Vercel проксирует его на Render ([vercel.json](../../vercel.json)). Auth-cookie first-party на `eternalnet.vercel.app`, `SameSite=lax`.

В Electron окно открывает `https://eternalnet.vercel.app/`, а `session.protocol.handle('https', ...)` в разделе `persist:eternal` решает, откуда брать ответ:

1. Хост ≠ `eternalnet.vercel.app` → `ses.fetch(request, { bypassCustomProtocolHandlers: true })` (сеть как есть).
2. Путь совпадает с rewrite из `vercel.json`, у которого внешний `destination` (`/v1/*`, `/api/*` к Render и т.д.) → в сеть (Vercel).
3. Файл существует в локальном бандле → отдать локально (с CSP и кэш-заголовками).
4. Навигационный запрос (`sec-fetch-mode: navigate`) → локальный `index.html` (SPA fallback для `BrowserRouter`).
5. Иначе → в сеть.

Таблица rewrite генерируется из `vercel.json` на этапе сборки (не дублировать вручную).
WebSocket (`wss`, socket.io через `VITE_WS_URL`) протокол-хендлер не перехватывает — идёт напрямую, как в вебе.

**Fallback, если spike в фазе 1 покажет проблемы** (Set-Cookie через `ses.fetch`, стриминг загрузок, прогресс upload): вариант B — `loadURL('https://eternalnet.vercel.app')` без локального бандла, с тем же hardening. Тоже без изменений backend.

---

## 1. Поддерживаемые платформы

| ОС | Минимум | Архитектуры | Форматы |
|---|---|---|---|
| Windows | 10 / 11 (7, 8, 8.1 не поддерживаются современным Chromium) | x64, arm64 | NSIS (per-user), MSI (per-machine, enterprise), MSIX (Microsoft Store) |
| macOS | версия, поддерживаемая выбранным Electron (сейчас ~12+) | universal (x64 + arm64) | DMG, ZIP |
| Linux | glibc из требований Electron | x64, arm64 | AppImage, deb, rpm, Flatpak (Flathub), Snap |

---

## 2. Бесплатная подпись и дистрибуция

| Платформа | Бесплатный путь | Ограничение |
|---|---|---|
| Windows | **Microsoft Store**: регистрация индивидуального разработчика бесплатна (проверить актуальные условия при регистрации). Store подписывает MSIX сам и обновляет приложение | Сборки вне Store (NSIS/MSI с GitHub) будут неподписанными → SmartScreen предупреждает, пока не накопится репутация |
| Windows (OSS) | SignPath Foundation — бесплатно только для проектов с OSI-лицензией | Сейчас `LICENSE.md` = UNLICENSED → не подходит |
| macOS | Бесплатного способа нотаризации нет (Apple Developer Program платный) | Ad-hoc подпись (обязательна для arm64), пользователь жмёт «Всё равно открыть» в настройках. **Squirrel.Mac не обновляет неподписанные приложения** → на macOS вместо автообновления баннер «Доступна версия X» со ссылкой на DMG |
| Linux | Flathub, Snap Store, AppImage — подпись не нужна | — |
| Все | Целостность: `SHA256SUMS` + GPG-подпись (бесплатно), **GitHub artifact attestations** (`actions/attest-build-provenance`, бесплатно для публичных репо), SBOM CycloneDX | — |

CI сразу пишется так, что подпись включается секретами (`CSC_LINK`, `APPLE_ID`, `APPLE_TEAM_ID`, …). Пока секретов нет, шаг пропускается. Появится бюджет — добавляются секреты, код не меняется.

### Обновления

| Канал | Механизм |
|---|---|
| Windows NSIS | `electron-updater` из GitHub Releases, дифференциальные обновления по blockmap |
| Windows MSI | Обновляет администратор (Intune/GPO). Автообновление отключено политикой |
| Windows Store | Store |
| macOS | Проверка `latest-mac.yml` → баннер со ссылкой (до появления подписи) |
| Linux AppImage | `electron-updater` |
| Linux deb/rpm | Баннер со ссылкой (пакетный менеджер обновляет сам) |
| Flatpak/Snap | Магазины |

Каналы `stable` и `beta` (GitHub prerelease), выбираются в настройках или политикой.

**Минимальная версия:** статический файл `apps/web/public/desktop/version.json` (`{ "minVersion": "x.y.z" }`) отдаётся Vercel. Если версия приложения ниже — экран принудительного обновления. Backend не трогаем.

---

## 3. Структура

```
apps/desktop/
  package.json
  project.json                     Nx targets: dev, build, package, lint, typecheck, test, e2e
  tsconfig.json
  tsconfig.node.json
  electron.vite.config.ts          main + preload (renderer берётся из apps/web)
  electron-builder.config.ts       все таргеты, publish: github
  build/                           иконки (ico, icns, png 16–1024), entitlements.mac.plist, Flatpak/Snap манифесты
  scripts/
    generate-route-table.ts        vercel.json → src/main/generated/routeTable.ts
    fuses.ts                       afterPack: Electron fuses
  src/
    main/
      index.ts                     bootstrap, single-instance lock, lifecycle
      window.ts                    BrowserWindow, сохранение размеров/позиции
      session.ts                   partition persist:eternal, UA, spellchecker
      protocol.ts                  перехват https (раздел 0)
      security.ts                  навигация, window.open, CSP, webview запрет
      permissions.ts               allowlist разрешений по origin
      displayMedia.ts              setDisplayMediaRequestHandler + desktopCapturer
      notifications.ts             нативные уведомления, бейдж, overlay icon
      tray.ts                      трей, свернуть в трей
      deepLinks.ts                 eternal://
      shortcuts.ts                 глобальные хоткеи (push-to-talk, mute)
      updater.ts                   electron-updater, каналы, баннеры
      policies.ts                  чтение enterprise-политик
      autoLaunch.ts                автозапуск (opt-in)
      power.ts                     powerSaveBlocker во время звонка, powerMonitor → idle-статус
      menu.ts                      нативное меню
      logging.ts                   electron-log с ротацией
      ipc.ts                       регистрация IPC с zod-валидацией и проверкой sender origin
      generated/routeTable.ts
    preload/
      index.ts                     contextBridge → window.desktop
    shared/
      ipcContract.ts               zod-схемы и типы каналов (единый источник для main/preload/web)
  e2e/
    smoke.spec.ts                  Playwright _electron
```

### Изменения вне `apps/desktop`

| Файл | Изменение |
|---|---|
| `pnpm-workspace.yaml` | добавить `apps/desktop` |
| `package.json` (root) | `dev:desktop`, `build:desktop`, `package:desktop` |
| `apps/web/package.json` | `build:desktop` = `tsc -b && vite build --mode desktop --outDir dist-desktop` (без prerender SEO) |
| `apps/web/.env.desktop` | только публичные значения, как в проде; `VITE_API_URL` пустой (относительные пути) |
| `apps/web/src/shared/lib/platform.ts` | новый: `isDesktop()`, типизированный доступ к `window.desktop` |
| `apps/web/src/vite-env.d.ts` | тип `Window['desktop']` (импорт из `apps/desktop/src/shared/ipcContract.ts` через алиас или пакет) |
| `apps/web/src/shared/lib/browserPushNotifications.ts` | в десктопе не регистрировать `sw.js`, уведомления через мост |
| `apps/web` точки интеграции | счётчик непрочитанных → бейдж; звонок → powerSaveBlocker, push-to-talk; выбор экрана → нативный пикер; ссылки «поделиться» → `shell.openExternal` |
| `apps/web/public/desktop/version.json` | minVersion |
| `.github/workflows/desktop.yml` | матрица сборки (раздел 6) |
| `release.config.cjs` | прикреплять десктоп-артефакты к релизу |
| `knip.json`, eslint boundaries | учесть новое приложение |
| `.gitignore` | `apps/web/dist-desktop`, `apps/desktop/out`, `apps/desktop/release` |

Если мостов в web станет много, вынести контракт в `packages/shared/desktop-bridge` по образцу остальных `packages/shared/*`.

---

## 4. Безопасность (enterprise baseline)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, `webviewTag: false`.
- Electron fuses: `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments` off, `EnableEmbeddedAsarIntegrityValidation` on, `OnlyLoadAppFromAsar` on, `EnableCookieEncryption` on.
- Навигация: `will-navigate` и `setWindowOpenHandler` — внутри окна только `eternalnet.vercel.app` и allowlist OAuth-провайдеров интеграций, всё остальное → `shell.openExternal` (только `https:`/`mailto:`).
- Разрешения: `setPermissionRequestHandler`/`setPermissionCheckHandler` — `media`, `display-capture`, `notifications`, `clipboard-sanitized-write`, `fullscreen` только для нашего origin. Остальное запрещено.
- CSP добавляется в ответах протокол-хендлера (на основе текущей политики веба).
- IPC: только `invoke`/`handle`, каждый канал валидируется zod, проверяется `event.senderFrame.url`.
- Мост `window.desktop` — минимальный, без проброса `ipcRenderer`.
- DevTools в проде отключены (включаются политикой).
- Ключи из бандла (`VITE_GEMINI_API_KEY`, `VITE_GIPHY_*`) в десктопе извлекаются ещё проще, чем в вебе → отдельная задача: проксировать через backend (не блокирует десктоп).

---

## 5. Функциональность

### Из веба без изменений
Весь UI, дизайн, лента, чаты, E2EE, звонки, музыка, рилсы, магазин, локализация, офлайн-кэш react-query.

### Требует адаптации
| Функция | Решение |
|---|---|
| Логин (email + пароль + Turnstile) | Работает как в вебе: тот же origin. Проверить, что Turnstile не режет Electron |
| Интеграции GitHub, Spotify, Steam, Twitch | OAuth в дочернем окне Electron той же сессии — state-cookie совпадает, callback возвращается на перехваченный origin |
| Интеграция YouTube (Google) | Google блокирует OAuth во встроенных браузерах (`disallowed_useragent`). Нужен системный браузер + deep link `eternal://` + одноразовый handoff-код. **Это изменение backend** (state сейчас привязан к cookie) → отдельная фаза, только после явного разрешения и с учётом `docs/SERVICE_OWNERSHIP.md`. Подмену User-Agent не используем |
| Демонстрация экрана | `setDisplayMediaRequestHandler` + собственный пикер окон/экранов с превью, системный звук (Windows loopback; на macOS и Linux — ограничения ОС) |
| Push-уведомления | Web Push через SW отключён; уведомления из socket-событий, пока приложение работает (трей). Клик → фокус и переход в чат |
| Биометрия в звонках (`biometricStepUp`) | WebAuthn: Windows Hello работает; на macOS платформенный аутентификатор в Electron ограничен → существующий fallback |
| Мульти-вкладки (`multiTabCallCoordinator`, BroadcastChannel) | Одно окно + single-instance lock; повторный запуск фокусирует окно |

### Десктоп-фичи
Трей и свернуть в трей, бейдж непрочитанных (macOS dock, Windows overlay, Linux Unity), push-to-talk и mute глобальными хоткеями, автозапуск (opt-in), deep links `eternal://`, нативное меню, системная проверка орфографии, сохранение положения окна, предотвращение сна во время звонка, автостатус «отошёл» по `powerMonitor`, системный прокси и корпоративные сертификаты из хранилища ОС (Chromium делает это сам).

---

## 6. Enterprise

- **Установка:** MSI per-machine с тихой установкой (`msiexec /i Eternal.msi /qn`), NSIS per-user (`/S`). Документировать для Intune/GPO/SCCM; macOS — PKG для Jamf (опционально), Linux — deb/rpm репозиторий (опционально, GitHub Pages).
- **Политики** (`policies.ts`), источники по приоритету:
  - Windows: `HKLM\Software\Policies\Eternal`, затем `HKCU\...`
  - macOS: `/Library/Managed Preferences/com.eternal.desktop.plist`
  - Linux: `/etc/eternal/policies.json`
  - Ключи: `DisableAutoUpdate`, `UpdateChannel`, `DisableTelemetry`, `EnableDevTools`, `DisableAutoLaunch`. Типизированы zod, неизвестные ключи игнорируются и логируются.
- **Наблюдаемость:** `@sentry/electron` (бесплатный тариф, тот же проект Sentry, что у веба, тег `platform=desktop`), `crashReporter`, `electron-log` с ротацией, «Экспорт логов» в меню «Помощь».
- **Качество:** vitest для main-модулей, Playwright `_electron` smoke на всех 3 ОС, typecheck/lint через Nx, knip, бюджет размера установщика.
- **Поставка:** semantic-release → GitHub Release → артефакты всех ОС, `latest*.yml`, `SHA256SUMS(.asc)`, attestations, SBOM.
- **Документация:** `docs/desktop/` — архитектура, установка для админов, политики, релизный процесс, troubleshooting.

### CI (`.github/workflows/desktop.yml`)
- Триггеры: PR (сборка без публикации + e2e smoke), релиз (публикация).
- Матрица: `windows-latest`, `macos-latest` (universal), `ubuntu-latest` (x64) + arm64 Linux через `ubuntu-24.04-arm`, arm64 Windows через кросс-сборку.
- Шаги: pnpm install → `build:desktop` web → electron-vite build → electron-builder → fuses → (подпись, если есть секреты) → attest → upload в релиз.
- Все actions пинятся по SHA (в репо уже есть `validate:actions`).
- Flathub и Snap — отдельные шаги/репозитории после первого стабильного релиза.

---

## 7. Фазы

Каждая фаза — отдельный чат. В начале чата: «Прочитай `docs/desktop/DESKTOP_PLAN.md`, выполняем фазу N».

| Фаза | Содержание | Критерий готовности | Backend |
|---|---|---|---|
| **1. Spike + каркас** | `apps/desktop`, electron-vite, окно, `persist:eternal`, протокол-хендлер с таблицей из `vercel.json`, `build:desktop` в web, `.env.desktop`, dev-режим на `localhost:5173` | В собранном приложении работают логин, лента, чат, загрузка медиа с прогрессом, видео (HLS), socket. Go/no-go для варианта A vs B | нет |
| **2. Безопасность** | fuses, sandbox, навигация, window.open, разрешения, CSP, IPC-контракт с zod, мост `window.desktop`, `platform.ts` в web | Чек-лист раздела 4 закрыт, Electronegativity/ручной аудит без critical | нет |
| **3. Звонки и медиа** | пикер демонстрации экрана, системный звук, разрешения камеры/микрофона, powerSaveBlocker, push-to-talk | Звонок 1:1 и групповой, шаринг экрана/окна на 3 ОС | нет |
| **4. Нативный UX** | трей, уведомления из socket, бейдж, deep links, меню, автозапуск, спеллчекер, состояние окна, idle | Всё из раздела 5 «Десктоп-фичи» | нет |
| **5. Интеграции** | OAuth GitHub/Spotify/Steam/Twitch в дочернем окне | Все 4 подключаются и отключаются | нет |
| **5b. YouTube через системный браузер** | handoff-код + `eternal://` | YouTube подключается | **да — только с явным разрешением** |
| **6. Упаковка и обновления** | electron-builder для всех форматов, иконки, `electron-updater`, каналы, баннеры для macOS/deb/rpm, `version.json`/minVersion | Установщики ставятся, обновление 1.x → 1.x+1 проходит на Windows NSIS и AppImage | нет |
| **7. Enterprise** | MSI per-machine, политики, Sentry, логи, экспорт логов, документация для админов | Тихая установка MSI, политики применяются | нет |
| **8. CI и релизы** | workflow, интеграция с semantic-release, SHA256SUMS, GPG, attestations, SBOM, e2e smoke | Тег релиза → артефакты всех ОС в GitHub Release | нет |
| **9. Магазины** | Microsoft Store (MSIX), Flathub, Snap | Приложение опубликовано | нет |

Фазы 1 → 2 строго последовательны. После фазы 2 фазы 3, 4, 5 и 6 можно вести параллельно (разные файлы в `src/main`). 7 и 8 — после 6. 9 — после первого стабильного релиза.

Реализация фазы 3 и границы проверки: [PHASE_3.md](PHASE_3.md).
Реалізація фази 4 та межі приймання: [PHASE_4.md](PHASE_4.md).
Реалізація фази 5 та межі приймання: [PHASE_5.md](PHASE_5.md).
Реалізація фази 5b та межі приймання: [PHASE_5B.md](PHASE_5B.md).
Реалізація фази 6 та межі приймання: [PHASE_6.md](PHASE_6.md).
Реалізація фази 7 та межі приймання: [PHASE_7.md](PHASE_7.md).
Реалізація фази 8 та межі приймання: [PHASE_8.md](PHASE_8.md).

Підготовка фази 9 та відкриті умови публікації: [PHASE_9.md](PHASE_9.md).

---

## 8. Риски

| Риск | Митигация |
|---|---|
| `ses.fetch` в протокол-хендлере ломает Set-Cookie, стриминг или прогресс upload | Spike в фазе 1, fallback на вариант B |
| Turnstile отказывает Electron | Проверить в фазе 1; при проблеме — обсудить режим виджета |
| Google блокирует OAuth во встроенном окне | Фаза 5b с системным браузером |
| Неподписанные сборки: SmartScreen и Gatekeeper | Microsoft Store для Windows, инструкция для macOS, подпись по секретам позже |
| Нет автообновления на неподписанном macOS | Баннер со ссылкой + minVersion |
| Расхождение версий десктопа и backend | Одна версия через semantic-release, minVersion, обратная совместимость API |
| Размер установщика ~100 МБ | Дифференциальные обновления, бюджет размера в CI |
| Захардкоженный путь `<private-local-path>` в `presentationRendererPlugin` | Плагин только для dev-сервера, на десктоп не влияет; не трогаем |

---

## 9. Правила для исполнителей

- TypeScript only, строгая типизация, без `any`, без комментариев в коде.
- Не копировать код из `apps/web`. Изменения в web — минимальные точки интеграции через `platform.ts`.
- Новые библиотеки ограничены списком: `electron`, `electron-vite`, `electron-builder`, `electron-updater`, `@electron/fuses`, `electron-log`, `@sentry/electron`. Остальное — только по согласованию.
- Backend не трогать, кроме фазы 5b с явным разрешением.
- Не коммитить, не пушить, не открывать PR без явной просьбы.
