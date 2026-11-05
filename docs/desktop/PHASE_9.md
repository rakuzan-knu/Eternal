# Фаза 9 — Microsoft Store, Flathub і Snap Store

Підготовлено пакування та процедуру подання. **Фаза не прийнята: застосунок
не опубліковано в магазинах.** Публічний GitHub API 1 листопада 2026 повернув
стабільний `v1.12.0` без assets. Спочатку потрібен успішний desktop-реліз фази 8,
який містить також код цієї фази. Стан доступу до кабінетів наведено нижче;
зареєстровані ідентифікатори застосунку отримано 5 листопада 2026. Backend не змінювався.

## Що реалізовано

- `.github/workflows/desktop-stores.yml`: лише ручний запуск із `main`, за
  наявним стабільним тегом. Перевіряє GitHub Release, контрольні суми, GitHub
  attestations для SHA256SUMS і desktop-release.json, відповідність tagged commit.
  Пакує MSIX x64/arm64 та Snap на native Linux x64/arm64, формує Flathub-подання.
  Результат — workflow artifacts на 7 днів; завантаження в магазини відсутнє.
- MSIX вимагає три справжні Partner Center поля, stable-версію від 1.0.0 з
  компонентами до 65535. Четвертий Windows-компонент залишається 0 незалежно
  від номера CI build. Capabilities: runFullTrust, internetClient, webcam, microphone.
- Snap використовує підтримуваний встановленим electron-builder 26.18 шлях
  `snapcraft.base: core24`, GNOME extension, strict confinement та LXD.
  `browser-support.allow-sandbox: true` зберігає Chromium sandbox: стандартний
  launcher builder додавав би `--no-sandbox`. Цей дозвіл потребує окремого
  погодження Snap Store; без погодження подання заблоковане.
- Flathub-генератор використовує вже зібрані deb x64/arm64 з перевіреного
  desktop-релізу, фіксує SHA256/size та URLs. `extra-data` завантажує застосунок
  під час встановлення, а Flathub зберігає обгортку й метадані. Немає нового
  неперевіреного rebuild або дозволу Flathub поширювати proprietary binary.
  Обгортка використовує Electron BaseApp 25.08 і Zypak без `--no-sandbox`.
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
| `DESKTOP_FLATHUB_LISTING` | JSON нижче з фактичними даними |

```json
{
  "developerName": "Actual rights holder",
  "metadataLicense": "CC0-1.0",
  "screenshotUrl": "https://your-domain.example/actual-desktop-screenshot.png",
  "releaseDate": "2026-11-01"
}
```

Приклад — лише структура, його не слід публікувати. Вказати реального
правовласника, доступний screenshot без приватних даних і дату обраного релізу.
`metadataLicense` означає окремий дозвіл CC0 для **створених MetaInfo-метаданих**;
перед його налаштуванням потрібне рішення правовласника. Це не змінює ліцензію
застосунку. Обгортка/іконка також потребують дозволу на публічне розповсюдження.
Перевірити OARS-рейтинг, опис, privacy/support URLs і право на app ID
`com.eternal.desktop`. Генератор не доводить володіння доменом або відповідність
усім вимогам магазину. Чинний LICENSE.md не змінено.

Після успішної фази 8 запустити **Desktop store packages** з потрібним тегом.
Store accounts, tokens, резервування назв і підтвердження угод workflow не створює.
GitHub CLI у цьому локальному середовищі не автентифікований; читання публічного
GitHub API не є доказом доступу до release publishing або магазинів.

Локальний MSIX після `pnpm build:desktop`:

```powershell
pnpm --filter @eternal/desktop package:msix --x64 --version 1.12.0
pnpm --filter @eternal/desktop package:msix --arm64 --version 1.12.0
```

Версія має відповідати справжньому desktop-релізу. У builder 26.18 `msix` усе
ще реалізовано через AppX target з `.msix` шляхом MakeAppx; конфігурація v27
з окремим `msix` target сюди не переноситься. Якщо кешований SDK не запускається,
використати встановлений SDK через `ELECTRON_BUILDER_WINDOWS_KITS_PATH`, як
описано у [фазі 6](PHASE_6.md).

На Linux із Snapcraft і LXD, від користувача з доступом до LXD:

```sh
pnpm build:desktop
pnpm --filter @eternal/desktop package:snap --x64 --version 1.12.0
```

Окремий запуск на arm64 дає arm64 Snap. Назва зарезервованого Snap використовується
також як executable name всередині цього пакета. Перевірити фактичну назву
згенерованого `.desktop` та protocol handler після встановлення.

Для Flathub з кореня репозиторію, після незалежної перевірки release fingerprint,
GPG-підпису SHA256SUMS та GitHub attestations за [фазою 8](PHASE_8.md):

```sh
pnpm --filter @eternal/desktop prepare:flathub 1.12.0 /absolute/verified-release-assets /absolute/new-flathub-submission /absolute/listing.json
```

У release-assets потрібні SHA256SUMS, desktop-release.json та обидва deb. Генератор
перевіряє вміст за контрольними сумами, але локально не встановлює довіру до самого
SHA256SUMS. Вихідний каталог має бути новим: наявне подання не перезаписується.
У ньому немає deb: тільки manifest, apply_extra, Zypak launcher, desktop entry,
MetaInfo та іконка. Не комітити фіктивні hashes/URLs або version placeholders.

На Linux у каталозі подання:

```sh
flatpak-builder --user --install --install-deps-from=flathub build-dir com.eternal.desktop.json
flatpak run com.eternal.desktop
flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest com.eternal.desktop.json
```

Потрібні актуальні Flatpak/flatpak-builder, runtime/BaseApp і appstream validation.
Окремий `package:flatpak` збирає standalone bundle; він не замінює Flathub submission.

## Публікація та приймання

1. **Microsoft Store:** зареєструвати застосунок у Partner Center, звірити
   AppxManifest.xml, Windows version/architecture/capabilities/protocol і
   встановити підписаний тестовий пакет на чистій системі. Виконати Windows App
   Certification Kit; заповнити screenshots, privacy, age rating і пояснення
   runFullTrust. Store може прийняти непідписаний MSIX і підписує його після
   сертифікації; для sideload потрібен власний довірений підпис.
2. **Flathub:** погодити права на packaging/artwork/metadata, перевірити app ID,
   appstream/Flathub lint і встановлення на x86_64/aarch64. Надіслати manifest та
   допоміжні файли в submission PR до `flathub/flathub`; не включати build-dir,
   deb, локальні caches або встановлений runtime. Повідомити про AI-assisted
   packaging відповідно до актуальної submission policy. Публічний PR у цьому
   чаті не створюється без окремої просьби згідно з DESKTOP_PLAN.md.
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

## Фактичні перевірки

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
ідентифікаційні змінні Microsoft із кабінету власника. `DESKTOP_FLATHUB_LISTING`, stable
desktop-release фази 8 та погодження Snap sandbox залишаються необхідними.

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
