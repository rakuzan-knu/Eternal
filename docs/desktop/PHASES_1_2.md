# Desktop: реалізація фаз 1–2

Дата перевірки: 2026-10-29. Electron 45.1.0, electron-vite 6.0.0,
electron-builder 26.18.0, @electron/fuses 2.1.3. Backend не змінювався.

## Рішення spike: fallback B

Звичайний запуск і packaged-програма відкривають `https://eternalnet.vercel.app/`
без перехоплення HTTPS. UI залишається спільним із вебом. Для запуску потрібна мережа.
Діагностичний варіант A реалізовано, але він не пройшов критерій upload progress.

На Windows x64 контрольований Playwright/Electron spike з локальним HTTPS-сервером
перевірив сесію через справжній Chromium network stack:

| Перевірка варіанта A | Результат |
| --- | --- |
| Два Secure/HttpOnly cookies через redirect | Пройдено |
| Передавання upload 1 MiB | Усі байти отримано |
| XHR upload progress | Жодної події з ненульовим loaded — no-go |
| Потокова відповідь | Частини доступні окремо до завершення відповіді |
| Range / 206 | Статус, Content-Range і байти збережено |
| WSS | Handshake та повідомлення пройдено |
| Той самий upload після вимкнення перехоплення | Прогрес відновився |

Це транспортний тест, а не перевірка production-авторизації або socket.io-контракту.
Він не надсилає дані користувачів у production. Тестовий TLS-сертифікат створюється
в тимчасовій теці, довіряється лише всередині тестової Electron-сесії й видаляється.
Production-код не змінює перевірку сертифікатів.

## Запуск

Із кореня репозиторію:

```sh
pnpm dev:desktop
pnpm build:desktop
pnpm --filter @eternal/desktop preview
pnpm package:desktop
pnpm --filter @eternal/desktop test
pnpm --filter @eternal/desktop e2e
```

`dev:desktop` запускає веб на `http://localhost:5173` зі звичайним development env
вебпроєкту та electron-vite для main/preload. Порт фіксований, зайнятий порт є помилкою.
`build:desktop` збирає веб у `dist-desktop` без SEO prerender і окремо main/preload.
`package:desktop` створює локальний unpacked-каталог з ASAR і fuses, без публікації.
Інсталятори, підписи, оновлення й релізний pipeline належать наступним фазам.
Fallback B не включає невикористаний локальний renderer у пакет.

Для повторного дослідження A після збірки, лише в непакованій програмі (PowerShell):

```powershell
$env:ETERNAL_DESKTOP_LOCAL_RENDERER = '1'
pnpm --filter @eternal/desktop preview
Remove-Item Env:ETERNAL_DESKTOP_LOCAL_RENDERER
```

Пакована програма ігнорує цей перемикач. Таблиця правил генерується з `vercel.json`
перед dev/build зі збереженням порядку внутрішніх і зовнішніх rewrites, включно
з локальним callback Twitch. Новий непідтриманий синтаксис зупиняє генерацію.

`.env.desktop` містить тільки публічні маршрути. Для перевірки реального Turnstile
потрібен production site key через наявний механізм env збірки; тестовий fallback
у вебкомпоненті не підтверджує production-авторизацію. У режимі B застосовуються
налаштування вже опублікованого вебу. Зміни вебу з цієї гілки автоматично там не з'являються.

## Межі безпеки

- Сесія `persist:eternal`, single-instance lock, стандартний Electron user agent.
- Sandbox, context isolation, web security увімкнено; Node у renderer/worker/frame,
  webview, insecure content і drag/drop навігацію вимкнено.
- IPC містить лише `getInfo` та `openExternal`. Main перевіряє конкретний WebContents,
  його main frame, точний origin і повний кортеж аргументів через Zod.
- Preload збирається в один CJS-файл разом із залежностями; `ipcRenderer` не експортується.
- Shell приймає лише валідовані `https:`/`mailto:` URL без credentials і control characters.
  Popups відхиляються; дозволені зовнішні посилання відкриваються системним браузером,
  включно з `noreferrer`. OAuth у дочірніх вікнах залишається фазою 5.
- Дозволи обмежені origin і allowlist плану; USB та інші device permissions заборонені.
  Нативний display picker залишається фазою 3.
- CSP забороняє довільні inline scripts, JS eval, objects, зміну base URI й вбудовування
  самої програми. Відомі SDK дозволені явно. HTTPS media/connect/frame потрібні
  наявним зовнішнім медіа й вбудованим документам; чужі origins не отримують IPC або дозволів.
- Відомий `/sw.js` блокується також у main; попередні service workers і CacheStorage очищуються.
  Локальний веб додатково не реєструє SW за наявності desktop-мосту.
- Packaged DevTools вимкнені; Chromium remote-debugging switches видаляються.
  Enterprise EnableDevTools policy належить фазі 7.
- afterPack застосовує всі шість fuses із плану до окремої копії Electron.
  Спільний development binary не змінюється.

## Приймання й обмеження

Перевірено на Windows x64: desktop typecheck/lint, 37 модульних тестів,
web desktop build із TypeScript, 20 web-тестів, Electron smoke та transport spike,
unpacked packaging, читання всіх шести fuses з готового EXE та dev-запуск на localhost:5173.
Nx desktop:typecheck і desktop Knip пройдено. Smoke перевіряє production-origin, запуск React, вузький міст,
відсутність Node у сторінці, відхилення небезпечного URL та IPC з недовіреного origin.
Тести використовують тимчасові user-data профілі. HTML-звіт: `apps/desktop/playwright-report/`.
E2E потребує OpenSSL; на Windows типовий шлях — Git for Windows. Інший шлях задається
через `ETERNAL_TEST_OPENSSL`.

До повного приймання фази 1 залишаються живі перевірки: реальний login + Turnstile,
авторизована стрічка, чат, production upload із прогресом, HLS playback і socket.io.
macOS/Linux та їх пакування в цьому середовищі не перевірялися.

У режимі B CSP inline hashes обчислюються з початкового HTML хостованого вебу.
Якщо під час роботи процесу deployment змінить inline bootstrap, reload може заблокувати
новий inline-скрипт до перезапуску програми. Поточні inline-скрипти — стартовий error/theme
shield; React bundle завантажується з self. Це обмеження незалежного оновлення хостованого UI.
Довільний inline JavaScript у поточному `CodeSandboxPreview` також обмежений CSP;
повноцінний live preview потребує окремого ізольованого origin, без послаблення основної CSP.

Фази 1–2 реалізовано в коді; повне production-функціональне та кросплатформне приймання
не заявляється. Незалежний ручний перегляд меж проведено; Electronegativity не запускався.
