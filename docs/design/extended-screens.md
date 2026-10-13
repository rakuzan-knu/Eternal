# Розширені сценарії реальних екранів

`apps/web/e2e/design/extended-screens.spec.ts` відкриває застосунок Vite на порту 6007. Це справжні маршрути й компоненти, а не макети Storybook. Дані визначені
в `extended-fixtures.ts` відповідно до API shapes: notification `items`, story
groups, reels `data/meta`, comments і sessions як масиви.

| Поверхня                                | Loading                             | Empty                     | Error + retry                       | Довгий контент                             |
| --------------------------------------- | ----------------------------------- | ------------------------- | ----------------------------------- | ------------------------------------------ |
| Search `/search?q=alexandra&tab=People` | Pending people request              | Немає людей               | HTTP 503 із retry                   | Ім’я й biography, desktop/390 px           |
| Notifications `/notifications`          | Pending list request                | Порожній `items`          | HTTP 503, відновлення списку        | Ім’я, post/comment preview, desktop/390 px |
| Stories на `/`, viewer                  | Pending feed request                | Доступна дія Add story    | HTTP 503 із retry                   | Автор і caption у viewer, desktop/390 px   |
| Reels `/reels`, comments drawer         | Pending comments request            | Немає comments            | HTTP 503, retry збереженої чернетки | Автор і comment, desktop/390 px            |
| Settings → Security → Active sessions   | Pending sessions request            | Порожній список           | HTTP 503 із retry                   | Довга назва device, desktop/390 px         |
| Login `/login`                          | Pending submit: disabled, aria-busy | Валідація порожньої форми | HTTP 503, значення полів збережено  | Довга identity, 390 px                     |

Loading не моделюється затримкою в мілісекундах: запит утримується до завершення
assertions/screenshot. Час фіксований, stories viewer поставлений на паузу.
Для content screenshot Stories декоративне заповнення progress track нормалізоване до 50% test-only CSS: кілька RAF мілісекунд до натискання Pause не є стабільною частиною pixel baseline. Track, controls, caption і media залишаються видимими; натискання Pause перевіряється реальним control.
Зовнішні HTTP-запити й WebSockets заблоковані; локальний SVG poster — fixture,
відео не відтворюється. Сервісів, production accounts і зовнішніх mutations немає.

Перевірки знайшли й виправили mobile action rail Reels, перекритий playback error overlay, та sidebar Settings, який залишав правій панелі нульову висоту. Sidebar тепер обмежений до 45% висоти на mobile і має власний scroll; desktop зберігає попередню структуру. Помилка наступної сторінки Notifications зберігає завантажені записи й повторює потрібний cursor. Загальна помилка Login тепер повідомляє про невдалий вхід із повторною спробою, а не стверджує, що network/HTTP 503 означає неправильні credentials; поля мають доступні назви, а banner — role alert. Auth flow і server error mapping не змінено.

Нові snapshot names починаються з `extended-`. Windows Chromium — canonical
середовище порівняння.

Набір містить 30 сценаріїв і 27 screenshot baselines. Вузький Reels сценарій
чекає справжню помилку локального video fixture й відкриває comments звичайним
click: mobile action rail залишається доступним над playback error overlay.
Вузький Settings сценарій переходить через прокручуваний список категорій;
sidebar обмежено 45% висоти модалки, щоб sessions panel мав доступну площу.

Для нового набору baseline:

```sh
pnpm --filter frontend exec playwright test --config playwright.design.config.ts extended-screens.spec.ts --update-snapshots --workers=1
```

Звичайний запуск використовує ту саму команду без `--update-snapshots`.

Межі: People tab не доводить коректність інших search tabs. Reels feed має
існуючий seed fallback для порожньої/error відповіді; цей набір перевіряє реальні
стани comments drawer і не називає seed fallback error screen. Settings coverage
стосується перегляду sessions, а не revoke/auth authorization. Login success,
запис comment, завантаження медіа, screen reader і справжні телефони цим набором
не перевіряються. Browser viewport 390 px не є тестом фізичного iPhone.
