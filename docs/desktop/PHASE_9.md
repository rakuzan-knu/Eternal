# Фаза 9 — Microsoft Store, Flathub і Snap Store

Підготовлено пакування та процедуру подання. **Фаза не прийнята: застосунок
не опубліковано в магазинах.** 7 листопада перевірено стабільний desktop-реліз
`v1.13.0` з assets, підписом і attestations. Зареєстровані ідентифікатори
застосунку отримано 5 листопада; актуальний стан пакетів і кабінетів — у
датованому розділі наприкінці документа. Саме store-пакування не змінює backend;
окремі зміни інтеграцій і приватності описані у відповідній документації.

**Актуальний стан 8 листопада:** GitHub desktop-релізи v1.13.0, v1.13.1 і
v1.13.2 переведені в draft зі збереженням assets і тегів через виявлені
неповні LGPL-матеріали нативної бібліотеки. Поточний release run v1.13.2
скасовано. Історичні успішні перевірки нижче не означають поточної публічної
доступності або завершення ліцензійного приймання.

## Що реалізовано

- `.github/workflows/desktop-stores.yml`: лише ручний запуск із `main`, за
  наявним стабільним тегом. Перевіряє GitHub Release, контрольні суми, GitHub
  attestations для SHA256SUMS і desktop-release.json, відповідність tagged commit.
  Пакує MSIX x64/arm64 та Snap на native Linux x64/arm64.
  Результат — workflow artifacts на 7 днів; завантаження в магазини відсутнє.
- MSIX вимагає три справжні Partner Center поля, stable-версію від 1.0.0 з
  компонентами до 65535. Четвертий Windows-компонент залишається 0 незалежно
  від номера CI build. Capabilities: runFullTrust, internetClient, webcam, microphone.
- Snap використовує підтримуваний встановленим electron-builder 26.18 шлях
  `snapcraft.base: core24`, GNOME extension, strict confinement та LXD.
  `browser-support.allow-sandbox: true` зберігає Chromium sandbox: стандартний
  launcher builder додавав би `--no-sandbox`. Цей дозвіл потребує окремого
  погодження Snap Store; без погодження подання заблоковане.
- У Snap/Flatpak автозапуск не записує неефективний файл усередині sandbox,
  а глобальний native input hook не запускається. Клавіші в активному вікні
  залишаються на наявному web-шляху. MSIX автозапуск також не заявляється без
  перевіреної StartupTask інтеграції. Адміністративне вимкнення автозапуску
  не спричиняє збою запуску store-клієнта.
- Наявний updater зберігає `managed` для магазинів; electron-updater не
  встановлює сторонні пакети поверх store-installation.

## Налаштування й запуск

Персоналізовані реквізити Microsoft не зберігаються в коді. Три змінні
ідентифікації Microsoft є обов’язковими для MSIX; порожні або відсутні значення
зупиняють пакування. Значення беруться з Partner Center. У готовому MSIX ці
реквізити обов’язково залишаються видимими; змінні не анонімізують пакет.

| Variable | Значення |
| --- | --- |
| `ETERNAL_DESKTOP_STORE_IDENTITY` | Обов’язково: точна Package Identity з Partner Center |
| `ETERNAL_DESKTOP_STORE_PUBLISHER` | Обов’язково: точний Publisher з Partner Center |
| `ETERNAL_DESKTOP_STORE_PUBLISHER_DISPLAY_NAME` | Обов’язково: точний PublisherDisplayName з Partner Center |
| `ETERNAL_DESKTOP_SNAP_NAME` | Default: зареєстроване `eternal-desktop` |

## Обмеження Flathub, перевірені 7 листопада 2026

