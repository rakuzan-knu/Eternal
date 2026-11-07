# Адміністрування Eternal Desktop

## Windows: MSI, Intune, GPO, SCCM

MSI встановлює Eternal для всіх користувачів (`perMachine: true`). Виконуйте
інсталяцію від адміністратора або SYSTEM; не запускайте сам клієнт як SYSTEM.
Підтримуються Windows 10/11; нижчі версії Windows не підтримуються runtime,
навіть якщо Windows Installer дозволяє встановити пакет.
Профіль, cookies, ключі та логи кожного користувача зберігаються окремо.

```powershell
msiexec.exe /i "Eternal-1.0.0-win-x64.msi" /qn /norestart /L*v "C:\Windows\Temp\Eternal-install.log"
msiexec.exe /x "Eternal-1.0.0-win-x64.msi" /qn /norestart /L*v "C:\Windows\Temp\Eternal-uninstall.log"
```

`1.0.0` — приклад версії. Використовуйте MSI відповідної архітектури з погодженого
релізу. Windows Installer коди: `0` — успіх, `3010` — потрібен перезапуск,
`1618` — інша інсталяція виконується, `1603` — помилка, див. MSI log.

- Intune: Win32 app, install behavior System; detection — MSI product code та
  версія з конкретного артефакту. Не використовуйте лише існування executable.
- GPO: Computer Configuration → Software Installation → Assigned MSI із UNC,
  доступного комп'ютерам домену. Політики розгортаються окремо через Registry
  Preferences у 64-bit гілку реєстру.
- SCCM: MSI application з detection за product code/version; оновлення через
  supersedence. Закрийте Eternal у всіх активних сесіях перед заміною версії.

MSI не запускає electron-updater: нову MSI розгортає адміністратор. NSIS —
окремий per-user канал (`installer.exe /S`); не накладайте MSI поверх NSIS.
Спочатку видаліть попередню per-user інсталяцію штатним деінсталятором.
Видалення MSI не є процедурою очищення персональних даних профілю.

Збірка без публікації:

```sh
pnpm build:desktop
pnpm --filter @eternal/desktop package:msi --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:msi --arm64 --version 1.0.0
```

Підпис і rollout спочатку перевіряються на тестовій групі. MSI без сертифіката
залишається непідписаним. CI, доставка checksum/attestation та публікація релізів
належать фазі 8; ці команди нічого не публікують.

## Політики

Політики читаються один раз при запуску, до Sentry та створення вікон. Після
зміни потрібен повний вихід через Quit Eternal, включно з треєм, і новий запуск.
Ключі case-sensitive; значення мають точно відповідати типам.

| Ключ | Тип | Поведінка |
|---|---|---|
| `DisableAutoUpdate` | boolean | Managed mode: немає release feed, download/install; канал не змінюється користувачем |
| `UpdateChannel` | `stable` або `beta` | Переважає userData/updates.json; зміна з меню або IPC заборонена |
| `DisableTelemetry` | boolean | Не ініціалізувати desktop Sentry/crashReporter; передати заборону web та блокувати Sentry ingestion і HTTP call telemetry у сесії |
| `EnableDevTools` | boolean | Дозволити або заборонити DevTools у main/OAuth/picker і нативному меню |
| `DisableAutoLaunch` | boolean | При старті прибрати наявний автозапуск; заблокувати повторне ввімкнення з трея |

Без політик оновлення залежать від формату, канал — від вибору користувача,
DevTools вимкнено в packaged builds і ввімкнено у development. Автозапуск
залишається opt-in. `false` не вмикає автозапуск і не змінює managed MSI на NSIS.
Мінімальна версія залишається обов'язковою навіть із `DisableAutoUpdate`:
користувач застарілого MSI має звернутися до адміністратора.

Невідомі ключі ігноруються, кількість записується в локальний log без значень.
Неправильний тип відомого ключа, помилка доступу, пошкоджений файл або збій
читання реєстру зупиняють запуск. Це запобігає непомітному запуску без заборон.
Відсутнє джерело означає відсутність політик. Файли/вивід обмежено 64 KiB.

### Windows: NSIS і MSI

64-bit registry view: `HKLM\Software\Policies\Eternal` має пріоритет над
`HKCU\Software\Policies\Eternal` для кожного ключа. Ключі, відсутні у HKLM,
можуть братися з HKCU. Для обов'язкової корпоративної політики задавайте її в HKLM.
Boolean — `REG_DWORD` лише `0`/`1`; канал — `REG_SZ`.

```reg
Windows Registry Editor Version 5.00

[HKEY_LOCAL_MACHINE\Software\Policies\Eternal]
"DisableAutoUpdate"=dword:00000001
"UpdateChannel"="stable"
"DisableTelemetry"=dword:00000001
"EnableDevTools"=dword:00000000
"DisableAutoLaunch"=dword:00000001
```

Читання використовує системний Windows PowerShell у прихованому процесі з
`-NoProfile -NonInteractive`, Registry64 та timeout 10 секунд. У середовищах,
де PowerShell/.NET Registry API заборонений application control, протестуйте
доступність цього read-only шляху до розгортання.

### Windows: MSIX / Microsoft Store

Коли Electron підтверджує MSIX-контекст (`process.windowsStore`), політики
читаються з `%ProgramData%\Eternal\policies.json` без запуску PowerShell або
інших зовнішніх executables. Це окреме machine-level джерело для Store-каналу;
HKLM/HKCU з попереднього розділу тут не читаються. Перед керованим переходом
з MSI/NSIS перенесіть потрібні значення у цей файл.

