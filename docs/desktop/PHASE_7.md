# Фаза 7 — Enterprise

Реалізовано політики, локальну діагностику з експортом, main Sentry та
адміністративну документацію. Backend, production і релізи не змінюються.
MSI per-machine використовує конфігурацію фази 6.

- `policies.ts`: Zod, HKLM перед HKCU для кожного ключа, managed plist і Linux
  JSON; невідомі ключі ігноруються з діагностичним лічильником. Помилки відомих
  значень/читання блокують запуск. Політики застосовуються до telemetry/window
  creation; для зміни потрібен restart.
- Updater сам відхиляє зміну примусового каналу і заборонені автоматичні
  оновлення, незалежно від меню/IPC. Minimum-version gate збережено.
- Автозапуск прибирається при забороні; увімкнення блокує модуль autostart.
  DevTools застосовуються до основного вікна, OAuth і screen picker.
- `electron-log` через node entry без додаткових renderer IPC; ротація 2 MiB,
  експорт обох поколінь із Help, без профілю та crash dumps.
- Sentry 8.3.0: main only, privacy allowlist перед відправкою, без offline queue
  і renderer IPC. CrashReporter — лише локальні minidumps. `DisableTelemetry`
  перевіряється перед init і синхронно перед web Sentry; session блокування
  ingestion діє також для попередньої hosted web збірки.

Команди адміністратора, семантика політик, встановлення й troubleshooting:
[ADMIN_GUIDE.md](ADMIN_GUIDE.md).

## Перевірка

Перевірено на Windows x64:

- Desktop build і strict TypeScript; web TypeScript.
- 180 desktop-тестів у 21 файлі поточного робочого дерева, включно з тестами
  паралельної реалізації YouTube; 7 web Sentry-тестів.
- ESLint усіх файлів фази 7 та web Sentry; desktop Knip без findings.
- Реальний Electron smoke: sandboxed bridge, update IPC, відхилення недовірених
  origin; native UX: tray/deep links/window state. Контракт smoke враховує
  паралельно додані `connectYouTube` / `cancelYouTube`.
- Реальний запуск hosted renderer й виклик Help → Export logs: файл містить
  startup/ready, обмежений розмір; rotation/cancel/write-error — окремі тести.
  Виявлену гонку виходу під час startup виправлено: після початку Quit помилка
  незавершеної навігації не відкриває блокувальний startup dialog.
- Один незалежний focused review без невиправлених findings.
- Зібрано непідписаний `release/Eternal-1.0.0-win-x64.msi` (137 728 000 bytes).
  Read-only перевірка таблиць MSI: `ALLUSERS=1`, APPLICATIONFOLDER під
  `ProgramFiles64Folder`, стабільний UpgradeCode
  `{D82BD303-0A8B-55D8-B564-8F01C2068BC3}`, запуск після встановлення обмежений
  `UILevel >= 4` і не виконується для `/qn`. Це перевірка артефакту, не
  підтвердження інсталяції. Версія `1.0.0` тестова; публікації не було.
  ASAR містить metadata `eternalDistribution=msi`, Sentry, electron-log і
  native uiohook prebuild для Windows x64.

Перший desktop test run із необмеженою кількістю workers мав worker/timeouts;
повний запуск із `--maxWorkers=2` пройшов. Повний desktop lint виявив
`no-unused-vars` у паралельно створеному `youtubeOAuth.test.ts:21`; цей файл у
фазі 7 не змінювався. Scoped lint змінених файлів пройшов.

Windows registry e2e має окремий precondition: не змінювати наявні політики й
мати право створити тестовий HKCU policy key. Тут хост повернув
`UnauthorizedAccessException` для `HKCU\Software\Policies\Eternal`; тест
пропущено, ключ після перевірок відсутній. Застосування політик перевірено
unit-тестами, реальний Windows registry rollout залишається відкритим.

Повне приймання потребує тихої per-machine інсталяції, оновлення й видалення
на Windows із правами адміністратора, а також runtime перевірки managed
plist/Linux policy на відповідних ОС. У цьому процесі немає прав
адміністратора; production Sentry DSN і надсилання подій не перевірялися.

Автоматична перевірка дозволів заблокувала видалення тимчасового профілю
`%TEMP%\eternal-export-Ty48PY` з першого невдалого запуску export e2e. Профіль
залишено; додаткова причина понад `blocked by policy` інструментом не надана.
