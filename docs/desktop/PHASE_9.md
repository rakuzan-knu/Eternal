# Фаза 9 — Microsoft Store, Flathub і Snap Store

Стан на 9 листопада 2026 року. Кандидат 1.13.4 пройшов автоматизовані перевірки
MSIX і Snap для x64 та ARM64. Microsoft Store розглядав заявку. Публікацію
у Microsoft Store, Snap Store і Flathub на цю дату не підтверджено.

Публічні desktop-збірки та матеріали для перевірки підпису доступні в
[GitHub Releases](https://github.com/rakuzan-knu/Eternal/releases).

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
