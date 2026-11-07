# Desktop: фаза 3 — дзвінки й медіа

Реалізація: 2026-10-29. Electron 45.1.0; додано погоджений користувачем
`uiohook-napi` 1.5.5. Backend і WebSocket-контракти не змінювалися.

## Поведінка

- `getDisplayMedia` відкриває ізольований модальний пікер екранів і вікон із прев’ю.
  Жодне джерело не вибране автоматично. Є Share, Cancel, Escape, loading/error/empty
  і Retry. Прев’ю та назви не передаються хостованому renderer.
- Запит приймається лише від головного фрейму основного вікна, з точним origin
  і user gesture. Паралельні запити відхиляються. Після вибору origin перевіряється
  повторно. Закриття, навігація, збій renderer і таймаут скасовують вибір.
- Системний звук на Windows — `loopback`, лише після встановлення прапорця.
  Пікер пояснює: він містить звук усіх програм навіть для окремого вікна.
  macOS/Linux отримують відео без системного аудіо; мікрофон залишається незалежним.
  На Linux/PipeWire первинний вибір може виконувати системний portal.
- Дозволи камери/мікрофона обмежені trusted origin. На macOS запитуються відповідні
  OS permissions; у конфігурацію пакування додано usage descriptions.
- Звичайні 1:1 і групові conversation calls та окремі mesh-кімнати утримують
  незалежні scopes одного `prevent-app-suspension` blocker. Завершення одного
  scope не знімає blocker іншого. Навігація, crash, закриття і quit очищують його.
- `Ctrl/Cmd+Shift+M` перемикає мікрофон активного дзвінка або mesh-кімнати.
  Конфлікт реєстрації shortcut не перериває дзвінок; ручні кнопки залишаються.
- PTT звичайних дзвінків використовує наявні налаштування та release tail.
  У фокусі працює канонічний DOM-контролер, поза фокусом — нативні keydown/keyup.
  Перехоплення запускається лише при ввімкненому PTT під час connected call,
  не записує клавіші та не експортує raw input у renderer. Повтори і сторонні
  modifiers ігноруються. Deafen забороняє PTT unmute.
- Suspend, lock-screen і повернення фокуса примусово скидають PTT без tail,
  включно з натисканням, яке спочатку обробив DOM. Кінець дзвінка, зміна клавіші
  і зникнення renderer прибирають нативний hook та незавершені очікування IPC.
- На macOS глобальний PTT потребує Accessibility permission. Wayland і Linux без
  DISPLAY залишають PTT у вікні Eternal; відсутній addon або непідтримана клавіша
  не перешкоджають запуску програми. Окремий mesh voice-room також використовує ці
  налаштування клавіші й tail, керуючи власним мікрофоном; браузерний mesh не змінено.
  Якщо одночасно підключений conversation call, він має пріоритет для PTT;
  mesh-мікрофон закривається, а його PTT відновлюється після закінчення цього виклику.

## IPC і пакування

Міст додано сумісно з попередньою версією: `setCallActive`, `waitForCallAction`,
`configurePushToTalk`. Main окремо перевіряє sender/main frame/origin та Zod-кортеж
аргументів. Події клавіш доставляються через обмежене очікування invoke/handle;
довільний `ipcRenderer` не експортується. Пікер має власний allowlist IPC,
відхиляє сторонні WebContents і не отримує `window.desktop`.

Нативний addon залишається external у main bundle; його Node-API prebuilds
розпаковуються з ASAR. Архітектури Windows x64/arm64, macOS x64/arm64,
Linux x64/arm64 є у встановленому пакеті. Це не підтверджує роботу на всіх ОС.

Фази 1–2 використовують hosted fallback B. Нові renderer hooks з цієї фази
потребують публікації актуального web bundle звичайним процесом релізу.
Уже опублікований старий веб не почне викликати нові методи автоматично.

## Перевірка й приймання

Перевірки Windows x64: desktop/web TypeScript, desktop ESLint, відповідні web
ESLint-перевірки, модульні тести, desktop build, Electron smoke і media E2E,
unpacked packaging. Media E2E перевіряє справжні Chromium capture API на локальному
fixture: loading/error/empty/retry, Escape, вибір клавіатурою, вузьке вікно,
захоплення відео й Windows loopback audio, fake camera/microphone, lifecycle blocker
та завантаження/запуск/зупинку нативного PTT addon. Tracks негайно зупиняються;
медіа не передається в мережу. Нативні PTT down/up та suspend reset додатково
покриті модульними регресійними тестами.

Статичний UI audit обмежено `apps/desktop/src`; звіт — `phase3-audit.json`.
Це не аудит усього вебпроєкту й не заміна runtime-перевірок.

Повне приймання фази потребує живих 1:1/групових дзвінків із другим клієнтом,
перевірки screen/window share, фізичного global PTT, suspend/resume та OS permissions
на Windows, macOS і Linux. У цьому середовищі macOS/Linux і реальні пристрої
камери/мікрофона не перевірені. Автопублікація й production deployment не виконувалися.
