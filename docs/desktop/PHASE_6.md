# Фаза 6 — пакування й оновлення

Код реалізовано. Повне приймання фази залишається відкритим: потрібні інсталяція
на macOS/Linux і справжнє оновлення між двома опублікованими версіями на NSIS та
AppImage. Backend, production-конфігурація та GitHub Releases не змінювалися.

## Пакування

`scripts/package.ts` обирає один формат за запуск і записує `eternalDistribution`
у package.json усередині ASAR. Це відрізняє MSI від NSIS та deb/rpm від AppImage.
Не об'єднувати різні формати одним прямим викликом electron-builder: вони мають
різний режим оновлення. Стандартний формат відповідає ОС: NSIS, DMG або AppImage.
Усі команди пакування явно використовують `--publish never`.

```sh
pnpm build:desktop
pnpm --filter @eternal/desktop package --version 1.0.0
pnpm --filter @eternal/desktop package:dir --version 1.0.0
pnpm --filter @eternal/desktop package:nsis --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:nsis --arm64 --version 1.0.0
pnpm --filter @eternal/desktop package:msi --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:msix --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:dmg --universal --version 1.0.0
pnpm --filter @eternal/desktop package:zip --universal --version 1.0.0
pnpm --filter @eternal/desktop package:appimage --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:deb --arm64 --version 1.0.0
pnpm --filter @eternal/desktop package:rpm --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:flatpak --x64 --version 1.0.0
pnpm --filter @eternal/desktop package:snap --x64 --version 1.0.0
```

