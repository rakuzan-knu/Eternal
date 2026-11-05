# Фаза 8 — CI та релізи

Реалізовано workflow й локальні перевірки релізних артефактів. Повне приймання
потребує запуску GitHub Actions: цей чат не створює тегів, не публікує релізів
і не змінює secrets. Backend не змінюється.

## Запуск

`.github/workflows/desktop.yml` працює у двох режимах:

- PR зі змінами desktop/web/shared/config: збірки з тестовою версією `0.0.0`,
  smoke, пакування, SBOM, перевірка повного набору та workflow artifacts.
  Сертифікати й GPG-ключ не передаються, публікації та attestations немає.
- Після успішного semantic-release: `release.yml` викликає reusable workflow
  з точним тегом `v<new-release-version>`. Для повтору є workflow_dispatch
  з наявним тегом, запущений із `main` або `develop`.

Окремий release-event не використовується: події, створені `GITHUB_TOKEN`,
зазвичай [не запускають наступні workflow](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow).
Тому прямий виклик працює також без PAT/GitHub App. Ручне створення самого
тегу не публікує desktop: потрібен наявний GitHub Release і workflow_dispatch.
Не запускати semantic-release повторно для відновлення desktop artifacts.

Версія береться з тегу, а checkout — із його commit SHA. Пакувальник передає
її через `extraMetadata.version`, зберігаючи workspace package.json без змін.
Підтримуються stable та `beta.N`, як у чинному `release.config.cjs`.
Конфігурація semantic-release лишається спільною для web і desktop;
артефакти додає наступний job, коли завершено всі платформні збірки.

## Матриця

| Runner           | Паковані архітектури | Формати            | Smoke                        |
| ---------------- | -------------------- | ------------------ | ---------------------------- |
| windows-latest   | x64                  | NSIS, MSI          | x64                          |
| windows-latest   | arm64, cross-build   | NSIS, MSI          | окремого arm64 runtime немає |
| macos-latest     | universal            | DMG, ZIP           | архітектура runner           |
| ubuntu-latest    | x64                  | AppImage, deb, rpm | x64, Xvfb                    |
| ubuntu-24.04-arm | arm64                | AppImage, deb, rpm | arm64, Xvfb                  |

MSIX, Flatpak, Snap та публікація в магазини належать фазі 9. Формати пакуються
окремими викликами чинного `scripts/package.ts`, завжди `--publish never`,
щоб зберегти правильне `eternalDistribution`. Fuses застосовує чинний afterPack.
Підпис/нотаризація використовують secrets за наявності, як у фазі 6;
без них Windows installer непідписаний, macOS має ad-hoc підпис.

Кожен runner виконує desktop ESLint, strict TypeScript (у build), Vitest,
`validate:actions`, повний `build:desktop` і наявний `e2e/smoke.spec.ts`.
На Linux встановлюються Playwright system dependencies, rpm, Xt/Xtst.
Це hosted-renderer smoke неупакованого Electron із sandboxed preload;
він залежить від доступності `https://eternalnet.vercel.app` і не доводить
інсталяцію, роботу fuses чи оновлення вже встановленого клієнта.

## Цілісність та оновлення

`release-artifacts.ts stage` збирає лише очікувані installer/blockmap/metadata.
Окремі каталоги й manifest.json зберігають походження кожного формату.
`assemble` вимагає всі 12 пар формат/архітектура та п'ять непорожніх CycloneDX
SBOM, перевіряє версії, filenames, SHA512 і size із updater metadata.
Поле `blockMapSize` зберігається для диференціальних оновлень AppImage.
Бюджет одного інсталятора — 250 MiB. Частковий набір не публікується.

Логічні архітектури матриці та manifest залишаються `x64` / `arm64`, але імена
файлів відповідають electron-builder: x64 AppImage/rpm — `x86_64`, x64 deb —
`amd64`, arm64 rpm — `aarch64`; arm64 AppImage/deb — `arm64`. Staging не
перейменовує інсталятори та не переписує updater metadata. Flathub використовує
той самий `targetFiles` для вибору deb. Регресія викликає встановлений
electron-builder для порівняння імен та перевірки Linux package metadata.

Для deb/rpm у metadata задано підтверджену сторінку проєкту
`https://eternalnet.vercel.app` і контакт супроводу
`Eternal contributors <eternalnet.support@proton.me>`. Це не свідчить про
реєстрацію юридичної особи та не замінює реквізити операторів у політиках.

Для Windows файли обох архітектур об'єднуються в один `latest.yml` / `beta.yml`.
На macOS об'єднуються DMG/ZIP; Linux зберігає окремі `*-linux.yml` та
`*-linux-arm64.yml`. Це відповідає названню metadata у встановленому
electron-builder 26.18 / electron-updater 6.8.12. Просте копіювання з
перезаписом `latest.yml` знищило б одну Windows-архітектуру.

SBOM створює зафіксований Syft з розпакованого справжнього `app.asar`, включно
з runtime dependencies, а не лише з workspace lockfile. Один SBOM відповідає
OS/архітектурі; формати цього рядка мають однакові залежності. ASAR читається
через вже встановлену залежність electron-builder, нових пакетів не додано.
Цей inventory не є повним аудитом Electron/Chromium або вкладених native binary.

Для розпакованих залежностей явно додається `javascript-package-cataloger`:
типовий directory scan Syft шукає lockfiles і пропускає встановлені npm-пакети.
У CI тимчасово додається `supportedArchitectures.cpu: [x64, arm64]` до робочої
копії pnpm-workspace.yaml, щоб cross/universal пакети містили optional native
bindings обох архітектур поточної ОС. Workspace-файл у Git не змінюється.
На macOS вузький `x64ArchFiles` дозволяє вже готові, однакові в обох збірках
prebuilds uiohook/oxc-parser; без цього universal merger відхиляє їх.