Використовуйте JSON object із тими самими boolean/string ключами, як у
прикладі Linux нижче, UTF-8 без BOM і не більше 64 KiB. Каталог і файл
розгортає адміністратор із правом запису лише для Administrators/SYSTEM та
правом читання для користувачів. Застосунок не створює цей файл, не змінює ACL
й не запитує elevation. Оновлюйте файл атомарно та перезапускайте застосунок.
Відсутній файл означає відсутність політик; помилка доступу, некоректний JSON,
неправильні типи чи перевищений розмір зупиняють запуск.

Цей шлях усуває залежність старту від PowerShell у MSIX, але не замінює
перевірку встановленого пакета та Windows S mode. Старий реліз v1.13.0 ще
використовує registry/PowerShell і не підтверджений для S mode.

### macOS

`/Library/Managed Preferences/com.eternal.desktop.plist`, XML або binary plist;
читання через системний `plutil`. Приклад вмісту MDM preference payload:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>DisableTelemetry</key><true/>
  <key>DisableAutoLaunch</key><true/>
  <key>EnableDevTools</key><false/>
  <key>UpdateChannel</key><string>stable</string>
</dict></plist>
```

Застосунок має мати доступ до цього точного machine-level шляху. Per-user MDM
preference paths та довільні payload domains не читаються. DMG оновлюється
вручну; PKG для Jamf у цій фазі не реалізовано.

### Linux

`/etc/eternal/policies.json`, JSON object; root-owned, запис лише адміністратору,
читання користувачам (наприклад, `0644`). Оновлюйте атомарною заміною файла.

```json
{
  "DisableAutoUpdate": true,
  "UpdateChannel": "stable",
  "DisableTelemetry": true,
  "EnableDevTools": false,
  "DisableAutoLaunch": true
}
```

Автозапуск видаляє лише власний XDG autostart entry. Сторонні systemd units або
login scripts адміністратора не змінюються. Доступ sandboxed Flatpak/Snap до
machine policy path потребує окремого приймання фази 9.

## Логи, Sentry та troubleshooting

Help → Export logs… відкриває save dialog і створює текстовий файл із версією,
платформою й двома поколіннями main log. Експорт локальний: автоматичної
відправки немає. Помилка запису показує повідомлення; можна повторити з іншою
директорією. Скасування нічого не створює.

`electron-log` пише в Electron `app.getPath('logs')` (`main.log`, `main.old.log`),
із межею 2 MiB на поточний файл і одним попереднім поколінням. Експорт читає
не більше 2 MiB із кожного. Типові шляхи: Windows `%APPDATA%\Eternal\logs`,
macOS `~/Library/Logs/Eternal`, Linux `~/.config/Eternal/logs`; точне ім'я каталогу
залежить від назви пакета та userData override. Логи містять визначені події
startup/ready/shutdown, збої запуску, процесів, updater та кількість невідомих
політик. URL, credentials, тексти повідомлень і довільні exception payloads не
записуються. Cookies, профіль, ключі й crash dumps до експорту не входять.

Desktop Sentry використовує `@sentry/electron`. Public DSN того самого Sentry
проєкту, що й web, задається під час збірки через `MAIN_VITE_SENTRY_DSN` або
під час запуску через `ETERNAL_DESKTOP_SENTRY_DSN`. Без DSN відправка вимкнена.
Не задавайте auth token замість public DSN. Tagged release —
`eternal-desktop@<version>`, tag `platform=desktop`.

SDK працює тільки в main; додаткові renderer IPC handlers/preload injection,
session tracking, replay, screenshots, tracing та offline send queue вимкнені.
Перед відправкою лишаються ID/час/рівень, версія й координати main stack у
`index.cjs`; довільний текст, контекст, user, request і breadcrumbs відкидаються.
Renderer JavaScript errors покриває чинний web Sentry, а завершення renderer і
child processes — main diagnostics. Native minidumps збираються crashReporter
лише локально, `uploadToServer: false`, і можуть містити дані пам'яті; не
передавайте їх автоматично. `DisableTelemetry` не вимикає локальні текстові логи.

Hosted web може бути старішим за новий прапорець мосту, тому desktop-сесія
додатково блокує `*.sentry.io`, Sentry `/api/<project>/(envelope|store|minidump)`
та `/calls/telemetry`. Власний Sentry tunnel із нестандартним URL потребує
оновлення allow/block правил перед його ввімкненням. Політика діагностики не
змінює функціональні WebRTC signaling/statistics events.

При відмові запуску перевірте типи й права політик, потім локальний main.log.
`minimum-check-failed` означає недоступність version policy; відома вимога не
скидається. `update-check-failed` — недоступний release feed. Перевіряйте
системний proxy/корпоративні CA та доступ до hosted web/GitHub; не вимикайте
webSecurity або перевірку TLS. Повернення до попередньої версії здійснює
адміністратор тільки після перевірки сумісності й minVersion.

## Межі приймання

Фактичні перевірки та відкриті пункти цієї реалізації наведено у
[PHASE_7.md](PHASE_7.md). Конфігурація MSI та unit-тести не замінюють тиху
інсталяцію/upgrade/uninstall на цільовому керованому комп'ютері.