DMG/ZIP створюються на macOS; Linux-пакети перевіряти на Linux із потрібними
системними утилітами. Flatpak використовує явно задані runtime/base `25.08`,
без доступу до всього home; Snap — strict confinement. Їхня публікація та повна
перевірка дозволів медіа/глобальних клавіш належать фазі 9.
Пара `org.freedesktop.Platform` / `org.electronjs.Electron2.BaseApp` підтверджена
у [репозиторії Flathub](https://github.com/flathub/org.electronjs.Electron2.BaseApp/blob/branch/25.08/org.electronjs.Electron2.BaseApp.yml).

Ресурси ICO, ICNS, PNG 16–1024 і Store tiles лежать у `apps/desktop/build`;
походження та регенерація описані в його README. Entitlements macOS зберігають
JIT, камеру й мікрофон. Чинний afterPack продовжує застосовувати fuses.

Без `CSC_LINK` macOS використовує ad-hoc підпис. Нотаризація вмикається за
наявності `CSC_LINK`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
Windows підписується стандартними параметрами electron-builder за наявності
сертифіката; без нього NSIS/MSI лишаються непідписаними. Увімкнення цих шляхів
секретами реалізовано, але оплачений підпис і нотаризація тут не перевірялися.

У встановленому electron-builder 26.18 немає окремого target `msix`.
Команда `package:msix` передає target `appx` та вихідний файл `.msix` до MakeAppx,
який підтримує [створення MSIX](https://learn.microsoft.com/en-us/windows/msix/package/create-app-package-with-makeappx-tool).
Це пакування, а не публікація в Store. Для Store потрібні справжні
`ETERNAL_DESKTOP_STORE_IDENTITY` і `ETERNAL_DESKTOP_STORE_PUBLISHER` із Partner
Center; початкове `Eternal.Desktop` не є зареєстрованою Store identity.

5 листопада 2026 персоналізовані реквізити Microsoft прибрано з вихідного коду.
MSIX вимагає точні значення трьох environment variables з Partner Center;
див. [фазу 9](PHASE_9.md).

Оновлення фази 9: `package:msix` також вимагає точний
`ETERNAL_DESKTOP_STORE_PUBLISHER_DISPLAY_NAME` та стабільну версію від 1.0.0.
Процедура подання й актуальні обмеження — у [PHASE_9.md](PHASE_9.md).

У цьому Windows-середовищі завантажені SDK executables у кеші пакувальника
виявилися некоректними (`spawn UNKNOWN`). Підтримуваний параметр
`ELECTRON_BUILDER_WINDOWS_KITS_PATH`, спрямований на встановлену SDK 10.0.26100.0
(каталог архітектури з makeappx.exe), дозволив успішно створити MSIX. Цей шлях
не зашито в конфігурацію проєкту. MSIX не підписано й не встановлювався.

`--version` задає версію лише пакованого артефакту, не редагуючи workspace
package.json. `1.0.0` у наведених перевірках — тестова версія. Автоматичне
узгодження з semantic-release та CI належить фазі 8.

## Поведінка оновлень

| Формат | Режим |
|---|---|
| Windows NSIS | Явне завантаження та встановлення через electron-updater |
| Linux AppImage, запущений як AppImage | Такий самий механізм |
| macOS DMG/ZIP, Linux deb/rpm | Перевірка метаданих, банер і сторінка завантаження |
| MSI, MSIX/AppX, Flatpak, Snap, MAS | Адміністратор або магазин; рушій оновлення не запускається |
| Development | Оновлення й мережева перевірка мінімальної версії вимкнені |

Використовується `electron-updater` 6.8.12, сумісний із поточною гілкою builder
26. Updater залишається зовнішньою runtime-залежністю main bundle й пакується
в ASAR разом із транзитивними залежностями.

- Джерело — публічні Releases `rakuzan-knu/Eternal`, без токена. URL feed не
  передається з renderer. Провайдер читає `latest*.yml` / `beta*.yml` відповідної
  ОС, зокрема `latest-mac.yml` для ручного оновлення macOS.
- Меню Help містить перевірку оновлень і вибір Stable/Beta. Канал зберігається
  в userData/updates.json. Зміна каналу, перевірка й завантаження захищені від
  конфліктних одночасних операцій. Downgrade заборонений і після зміни каналу.
- Перевірка виконується після відкриття основного вікна й кожні шість годин.
  Автоматичне завантаження та інсталяція при виході вимкнені. Рушій перевіряє
  доступність версії, системні вимоги/staging і цілісність завантаження.
- Встановити можна тільки успішно завантажене оновлення. Під час активного
  дзвінка перезапуск заборонений; помилка залишає можливість повторити дію.
- Нові invoke/handle канали використовують точний origin, поточний WebContents,
  лише його main frame та повні Zod tuple-схеми. Результати довгих операцій
  повторно перевіряють sender перед поверненням. Feed errors не виносять URL,
  credentials або stack trace в стан renderer.

Глобальний `DesktopUpdates` монтується також на login/loading/legal сторінках,
використовує чинний shared Button і runtime-токени. Є завантаження, прогрес,
помилка/повтор, готовність до перезапуску, ручне завантаження та відкладення
необов'язкового оновлення. Українська копія й англійський fallback відповідають
обмеженому підходу нативного picker; повної локалізації всіх мов тут немає.
Нові методи мосту optional, тому старі desktop-оболонки сумісні з новим web.

## Мінімальна версія

`apps/web/public/desktop/version.json` починається з `{"minVersion":"0.0.0"}`.
Політика однакова для stable/beta й усіх форматів. Оболонка читає її через
мережу з `no-store`, без cookies, з timeout і Zod-перевіркою. Порівняння — SemVer,
включно з prerelease; build metadata не впливає на порядок.

Перевірка відбувається до відкриття renderer. Нижча версія блокує показ вікна
та пропонує завантажити інсталятор, перевірити знову або вийти. Gate також
працює при Dock activation, ready-to-show, повторному запуску та періодичній
перевірці. Це не залежить від наявності нового веббанера у hosted renderer.

Остання валідна мінімальна версія зберігається атомарно в userData. Збій мережі,
HTTP/JSON помилка чи SPA fallback не знімають відомої вимоги. Якщо валідної
політики ще ніколи не було, мережева помилка не блокує застосунок; її видно
в стані оновлень. Для зміни мінімальної версії потрібне окреме розгортання web.

Fallback B збережено: production desktop завантажує hosted web. Новий банер
потрапить до встановлених клієнтів лише після web deployment. Тут нічого не
публікувалося. Також потрібні опубліковані інсталятори, blockmaps та метадані
Release; їхня CI-поставка реалізується у фазі 8.

## Перевірено на Windows x64

- Desktop TypeScript, ESLint, build; 146 тестів у 17 файлах.
- Web TypeScript та ESLint змінених файлів; 11 integration/component тестів.
- Повна `pnpm build:desktop`: web TypeScript/Vite та main/preload build.
  Наявні попередження lottie eval і Zod PURE annotations не блокують збірку.
- Chromium e2e банера: pending download → progress → ready, keyboard focus,
  recoverable installation error, narrow layout, light theme, reduced motion,
  українська мова й недоступність відкладення required-оновлення.
- Electron smoke/native UX: реальний sandboxed preload, нові update capabilities,
  відхилення невалідного каналу, заборонених операцій і всіх update IPC після
  переходу на недовірену сторінку; збереження tray/deep links/window state.
- Knip для desktop/web; scoped static UI audit без findings та 21st review
  банера без findings. Вони не замінюють наведені runtime-перевірки.
- NSIS x64 `1.0.0` із blockmap/latest.yml; MSIX x64 через локальну SDK.
  ASAR містить updater, його залежності та native uiohook prebuilds.
- Тиха інсталяція NSIS в окремий тестовий каталог: exit 0, executable і
  деінсталятор на місці. Пакований клієнт з окремим профілем показує справжню
  hosted login-сторінку; повторний запуск фокусує його вікно. Через Help
  перевірено runtime-шлях update check і коректне повідомлення про недоступні
  release metadata/version policy. Вхід в обліковий запис не виконувався.
  Тестову інсталяцію видалено штатним silent uninstaller (exit 0).
- Один незалежний focused review; виправлено eligibility/staged rollout,
  channel concurrency, прихований progress і повторне відкриття version gate.

NSIS customUnInstall прибирає `eternal://` лише коли command точно відповідає
executable цієї інсталяції. Обробник іншого шляху не видаляється. Цей hook
додано після виявлення залишкового протоколу в реальній перевірці видалення.
Повторне встановлення/видалення виправленого інсталятора завершилося з exit 0;
перевірено відсутність executable і тестової реєстрації протоколу.

Решта форматів і архітектур мають конфігурацію/команди, але на цьому хості не
збиралися. Підпис, live GitHub feed, диференціальне оновлення NSIS/AppImage та
повне кросплатформне приймання ще не підтверджені. Не піднімати minVersion до
доступності відповідних інсталяторів для всіх підтримуваних платформ.

Автоматична перевірка дозволів заблокувала рекурсивне видалення окремого
тестового профілю `scratch/phase6-installed-profile`; він залишився в
git-ігнорованому каталозі. Додаткової причини блокування інструмент не надав.