Після успішної матриці publish job:

1. Перевіряє `SHA256SUMS`, додає до нього експортований публічний ключ.
2. Створює й перевіряє detached GPG-підпис `SHA256SUMS.asc`.
3. Створює [GitHub build-provenance attestations](https://github.com/actions/attest-build-provenance/tree/977bb373ede98d70efdf65b84cb5f73e068dcc2a)
   для installers, blockmaps, metadata, SBOM, ключа й контрольних сум.
4. Додає offline bundle `desktop-provenance.json` і завантажує файли до
   вже наявного GitHub Release. `--clobber` дозволяє повторити той самий тег.

Підпис і provenance bundle не можуть містити власні хеші в `SHA256SUMS`.
Attestation окремо покриває SHA256SUMS і його GPG-підпис. GitHub завантажує
assets окремими запитами: це не атомарна публікація. Після збою повторити
desktop workflow та перевірити весь Release перед оголошенням користувачам.

`desktop-release.json` містить фактичні version/tag/commit збірки й входить
до підписаних SHA256SUMS та attestation. Кожен staging manifest також містить
commit: зведення відхиляє інший source SHA. Стандартний SLSA predicate GitHub
описує контекст запуску workflow, який після semantic-release або ручного
повтору може відрізнятися від tagged commit; джерело артефактів перевіряти
за `desktop-release.json`. Перед upload повторно перевіряється незмінність тегу.

## Налаштування репозиторію

Для публікації потрібні:

- Secret `DESKTOP_GPG_PRIVATE_KEY`: ASCII-armored приватний signing key.
- Secret `DESKTOP_GPG_PASSPHRASE`: passphrase, може бути порожнім для ключа без пароля.
- Repository variable `DESKTOP_GPG_FINGERPRINT`: повний fingerprint очікуваного
  ключа, 40 або 64 hex-символи. Публікувати його також через довірений канал.
- Права `contents: write`, `id-token: write`, `attestations: write` у publish job.
  Actions/attestations мають бути доступні в налаштуваннях репозиторію.

Без GPG-конфігурації release-preflight завершується помилкою до дорогих збірок.
Secrets не створюються автоматично. Наявний semantic-release може вже створити
web Release; після налаштування GPG відновити desktop через workflow_dispatch.

Опційний платформний підпис: `CSC_LINK`, `CSC_KEY_PASSWORD`, Windows overrides
`WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`; для нотаризації також `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Використовувати GitHub secrets,
а не файли ключів у Git. На PR ці значення примусово порожні.

Перевірка завантаженого релізу:

```sh
gpg --import desktop-release-key.asc
gpg --fingerprint
gpg --verify SHA256SUMS.asc SHA256SUMS
sha256sum --check SHA256SUMS
gh attestation verify Eternal-1.2.3-win-x64.exe --repo rakuzan-knu/Eternal
```

Fingerprint необхідно порівняти з довіреним значенням незалежно від
публічного ключа, завантаженого разом із релізом. Не піднімати minVersion
до доступності всіх необхідних інсталяторів і перевірки оновлень.

## Перевірка в цьому чаті

Перевірено на Windows x64:

- Повний `pnpm build:desktop`, desktop strict TypeScript, ESLint, Prettier.
  Залишилися наявні попередження lottie eval і Zod PURE annotations.
- 196 desktop-тестів у 22 файлах, включно з 16 новими release-regression cases:
  stable/beta, повна матриця, SHA256/SHA512, metadata merge, embedded blockmap
  metadata, невірна версія/commit, відсутні файли та небезпечні paths.
- Реальний Electron smoke з hosted renderer — 1 passed.
- actionlint 1.7.12 для обох workflow; `validate:actions` для всіх YAML/SHA.
  Shellcheck/pyflakes не встановлені й у цьому actionlint запуску вимкнені.
- Реальне пакування NSIS x64 `1.0.1-beta.1`: installer 132 713 595 bytes,
  `.exe.blockmap`, `beta.yml` з правильною версією. Staging реального результату
  успішний. Версія тестова; інсталятор не публікувався й не встановлювався.
- Реальне розпакування ASAR через `extract-sbom.ts` і Syft 1.42.3 scan:
  CycloneDX із 52 компонентами, серед них `@sentry/electron` 8.3.0,
  `electron-updater` 6.8.12, `electron-log` 5.4.4, `uiohook-napi` 1.5.5.
- Detached GPG signing/verification одноразовим тестовим Ed25519-ключем
  через Git for Windows; це не тест production-ключа чи Ubuntu publish job.
- Один незалежний focused review: виправлено beta metadata channel,
  втрату `blockMapSize` і відсутність фактичного source commit у manifest.
  Додатково перевірено, що macOS prebuild glob відповідає потрібним шляхам.

Реальні GitHub publish, OIDC attestation, production GPG-ключ, сертифікати,
чисте встановлення залежностей на runners, macOS/Linux packaging,
Windows arm64 runtime та інсталяційні оновлення тут не перевірялися.
Критерій «тег → всі assets у GitHub Release» залишається відкритим до першого
успішного CI release run; налаштувати secrets/variable й виконати його окремо.

Автоматична перевірка дозволів відхилила видалення тимчасового каталогу
`scratch/phase8-gpg` із причиною `blocked by policy`. Каталог з одноразовим
тестовим ключем залишено в git-ігнорованому scratch; це не release signing key.