Чинна [Generative AI policy](https://docs.flathub.org/docs/for-app-authors/requirements#generative-ai-policy)
вимагає, щоб маніфест був написаний людиною. Вона забороняє AI-generated та
AI-assisted вміст маніфестів, а також відкриття й автоматизацію submission PR
агентами, написання ними commit messages, описів і відповідей у review.
Попередній AI-assisted генератор вилучено разом із CI job формування подання.

Для продовження автор має самостійно підготувати маніфест і submission.
Інші AI-generated матеріали застосунку потребують правдивого розкриття відповідно
до правил Flathub. Також потрібні належні права на metadata/artwork, реальний
реліз і перевірений app ID. Домен `eternal.com` у власності проєкту не підтверджено.
GitHub-based ID має відповідати справжньому контрольованому репозиторію.

Після успішної фази 8 запустити **Desktop store packages** з потрібним тегом.
Store accounts, tokens, резервування назв і підтвердження угод workflow не створює.
Для локальних операцій GitHub потрібна автентифікація з належними правами;
читання публічного GitHub API саме по собі не підтверджує право на публікацію
релізів або доступ до магазинів.

Локальний MSIX після `pnpm build:desktop`:

```powershell
pnpm --filter @eternal/desktop package:msix --x64 --version 1.13.0
pnpm --filter @eternal/desktop package:msix --arm64 --version 1.13.0
```

Версія має відповідати справжньому desktop-релізу. У builder 26.18 `msix` усе
ще реалізовано через AppX target з `.msix` шляхом MakeAppx; конфігурація v27
з окремим `msix` target сюди не переноситься. Якщо кешований SDK не запускається,
використати встановлений SDK через `ELECTRON_BUILDER_WINDOWS_KITS_PATH`, як
описано у [фазі 6](PHASE_6.md).

На Linux із Snapcraft і LXD, від користувача з доступом до LXD:

```sh
pnpm build:desktop
pnpm --filter @eternal/desktop package:snap --x64 --version 1.13.0
```

Окремий запуск на arm64 дає arm64 Snap. Назва зарезервованого Snap використовується
також як executable name всередині цього пакета. Перевірити фактичну назву
згенерованого `.desktop` та protocol handler після встановлення.

## Публікація та приймання

1. **Microsoft Store:** зареєструвати застосунок у Partner Center, звірити
   AppxManifest.xml, Windows version/architecture/capabilities/protocol і
   встановити підписаний тестовий пакет на чистій системі. Виконати Windows App
   Certification Kit; заповнити screenshots, privacy, age rating і пояснення
   runFullTrust. Store може прийняти непідписаний MSIX і підписує його після
   сертифікації; для sideload потрібен власний довірений підпис.
2. **Flathub:** автор самостійно готує й подає маніфест згідно з чинною
   Generative AI policy та перевіряє права, app ID і встановлення.
3. **Snap Store:** зарезервувати назву, погодити `allow-sandbox`, протестувати
   strict-пакет на Linux x64/arm64. Лише після цього `snapcraft upload <file.snap>
   --release=candidate`, перевірка встановлення з candidate і promotion у stable.
   camera/audio-record та browser-support можуть потребувати ручного підключення
   або погодження auto-connect. Credentials вводити через Snapcraft login або
   захищене сховище, не в repository/chat.

Спільне ручне приймання встановлених пакетів: login/Turnstile; 4 OAuth інтеграції
та YouTube handoff; чат/upload/socket; voice/video; screen/window share на X11 і
Wayland; notification click і tray; `eternal://`; файлові портали; store update
зі збереженням даних. Flatpak camera/desktop capture/idle/global mute, Snap
AppArmor/Chromium sandbox і MSIX startup не підтверджені конфігурацією чи unit
тестами. Не розширювати дозволи до host/home/device=all для обходу проблем.

У managed updater посилання завантаження поки веде до GitHub Releases; потрібні
справжні Store URLs перед адаптацією цього переходу. Не піднімати спільний
minVersion раніше, ніж версія доступна у всіх магазинах: review затримки можуть
заблокувати вже встановлених користувачів.

Офіційні джерела: [MSIX requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements),
[Flathub requirements](https://docs.flathub.org/docs/for-app-authors/requirements),
[Flathub submission](https://docs.flathub.org/docs/for-app-authors/submission),
[Flatpak extra-data](https://docs.flatpak.org/en/latest/module-sources.html),
[Electron/Flatpak](https://docs.flatpak.org/en/latest/electron.html),
[Snapcraft setup](https://documentation.ubuntu.com/snapcraft/8.9.2/howto/set-up-snapcraft/).
API builder звірено з установленим 26.18: поточна вебдокументація містить також
непридатний для цього проєкту v27 MSIX API.

## Первинні локальні перевірки

Це історичні результати до злиття PR145, а не поточний перелік CI-тестів.
Згаданий нижче генератор Flathub і його тести згодом вилучені відповідно до
політики Flathub; вони не є частиною чинного workflow.

Перевірено локально на Windows x64:

- `pnpm build:desktop` — web renderer, strict TypeScript, main/preload build
  успішні. Зберігаються наявні попередження lottie eval і Zod PURE annotations.
- Desktop ESLint, strict TypeScript і Prettier змінених TS/JSON — успішні.
- 212 тестів у 24 файлах: зокрема нові перевірки store identity/version,
  Flathub SHA256/version/architecture/XML та відмови від sandbox autostart/PTT.
- `validate:actions`, actionlint 1.7.12 для desktop-stores.yml і desktop.yml,
  `git diff --check` — успішні. Shellcheck/pyflakes не встановлені й вимкнені
  в цьому локальному actionlint запуску.
- Реальне пакування MSIX x64 з **тестовими**, не зареєстрованими реквізитами
  `Phase9.Test`: 181 523 131 bytes. ZIP/AppxManifest.xml підтверджує точні
  Identity/Publisher/PublisherDisplayName, version `1.12.0.0`, x64, minVersion
  `10.0.17763.0`, чотири capabilities та протокол `eternal`. Пакет не підписано,
  не встановлено й не подано в Store; `1.12.0` тут лише тестова packaging version.
- Реальний Playwright Electron smoke з hosted renderer — 1 passed. Це запуск
  неупакованого клієнта; він не перевіряє MSIX installation або store runtime.
- Один незалежний focused review. Додано `bsdtar --no-same-owner` для
  apply_extra: system Flatpak install запускає extraction без можливості
  відновлювати довільні UID/GID. Окремо підтверджено обмеження Snap Store
  щодо `allow-sandbox`, воно залишається явною умовою публікації.

Flathub tests використовують текстові package fixtures для hashes/manifest,
а не справжній Linux deb: extraction, Zypak і встановлення вони не перевіряють.
Flatpak/Snap tooling відсутнє в цьому Windows-середовищі. Не виконувалися
Linux packaging/runtime, MSIX arm64/WACK, новий GitHub workflow або реальні
store submissions. Перші десять публічних stable GitHub Releases на момент
перевірки, включно з v1.12.0, не містили assets. Для остаточного приймання
потрібні release фази 8, реквізити/доступи магазинів, погодження прав і Snap
sandbox-дозволу, встановлення пакетів та підтверджені публічні listings.

## Налаштування кабінетів через браузер — 1 листопада 2026

- **Flathub:** за явною згодою користувача авторизовано Flathub через GitHub
  `subvincdebian` з читанням профілю, email, організацій і команд. Окремий
  Grant для `rakuzan-knu` не надано. Видимо підтверджено вхід до developer portal;
  список застосунків порожній. Submission PR і публікація не виконувалися.
- **Microsoft:** за вибором користувача розпочато безкоштовний Individual
  onboarding. Account type завершено; поточний крок — Identity verification.
  Сайт вимагає live фото оригіналу чинного документа й selfie. Цю особисту
  перевірку залишено користувачу. Профіль видавця, developer account setup,
  резервування Eternal і Partner Center package identity ще не завершено.
  Company-видавця поки не обрано: немає домену та пошти організації.
- **Snapcraft / Ubuntu One:** користувач самостійно створив Ubuntu One account.
  Сторінка підтверджує успішне створення, але email має статус UNVERIFIED;
  лист підтвердження вже надіслано сервісом. Snap Store вимагає його
  верифікації перед продовженням. Snap-назву ще не зарезервовано.

Паролі, документи, selfie, email verification tokens та OAuth-коди у файли
репозиторію не зберігалися. Жодного застосунку в магазинах ще не опубліковано.

## Зареєстровані продукти — 5 листопада 2026

Користувач завершив реєстрацію Microsoft Individual та Ubuntu One/Snapcraft.
Браузером підтверджено доступ до обох кабінетів і зареєстровано продукти:

- **Microsoft Store:** `Eternal` недоступна; зарезервовано **Eternal Desktop**
  як MSIX/PWA app. Store ID: `9N2XFD2B14JG`; стан — draft.
  Персоналізовані Package Identity, PublisherDisplayName та PFN прибрано з документації; точні значення доступні в кабінеті власника.
  [Product identity](https://partner.microsoft.com/en-US/dashboard/products/9N2XFD2B14JG/identity).
  Зарезервована назва не є публікацією; форма Microsoft вказує строк подання
  протягом трьох місяців, інакше резервування буде втрачено.
- **Snap Store:** за акаунтом `subvincdebian` зареєстровано **eternal-desktop**.
  Новий Snapcraft UI показує Registered Snap Names (1), а dashboard — No revisions yet.
  [Snap dashboard](https://dashboard.snapcraft.io/snaps/eternal-desktop/).
  Бінарні revisions ще не завантажувалися.

Snap executable/name має зареєстрований default. MSIX вимагає всі три
ідентифікаційні змінні Microsoft із кабінету власника. Stable desktop-release
фази 8 та погодження Snap sandbox залишаються необхідними.

Перевірка цього оновлення: 13 релевантних тестів (store-config/prepare-flathub),
desktop TypeScript/ESLint, actionlint, validate:actions та git diff --check —
успішні. Реально зібрано MSIX x64 `1.12.0` з відсутніми/порожніми identity
variables: 181 523 164 bytes. Усередині AppxManifest.xml звірено всі три
Partner Center identity поля, display name `Eternal Desktop`, x64 та Windows
version `1.12.0.0`. Це контрольне непідписане пакування наявного локального
build; встановлення, WACK і завантаження на сертифікацію не виконувалися.

## Підготовка публікації — 5 листопада 2026

Публікацію явно дозволено користувачем. Для release source створено ізольовану
гілку `feat/desktop-store-release` від актуальної `origin/main`; сторонні
design-зміни залишено в початковому робочому дереві. Дві сумісні правки тестів
createElement/canvas включено після підтвердженого TypeScript failure з Electron
DOM typings. У цій ізольованій копії пройшли build:desktop, 213 desktop-тестів,
10 backend-тестів OAuth/шифрування, desktop ESLint та hosted Electron smoke.
Scoped web ESLint не має errors; залишилися 11 наявних warnings у call hooks.

Незалежний огляд OAuth знайшов успадкований передбачуваний cookie-key fallback.
Збережено пріоритет чинних COOKIE_ENCRYPTION_KEY/SESSION_SECRET/JWT_SECRET,
додано JWT_ACCESS_SECRET, production без ключа відмовляє у видачі cookie.
Development використовує випадковий ключ процесу. Pending OAuth, виданий із
попередньою константою, потрібно почати заново; чинний TTL — 10 хвилин.
Зміна не потребує міграції даних, контролери залишаються у music service.

За окремою згодою користувача в repository Actions додано
`DESKTOP_GPG_PRIVATE_KEY`, `DESKTOP_GPG_PASSPHRASE` і variable
`DESKTOP_GPG_FINGERPRINT`. Fingerprint production signing key:
`CACBA63FD0E64C10DB18F44F285F8FC2D8D07CFC`.
Публічний ключ — `apps/desktop/build/desktop-release-key.asc`; приватний ключ
захищений ACL і зберігається поза репозиторієм. Тестовий phase8 key не використано.
Наявність secrets підтверджена UI; фактичний підпис у CI ще потребує release run.

Microsoft Submission 1 створено; Properties має статус Complete: Social,
privacy URL `https://eternalnet.vercel.app/privacy` (HTTP 200), сайт і GitHub
issues як support. Заявлено наявність опційних generative AI summaries;
недоведені accessibility claims не позначено. Інші секції ще заповнюються.

## Перевірений стабільний реліз — 7 листопада 2026

PR145 злитий після 49 успішних CI-перевірок. Реліз
[v1.13.0](https://github.com/rakuzan-knu/Eternal/releases/tag/v1.13.0) відповідає
коміту `1690edf6ed6502fb55164e28d9fa91b6371ccbf8` і містить 30 файлів.
Фактичний release run
[42408792565](https://github.com/rakuzan-knu/Eternal/actions/runs/42408792565)
успішно зібрав Windows x64/arm64, macOS universal та Linux x64/arm64.
Перевірено 27 рядків SHA256SUMS проти digest опублікованих assets, завантажені
release metadata, GPG-підпис із fingerprint
`CACBA63FD0E64C10DB18F44F285F8FC2D8D07CFC` і GitHub attestations для
SHA256SUMS та desktop-release.json. Це не повна перевірка встановлення кожного
інсталятора й не доказ відтворюваності збірки.

Перший macOS release run відхилив порожній `CSC_LINK` як шлях до каталогу.
Workflow тепер прибирає лише порожнє/пробільне значення на macOS перед пакуванням;
непорожній сертифікат зберігається. Повторний run використовував виправлений
workflow з protected main і незмінний source tag v1.13.0. Збірка macOS має ad-hoc
підпис; Apple Developer ID і нотаризація не підтверджені.

Microsoft: Age ratings збережено після явного дозволу користувача на IARC Terms;
статус Complete, Microsoft 12+, ESRB Teen. Це класифікація вмісту, а не заміна
правил допуску 13+ та регіональних вимог. Pricing and availability, Properties
і Submission Options мають статус Complete. Увімкнено ручну публікацію після
сертифікації: `Don't publish this submission until I select Publish now`.
MSIX x64 v1.13.0.0 завантажено й збережено: Partner Center показав `Validated`
і Packages `Complete`. Пояснення `runFullTrust` збережено; воно ще потребує
схвалення Microsoft під час сертифікації. Підтримку обмежено Windows Desktop;
автоматичне додавання майбутніх device families вимкнено. Англійську та
українську картки збережено із правдивим повідомленням про закриті реєстрації;
через відсутність справжніх скриншотів Store listings має статус `Incomplete`.
Заявку на сертифікацію не подано.

Перший store workflow
[42416010241](https://github.com/rakuzan-knu/Eternal/actions/runs/42416010241)
зібрав MSIX x64. Виправлення вибору host SDK усунуло запуск arm64 MakeAppx на
x64 runner; [42416724158](https://github.com/rakuzan-knu/Eternal/actions/runs/42416724158)
успішно зібрав обидва MSIX. ZIP digests завантажених artifacts перевірено;
manifest і PE headers підтвердили версію, реальну Store identity, capabilities,
протокол і відповідну архітектуру. Пакети непідписані для подання в Store.

WACK 10.0.26100.7705 перевірив MSIX x64 v1.13.0.0: загальний результат `PASS`,
23 з 24 тестів успішні; необов'язковий `Blocked executables` має `FAIL`.
Тест працював без application deployment, тому встановлення й runtime не
підтверджені. Повний звіт містить локальні системні відомості й зберігається
поза репозиторієм. Microsoft називає цей тест інформаційним, але рекомендує
[перевірити зовнішні виклики](https://learn.microsoft.com/en-us/windows/uwp/debug-test-perf/windows-desktop-bridge-app-tests#42-blocked-executables).
Окрім рядків Electron/dependencies, знайдено реальний виклик системного
PowerShell для registry policy. Для MSIX додано окреме machine-level JSON
джерело без external process; NSIS/MSI зберігають registry policy. Процедура
переходу — в [ADMIN_GUIDE.md](ADMIN_GUIDE.md). Виправлення включено у
[v1.13.1](https://github.com/rakuzan-knu/Eternal/releases/tag/v1.13.1), коміт
`e72467a5e84c138ad90bec1ec63d99e11d517955`: усі п'ять конфігурацій збірки
успішні, 30 release assets, 27 контрольних сум, GPG-підпис і дві attestations
перевірені. Встановлення MSIX та S mode перевірка ще потрібні; у v1.13.0
цього виправлення немає.

Обидва початкові Snap build зупинились на `apt-get update` усередині LXD.
Діагностика підтвердила Docker `FORWARD DROP`; додано рекомендовані Canonical
[дозволи вихідного трафіку LXD](https://canonical.com/lxd/docs/latest/howto/network_bridge_firewalld/#prevent-connectivity-issues-with-lxd-and-docker)
та лише відповідей `RELATED,ESTABLISHED` у Docker user chain, без зміни глобальної
політики. Новий run
[42417570760](https://github.com/rakuzan-knu/Eternal/actions/runs/42417570760)
підтвердив доступ мережі: збірка пройшла `apt-get update` і дійшла до формування
desktop integration. Далі виявлено помилку electron-builder 26.18: descriptor
посилався на майбутній `meta/gui/*.desktop` до копіювання `snap/gui/`.
Точковий `patches/app-builder-lib@26.18.0.patch` прибирає лише цей зайвий override,
щоб Snapcraft використав звичайний `snap/gui/` шлях. Версії залежностей не
оновлено. 8 листопада локальна перевірка фактичного stager підтвердила desktop entry,
`eternal://`, launcher без `--no-sandbox` та збережений sandbox helper.
Це не перевірка завершеного `.snap` або його встановлення; повторний Linux build
нового стабільного релізу ще потрібен.

Перевірки обох нових виправлень: 262 desktop-тести у 29 файлах, desktop
TypeScript, scoped ESLint, main/preload build і Prettier — успішні.
Frozen offline перевірка lockfile пройшла. Ці результати не замінюють
реальне пакування, встановлення й перевірку нового release source.

### Ліцензійні матеріали пакетів — 8 листопада

У фактичному MSIX v1.13.0 знайдено Electron/Chromium notices, 47 license entries
в ASAR-індексі та окремий native uiohook notice. Це не повна перевірка всіх умов.
У npm-копіях `@sentry/server-runtime-injection@11.8.0`,
`@sentry/server-utils@11.8.0` і `lazy-val@1.0.5` не знайдено окремих LICENSE.
Додано `build/THIRD_PARTY_NOTICES.txt` як extra resource для наступних пакетів:
для Sentry — незмінний upstream LICENSE тега 11.8.0, Git blob
`32c62f9869e33a014141c75312f966791a0ff105`; для lazy-val — справжні metadata
про MIT та автора й текст MIT permission/warranty terms без вигаданого
copyright holder або року, яких npm-пакет не надає. Інші notices збережені.
Локальний Windows packager включив файл у `resources/THIRD_PARTY_NOTICES.txt`;
SHA256 збігається з джерелом. Це ще не підтвердження його наявності у
наступному опублікованому інсталяторі або вже виданому релізі.

### Доступ до форуму Snap — 8 листопада

Користувач дозволив опублікувати підготовлений технічний запит щодо
`allow-sandbox` у store-requests на forum.snapcraft.io. Користувач завершив
окрему реєстрацію форумного акаунта; UI показав, що вхід потребує ручного
схвалення модератором, про яке повідомлять поштою. Запит ще не опубліковано,
дозвіл `allow-sandbox` не отримано. Обхід модерації не виконувався.

### Нативна бібліотека та LGPL — 8 листопада

Заголовок `uiohook-napi@1.5.5/libuiohook/include/uiohook.h` містить
LGPL-3.0-or-later, а `binding.gyp` статично компонуватиме libuiohook з N-API
обгорткою. MIT у metadata обгортки не описує весь native binary. Upstream
[issue №61](https://github.com/SnosMe/uiohook-napi/issues/61) також описує цю
прогалину; автор підтримав виправлення notices. У перевіреному MSIX немає
повних GPL/LGPL copies і binding.gyp для перебудови, хоча частина C-джерел
залишається в ASAR. Це конкретна незакрита межа ліцензійного приймання.

Для наступного кандидата додано GNU GPL/LGPL texts із зафіксованими upstream
blobs, архів опублікованих npm-джерел без prebuilt binaries, інструкції та
SHA256 manifest. Набір npm має той самий SHA512 integrity, що й lockfile.
Локальний validator порівнює archive/license hashes і build inputs зі
встановленою залежністю та блокує непогоджене оновлення джерел/версії.
Окремий patch виправляє SPDX metadata пакета на `MIT AND LGPL-3.0-or-later`,
не змінюючи його виконуваний код. Оригінальні npm metadata збережені в архіві.

LICENSE.md прямо зберігає потрібні права модифікації, заміни, relinking і
reverse engineering для налагодження змін бібліотеки в установлених межах LGPL.
У native Help додано відкриття папки ліцензій і джерел; About вказує libuiohook
та її copyright. Це не загальне відкриття пропрієтарного коду Eternal.

Release workflow тепер вимагає перебудови та завантаження addon з цих джерел
на CI hosts перед Semantic Release. Перевірка не викликає start input hook
і не збирає клавіатурні події. Результат CI, реальна заміна у встановлених
пакетах, Windows S mode, macOS signing та managed-store умови ще потребують
підтвердження; наявність source archive сама по собі їх не доводить.
`allow-sandbox` потребує погодження магазину; AI-assisted подання Flathub
заборонене чинною політикою Flathub, тому маніфест і submission має самостійно
підготувати людина.

Жоден регіон нового допуску поки не відкритий. Публікацію в магазинах не слід
позначати завершеною до перевірки пакетів, операційних процедур і застосовних
умов із [реєстру відповідності](../legal/COMPLIANCE_REGISTER.md).

### Перевірка матеріалів і пакетів — 8 листопада

Локально пройшли 270 desktop-тестів у 31 файлі, ESLint, TypeScript,
main/preload build, перевірка workflow YAML і pinned actions. Звірено 32
published source inputs усередині архіву та GNU license copies й інструкцію.
Windows NSIS-кандидат 1.13.3 зібрано локально; у його staging resources усі
сім файлів `licenses/` побайтово збігаються з джерелами та LICENSE.md.
Ці самі сім файлів також витягнуто із самого NSIS exe без його запуску
й побайтово звірено; це перевірка payload, а не лише staging directory.
Першу спробу перервав HTTP 504 завантаження Electron; успішна повторна
використала вже встановлений Electron 45.1.0 через `electronDist`.
Кандидат не опубліковано й не підписано Authenticode; це не перевірка встановлення.

CI run `42471705739` перебудував і завантажив addon на Windows та macOS.
Linux x64/arm64 успішно скомпілювали його, але load-перевірка потребує
X-дисплея; для headless CI додано `xvfb-run`. Після цього всі чотири native
jobs [run 42472224710](https://github.com/rakuzan-knu/Eternal/actions/runs/42472224710)
успішні: Windows x64, macOS ARM64, Linux x64/ARM64. Це перевірка на вказаних
hosts, не перевірка кожної архітектури кожного дистрибутива або реальної
заміни у встановленому застосунку. Коміт матеріалів має тип `chore`, тому
новий публічний реліз цими змінами не запитується.

Store run `42420791453` для v1.13.1 завершив усі чотири jobs пакування:
MSIX x64/arm64 і Snap x64/arm64. Вони ще не містять нових LGPL-матеріалів;
це діагностичні кандидати, а не готові до публікації пакети.
Усі чотири artifacts збережено локально поза Git до завершення строку
зберігання Actions; SHA256 ZIP звірено з GitHub artifact digest.

Перед поданням Microsoft потрібно також узгодити опубліковані license terms
з винятком для LGPL і перевірити права використання кінцевого користувача.
[App Developer Agreement 8.10](https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/store/documents/legal/ada/fy26/MS.Store.ADAv8.10.EN.US.pdf),
§4(c), покладає FOSS/source obligations на видавця; §4(i) вимагає надати
власні умови або посилання через product materials і зберегти мінімальні
права Microsoft Usage Rules. Саме завантаження MSIX не підтверджує виконання
цих умов. На момент цієї перевірки Additional license terms ще не заповнено;
подальше збереження погоджених текстів описано нижче.

### Кандидат для перевірки до публікації

Ручні workflows Desktop і Desktop store packages приймають `candidate_version`
із захищеної гілки `main`. Вони збирають commit самого workflow, зберігають
артефакти в Actions та позначають їх як кандидат. Для цього режиму не потрібен
публічний тег. Підписування і публікація GitHub Release виконуються лише для
перевіреного релізного тега.

[Run 42476326275](https://github.com/rakuzan-knu/Eternal/actions/runs/42476326275)
зібрав MSIX і Snap для x64 та ARM64 з `1cc90bbc`, версія кандидата `1.13.3`.
CI витягнув ліцензійні матеріали з усіх чотирьох готових пакетів і звірив їх
із джерелами. Store runtime, Windows S mode і сертифікація залишаються відкритими.

Локальний NSIS-кандидат встановився для поточного користувача в окрему папку.
Перевірено запуск з чистим профілем, екран входу та відкриття папки з ліцензіями
через Help. В ізольованій інсталяції замінено Windows x64 addon на бібліотеку,
перебудовану в [run 42475298405](https://github.com/rakuzan-knu/Eternal/actions/runs/42475298405).
Electron 45.1.0 x64 завантажив її через штатну обгортку з `app.asar` у тестовому
процесі. Оригінал відновлено. Тест не запускав input hook або дзвінок.

Англійський та український тексти для погодження зібрано в
[проєкті додаткових умов Microsoft Store](MICROSOFT_LICENSE_SUPPLEMENT_DRAFT.md).

8 листопада Partner Center зберіг по одному знімку в англійській та українській
чернетках. Для обох використано справжній англомовний екран входу з чистого
профілю встановленого NSIS-кандидата. PNG має 1523 × 810 пікселів. Статус обох
мовних сторінок — Complete. Загальна заявка залишається In draft.

[Desktop run 42477071267](https://github.com/rakuzan-knu/Eternal/actions/runs/42477071267)
підтвердив ручний вибір джерела. Два smoke jobs зупинилися на HTTP 504 під час
завантаження Electron для Windows x64 та Linux ARM64. Окремий крок підготовки
завантажує Electron штатним installer із перевіркою контрольних сум і має до
трьох спроб. Тест запуску залишається обов’язковим.

### Приймання кандидата 1.13.3 — 8 листопада

[Desktop run 42477984618](https://github.com/rakuzan-knu/Eternal/actions/runs/42477984618)
завершив усі п'ять build jobs з `c5804bb0`: Windows x64/ARM64, macOS universal,
Linux x64/ARM64. Publish job пропущено штатно для кандидата.
[Store run 42477988351](https://github.com/rakuzan-knu/Eternal/actions/runs/42477988351)
зібрав чотири store-пакети з того самого commit. Їх завантажено поза Git і
перевірено SHA256 artifact ZIP за GitHub digest.

| Пакет | SHA256 файла |
| --- | --- |
| MSIX x64 | `2dcf066050ad1b7edf66f50e428439d96154b593ec443097ab32346a9997e4a3` |
| MSIX ARM64 | `326184458776850f644f7b1f4b2da4b248f8c218c28aa264c11094a12a2587eb` |
| Snap x64 | `74f1b6163f039a15793b6a792ed49a12013ff6ba7590da9329186c53a986eb26` |
| Snap ARM64 | `c67157692619918d556fa2490a4c5c8778e6a073b5ffd41503b3a6f2e08dbcc9` |

Workflow `Desktop store candidate checks` перевіряє успішний ручний source run
із `main`, точний workflow ID, репозиторій і не прострочені candidate artifacts.
Download action завершується помилкою при невідповідності digest.
На тимчасовому Windows runner створюється локальний тестовий сертифікат,
підписується копія MSIX, встановлюється й запускається через package identity.
Перевіряються версія, шлях процесу всередині WindowsApps і наявність вікна.
Після перевірки застосунок видаляється. Сертифікат не додається на комп'ютер
операторів, оригінальний store-пакет не змінюється.

У [run 42488160943](https://github.com/rakuzan-knu/Eternal/actions/runs/42488160943)
MSIX x64 відкрив вікно `Log in · Eternal` на Windows Server 2025 runner.
WACK для оригіналу повернув загальний
`PASS`. Два тести з `OPTIONAL=TRUE` мають `FAIL`: Archive files usage вказав
`uiohook-napi-1.5.5-source.tar.gz`; Blocked executables знайшов посилання в Electron,
його ресурсах і app.asar. Архів окремо перевірено: 36 entries, жоден звичайний
файл не починається з PE-сигнатури `MZ`. Це спостереження не підтверджує Windows
S mode або майбутнє рішення сертифікації. XML і факт запуску збережені в artifact
`msix-x64-certification-report`.

Перший Snap runtime в тому самому run зупинився через cgroup hosted service.
Після запуску в реальному systemd user scope обидва jobs у
[run 42488633811](https://github.com/rakuzan-knu/Eternal/actions/runs/42488633811)
успішні. Для кожного перевірено `snap debug confinement = strict`, локальне
встановлення, ручне підключення browser-support, видиме вікно під Xvfb та
AppArmor label процесу `snap.eternal-desktop.* (enforce)`.
У команді запуску немає `--no-sandbox`. Ця перевірка не замінює погодження
Store auto-connect, встановлення з candidate channel, Wayland, дзвінки або OAuth.

8 листопада Partner Center прийняв у чернетку обидва MSIX 1.13.3.0; після Save
стара версія 1.13.0 вилучена автоматично, Packages має статус Complete.
Оператори погодили обидва тексти додаткових умов. Англійський та український
варіанти збережено в Additional license terms і побайтово звірено як текст
через повторне відкриття відповідних сторінок. Загальна заявка — In draft.

У [run 42489605876](https://github.com/rakuzan-knu/Eternal/actions/runs/42489605876)
ARM64 MSIX також успішно встановився й відкрив вікно на native Windows 11 ARM.
Цей job завершився failure на наступному кроці через відсутність WACK.
Офіційний Windows SDK setup у наступній спробі також не встановив toolkit на
цьому runner. Workflow зберігає native runtime перевірку окремо від статичної
сертифікаційної перевірки обох архітектур на Windows x64; пропущеної перевірки
не прирівнює до PASS. Запуск Windows S mode і ручні інтерактивні сценарії
залишаються за межами цих автоматичних перевірок.

### Підсумковий кандидат 1.13.4 — 8 листопада

Для включення виправлених SEO-описів кандидат перебудовано з `11166618`.
[Desktop run 42491682868](https://github.com/rakuzan-knu/Eternal/actions/runs/42491682868)
успішно зібрав п'ять desktop targets і assemble; publish штатно пропущено.
[Store run 42491677725](https://github.com/rakuzan-knu/Eternal/actions/runs/42491677725)
успішно зібрав усі чотири MSIX/Snap із перевіркою ліцензій у готових пакетах.
Усі чотири файли збережено поза Git зі звіренням GitHub artifact digest.

| Пакет 1.13.4 | SHA256 файла |
| --- | --- |
| MSIX x64 | `d5c9d372aaabcc982423c7fb512cff55cb131c53f270ff57c042184e03fa7759` |
| MSIX ARM64 | `818d1c918ba8f90506b356843e3b04a3bacac2a5df4fb83f5b2ca6934576dbe1` |
| Snap x64 | `e16dedd9fc049cbc614602b2ced64492119b99646f1816e134b71db641dfdf90` |
| Snap ARM64 | `e2c29fca3350bd6c4a4098ca1c661fd1745c2b499ff61c9079bd79af0de0da7d` |

Усі сім jobs [run 42492395938](https://github.com/rakuzan-knu/Eternal/actions/runs/42492395938)
успішні: source, два native MSIX runtime jobs, два WACK jobs на x64 та два strict
Snap runtime jobs. Обидва XML WACK мають загальний PASS, 22 PASS і два optional
FAIL, описані вище. Snap logs містять відмови D-Bus/AppArmor для discovery й
sleep inhibition на headless hosts; ці результати засвідчують запуск вікна та
ізоляцію, але не повне інтерактивне приймання. Wayland, дзвінки, OAuth і Windows
S mode потребують окремих перевірок.

Partner Center зберіг MSIX 1.13.4.0 x64/ARM64 зі статусом Packages Complete;
попередні 1.13.3 прибрано автоматично. За окремим дорученням користувача
створено приватний синтетичний акаунт із нульовими адміністративними flags для
Microsoft certification. Дату народження й персональні дані людини для нього
не вигадували. Реквізити збережено в захищеному локальному сховищі та в закритих
Credentials Partner Center. На production через звичайні API перевірено вхід,
відхилення неправильного пароля експорту, Core account export, порожній Messenger
export, no-store і завершення тестової сесії. Публічна реєстрація лишилася закритою.
