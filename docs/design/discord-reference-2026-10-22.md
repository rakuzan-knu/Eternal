# Eternal community UX — Discord reference and implementation

Date: 22 October 2026. Source: the user-opened Discord PTB desktop application, observed through its actual window. Server identity, member names and message contents are not copied into Eternal. No messages were sent, servers created, invitations generated or settings saved in Discord.

## What was actually observed

The server view retains a compact server rail, server-local channel navigation, a conversation and a secondary people/activity panel. Server navigation exposes events, channel browsing, members and boosts. Channels are grouped, with distinct text/voice symbols. The channel browser supplies search and a grouped list. The server menu separates invitation, settings, channel/category/event creation, notifications, profile and sensitive moderation actions. Server settings use a stable category navigation with a focused editor and an adjacent profile preview. The roles page has role search, a list, member counts and explicit editing actions. These observations describe the inspected desktop surfaces only; they do not prove every Discord feature, entitlement, mobile state or safety mechanism.

## Diagnosis of the previous Eternal implementation

The previous community screen mixed a public profile, channel directory and full moderation controls in one long page. Every channel link switched to the general Messages workspace, losing server orientation. Desktop space was spent on large bordered cards while frequent channel selection required navigating between pages. Small-screen members/about had no deliberate list/detail model. The first iteration improved correctness but did not establish a convincing daily communication environment.

The adopted structure is **product navigation → community → channel → conversation**, with **overview / members / about** as explicit server-local destinations. Discovery and daily participation have separate jobs. This is a navigation and task-continuity decision, not a request to reproduce Discord's artwork, paid features, typography or every control.

## Implemented in this revision

- Community workspace with a server switch rail, persistent desktop channel panel, overview, filterable channel list and a primary conversation surface.
- Channel deep links `/communities/:communityId/channels/:channelId`. Resolve the selected channel against the authenticated member-only channel response before requesting conversation details. Detail must also identify the matching community and GROUP type.
- Existing ChatThread is embedded, retaining its composer, attachments, reply/edit/forward/delete, pinned items, search/calendar, media, themes, voice and call controls. There is no duplicate message transport or replacement composer.
- Closing a channel returns to its community and restores the selected channel's focus. Search navigation resolves conversations belonging to the same community back into their channel URLs; unrelated conversations retain Messages navigation.
- Members/moderation and about use bookmarkable server-local views. All existing create, edit, invite, role, ban, ownership-transfer and leave operations remain available through their existing owners.
- Mobile uses a list/detail model with an explicit back action and the community name in the channel header. Channel history and long member/about surfaces own scrolling; desktop keeps local navigation visible.
- Discovery uses a compact product header, actual avatar or monogram, legible description/count and a clear opening action. Own communities retain independent cursor pagination. Search handles clear, IME composition, debounce, request cancellation and URL restoration.
- A Join with a link entry point opens an accessible dialog and previews the invitation internally. Pasting a foreign host never navigates to that host. Preview does not accept membership; the existing explicit accept action remains required.
- Theme values remain owned by runtime app CSS/theme adapters; the workspace uses their variables rather than a second palette. Existing effects, shop, music, feed, profile customization and destinations are retained.

## Capability inventory and gaps

This inventory distinguishes existing code from implemented UX and future product work. A visible control is not proof of live operational quality. P0 means access/data correctness, P1 means daily communication essentials, P2 means community depth, P3 means growth/monetization experiments.

| Capability | Eternal evidence / decision | Priority |
|---|---|---|
| Server discovery/search and invite-only membership | Existing API; redesigned discovery and workspace in this revision | P1 |
| My servers and quick switching | Existing paginated directory; workspace rail shows first page, full list remains accessible through discovery | P1 |
| Channel conversation deep links | Implemented in this revision; preserves server context | P1 |
| Members, admin/member roles, owner transfer | Existing API and controls; grouped into Members | P0 |
| Kick, persistent ban, unban and leave | Existing transaction/outbox boundaries; retain existing confirmation | P0 |
| Invite preview, expiry, max uses, revoke | Existing API and UI; link entry added | P0 |
| Share invite in DM and externally | Existing confirmed message sender and explicit external share actions | P1 |
| Text, attachments, voice messages, replies, edits and forwards | Existing ChatThread; reused rather than rebuilt | P1 |
| Pinned messages and search/calendar | Existing ChatThread; retained inside the channel | P1 |
| Chat drafts and scroll continuity | Existing conversation-scoped stores; channel switches keep the same conversation IDs | P1 |
| Read/unread and notifications | Existing realtime infrastructure; active channel now participates in global messenger events | P0 |
| Presence and personal activities | Existing product capabilities; no invented online count or fabricated activity in workspace | P1 |
| Audio/video calls, screen share and voice mesh | Existing chat/call capability; retained, not claimed as new persistent voice channels | P1 |
| Custom channel categories and ordering | Implemented locally in the continuation below: atomic versioned layout, all-member visibility, additive migration | P1 |
| Rename/archive/delete channel | Rename/description and reversible archive/restore implemented locally; permanent deletion remains undefined | P1 |
| Per-channel permissions/private channels | Server access checks, management UI and private attachment transport implemented locally in the continuations below; production rollout and native resolver remain pending | P0 |
| Custom roles and granular permissions | Current server API supports OWNER/ADMIN/MEMBER; custom role hierarchy is future domain work | P2 |
| Persistent voice channels / stage rooms | Existing call/mesh is not equivalent; requires lifecycle, capacity and reconnect semantics | P2 |
| Server onboarding / rules acceptance | Needs maintained rules and versioned acceptance contract | P2 |
| Announcements and moderated channel types | Future channel-type and publishing model | P2 |
| Threads / forum channels | Future content hierarchy, unread and search semantics | P2 |
| Server-wide mute / notification preferences | Existing conversation-level controls; server-level inheritance not implemented | P1 |
| Mentions, role mentions and notification routing | Audit existing message parser/authorization before adding mass-ping capabilities | P1 |
| Bookmarks / saved messages | Audit existing message actions; define server/private persistence separately | P2 |
| Audit log for moderation and permission changes | Transactional outbox is internal infrastructure, not a member-visible audit log | P0 for expanded moderation |
| Invite abuse/rate-limit controls | Existing API platform guards; needs isolated concurrent and abuse verification | P0 |
| Reports, appeals and moderation queues | Profile/chat reporting exists; community-specific workflow needs ownership and operator tools | P0 for public launch |
| Channel slow mode / automoderation | Future policies and enforcement, not a frontend-only switch | P2 |
| Server icon/banner editing | Summary supports avatar but current management has name/description only; upload ownership needed | P2 |
| Community events / RSVPs | Future scheduling, notifications and cancellation model | P2 |
| Emoji/stickers/soundboard | Existing chat media/soundboard surfaces; custom server asset ownership is separate work | P2 |
| Bots / webhooks / integrations | Not authorized by a UI-only shortcut; needs scoped credentials, revocation, abuse and privacy review | P2 |
| Music listening rooms | Existing Music/Jam differentiates Eternal; unify room membership before claiming a server music channel | P2 |
| Profile identity / decoration / store | Preserve Eternal's existing differentiators, separate optional commerce from communication | P1 |
| Accessibility and localization | Named controls, focus and theme ownership in changed surfaces; complete language/assistive-technology matrix still pending | P0 |
| Mobile touch/keyboard and native clients | Web responsive tests are separate from real iOS/Android/native validation | P1 |
| Status and operational trust | Do not invent uptime or delivery guarantees; connect actual service status before claiming reliability | P0 |
| Full production rollout | Backup, additive migration on core, compatible specialty releases and two-account validation remain required | P0 |

## Why not copy every visible Discord function

Eternal combines people, posts, communities and music. Server-local navigation and task continuity serve that product. Boosts, paid role perks and marketplace placements are not prerequisites for successful conversation. Adding all of them before channel permissions, notification clarity and recovery would increase the same complexity the redesign is meant to resolve. Future capabilities above are explicit implementation gaps, not silently completed recommendations.

## Product-wide UX priorities

The earlier audit and remediation record (kept outside this scoped release) remains the baseline for feed, profile, registration, Saved, Reels, settings, safety and store. This revision changes community navigation and its integration with chat; it does not establish that every other screen has been redesigned or every competitor capability has shipped.

| Product area | Required product decision / next validation |
|---|---|
| Global navigation | Keep social feed, direct messages, communities and music distinct; retain all current destinations and the user's pin/hover preference. Test long labels and keyboard access across the product. |
| Feed and Reels | Preserve author/content hierarchy, saved state, report/block and deliberate sharing; validate empty/error recovery and delivery with two real accounts. Do not invent content or successful actions. |
| Direct messages | Keep conversation tools and drafts shared with community channels. Validate receipt, reconnect, account changes and notifications against real services. |
| Search | Clearly communicate the current scope: people, content, community directory or channels. A unified results model and cross-server message search remain separate work. |
| Profile and identity | Retain decoration, music/activity, store and collections. Keep privacy and account safety understandable independently of personalization. |
| Notifications | Separate unread communication from social activity; define server/channel inheritance and mute semantics before adding another settings panel. |
| Onboarding | Registration already retains explicit field choices. Server rules, channel recommendations and versioned acceptance need a dedicated member onboarding flow. |
| Moderation and trust | Permission enforcement precedes new role controls. Public community launch needs community reports, operator queues, audit history and abuse verification. |
| Accessibility / localization | Changed surfaces have semantic names, focus handling and reduced motion. All themes, translation completeness, zoom, screen readers and real mobile keyboards still need a wider test matrix. |
| Performance and availability | Responsive fixture tests prove interaction/layout only. Measure cold startup, long histories, reconnect and production service health separately. |

## Verification record

See the final verification entry in `audit-remediation.md`. Browser fixtures demonstrate layout and interaction, not a live deployed community or multi-account reliability. No production migration or publication is included.

## Передача роботи в новий чат

Оновлено 22 жовтня 2026 року. Це точка продовження, а не твердження, що весь продукт уже завершено. Матриця вище містить реалізоване, наявне до цієї ітерації та відкриті прогалини; формулювання «existing» не означає перевірку в production.

### Мета та незмінні вимоги користувача

- Довести Eternal до якісного щоденного соціального продукту з власним UI/UX, орієнтуючись на сильні рішення Discord, Telegram і Facebook. Остання реалізація стосується насамперед спільнот і їх інтеграції з чатом; весь застосунок ще не перепроєктовано.
- Не видаляти наявні можливості, розділи інтерфейсу, ефекти, теми та персоналізацію без згоди користувача. Зберегти музику, магазин, стрічку, профіль, Reels і наявні інструменти чату.
- Погоджена модель спільнот: сервери з каналами, публічний пошук спільнот, вступ за запрошенням, посилання на інвайт, поширення в особистих повідомленнях та інших соцмережах.
- Користувач дозволив огляд свого відкритого Discord. Попередній агент лише переглядав інтерфейс: не надсилав повідомлень і не змінював сервери. Доступність вікна та інструментів у новому чаті потрібно визначити заново.
- Реалізація локальна. Ця передача не надає дозволу на production-публікацію, зовнішні повідомлення, застосування міграцій до робочої БД або деструктивні операції.

### З чого почати новому агенту

1. Відкрити репозиторій `C:\Users\unbeatable\Documents\Social Network (Antigravity)\social-network`. Прочитати актуальні AGENTS.md / GEMINI.md, перевірити `git status` і зберегти всі наявні зміни. У робочому дереві залишено значну незакомічену роботу попередніх ітерацій у frontend, backend, shared contracts і міграціях. Не виконувати reset/checkout/clean та не переписувати її як «сторонню».
2. Прочитати цей файл повністю, історію попередніх виправлень (поза цим scoped release), [DESIGN.md](../../DESIGN.md), [UX-CONTRACT.md](../../UX-CONTRACT.md) та застосовні матеріали [дизайн-документації](README.md). Перед backend/API/WebSocket/background змінами обов'язково прочитати [SERVICE_OWNERSHIP.md](../SERVICE_OWNERSHIP.md).
3. Зіставити записаний стан із фактичним кодом. Використовувати наявні скрипти та `pnpm-lock.yaml`, не встановлювати інший менеджер пакетів і не оновлювати залежності без потреби. Поточний packageManager — pnpm 10.5.2. Реальні Vitest-тести існують, попри застарілий рядок у GEMINI.md.
4. Продовжити незавершений пріоритетний етап нижче, завершуючи його наскрізно: контракт → авторизація/збереження → кеш/події → інтерфейс → потрібні перевірки. Не починати новий глобальний редизайн і не замінювати готові функції макетами.
5. Для суттєвих змін авторизації, міграцій та міжсервісних меж залучити одного незалежного вузького reviewer відповідно до AGENTS.md. Звичайні невеликі правки виконувати локально. Інструменти/активних агентів попереднього чату не вважати доступними за замовчуванням.

### Що вже реалізовано і має залишитися

- Серверний workspace: перемикач серверів, список і фільтр каналів, огляд, учасники, інформація про сервер; маршрути `/communities/:communityId/channels/:channelId` та query-подання `?view=members` / `?view=about`.
- Вбудований справжній ChatThread зі спільними draft/media/search/call/theme механізмами. Канал відкривається після перевірки member-only списку, а conversation має відповідати потрібній спільноті та типу GROUP. Помилка доступу не повинна залишати активний приватний чат або admin-діалог зі старого кешу.
- Мобільна модель список/деталі, повернення з відновленням фокуса, назва спільноти в шапці каналу, незалежне прокручування довгого списку учасників. Desktop зберігає локальний контекст каналу/сервера.
- Каталог, незалежна пагінація власних спільнот, пошук з URL/IME/debounce та приєднання через вставлене посилання. Воно відкриває внутрішній preview; вступ потребує окремої дії.
- Попередні backend-ітерації: OWNER/ADMIN/MEMBER, створення каналів, ролі/передача власності/вихід/kick/ban/unban, інвайти з expiry/maxUses/revoke/preview/accept, транзакції та outbox, захист обходу через legacy group endpoints. Це опис коду, а не підтвердження виконаної міграції.
- Попередні зміни всього продукту: auth/session isolation, registration, Saved Reels, безпечне поширення, профільні report/block, навігація, чесні стани Download та інші виправлення. Деталі й межі доказів — в audit-remediation.md; їх не потрібно реалізовувати повторно.

### Незавершені етапи та критерії готовності

| Черга | Що залишилося | Що має означати завершення |
|---|---|---|
| 1 — локально реалізовано | Категорії, порядок, назва/опис та архівування/відновлення каналів | Перевірки й межі archive lifecycle наведені в останньому продовженні. Остаточне видалення не реалізовано: потрібна політика даних. Перед публікацією залишаються rollout і live multi-account перевірки. |
| 2 — до приватних каналів | Видимість/доступ на рівні каналу, приватні канали | Єдина модель доступу для списків, detail, пошуку, history, attachments, mutations, socket rooms/fanout і відновлення після reconnect. Прихована кнопка не є авторизацією. Тести на витік між учасниками/ролями та скасування доступу. |
| 3 — повсякденне спілкування | Серверні налаштування сповіщень, mute/mentions, зрозумілі unread-стани | Визначене успадкування server → channel, збереження налаштувань, узгоджені клієнтські лічильники й реальні події. Не вигадувати online/unread значення. |
| 4 — довіра та модерація | Журнал дій, скарги на спільноту/канал, черги операторів, abuse-перевірки інвайтів | Реальні ролі оператора та API, збережені події/статуси, контроль доступу, retry/idempotency, прозорі підтвердження. Внутрішній outbox не видавати за користувацький audit log. |
| 5 — глибина спільнот | Довільні ролі, onboarding/правила, announcement/forum/thread канали | Погоджена семантика та серверне збереження, а не декоративні перемикачі. Кожен тип має читання/публікацію/пошук/unread/модерацію та стани помилок. |
| 6 — голос і музика | Постійні voice/stage rooms та інтеграція Music/Jam з членством спільноти | Визначені lifecycle, capacity, права, reconnect і cleanup; перевірка справжніми учасниками. Наявний дзвінок/mesh не називати завершеним Discord voice channel. |
| 7 — решта продукту | Наскрізний UX стрічки, Reels, профілю, пошуку, сповіщень, налаштувань і магазину | Продовжити попередній аудит, зберегти можливості; перевірити переходи, щільність, контентну ієрархію, loading/error/empty, клавіатуру, touch, теми та локалізацію. Також відкриті реальний Reels repost і unified/cross-server search; кнопки/поточні заглушки не доводять реалізацію. |
| 8 — додаткові можливості | Події/RSVP, серверні assets/emoji, bots/webhooks/integrations | Власники даних, права, uploads/credentials/revocation та abuse-модель перед повноцінним UI. Це наступні продуктові етапи, не завершена частина редизайну. |
| Окремий обов'язковий шлюз до релізу | Реальна БД, міграції/rollback, multi-account/WebSocket/calls, assistive tech, всі теми/мови та реальні телефони | Виконані перевірки у відповідному ізольованому середовищі, сумісний порядок core/specialty/frontend release за SERVICE_OWNERSHIP.md, backup і окремо авторизований production rollout. Поточні fixture-тести цього не доводять. |

Не потрібно повторно запитувати користувача, яку модель спільнот обрати: сервери, канали, публічний пошук і вступ за інвайтом уже погоджені. Уточнення потрібне лише там, де конкретне рішення впливає на коректність, політику даних або необхідний дозвіл і його не можна обґрунтовано визначити з коду та цієї передачі.

### Карта файлів для продовження

- `apps/web/src/pages/Communities/CommunityPage.tsx`, `community-workspace.css`, `CommunitiesPage.tsx`, `CommunityInvitePage.tsx` — сторінки та навігація.
- `apps/web/src/widgets/communities/CommunityManagement.tsx`, `CommunityJoinDialog.tsx`, `invitationLink.ts` — керування та діалоги.
- `apps/web/src/features/communities/api/communitiesApi.ts` — HTTP/contracts/query/mutations; використовувати public API slice.
- `apps/web/src/features/chat/ui/CommunityConversation.tsx`, `ChatThread.tsx`, `ChatThreadHeader.tsx` — повторне використання чату та шапка. `apps/web/src/app/App.tsx` / `GlobalMessengerEvents.tsx` — маршрути, layout, активний чат.
- `apps/backend/src/messenger/communities/` — controller/service/repository і тести; `packages/shared/contracts/src/communities.ts` / `apps/backend/src/common/contracts/communities.ts` — контрактні копії, які мають залишатися узгодженими.
- `apps/backend/prisma/schema.prisma`, `apps/backend/prisma/migrations/20261021180000_add_communities/` — наявна адитивна модель спільнот. Міграція Saved Reels теж залишена в робочому дереві; жодна з них у межах цієї роботи не застосовувалася до production.
- `apps/web/e2e/community-workspace.spec.ts`, `audit-remediation.spec.ts`, `playwright.audit.config.ts` — браузерні регресії з mocked API; unit-тести лежать поруч із відповідними сторінками/віджетами/features.

### Відомий стан перевірок на момент передачі

Це результати попередньої ітерації, а не автоматичний доказ для майбутніх змін. Повторювати релевантні перевірки після зміни відповідної поведінки.

- Фінальний `pnpm --filter frontend build` пройшов TypeScript/Vite і 32 SEO prerenders.
- `AUDIT_PREVIEW=1`, `VITE_API_URL=http://localhost:3000`, `pnpm --filter frontend exec playwright test --config playwright.audit.config.ts`: 24/24 сценарії в одному прогоні на production-preview, 1,9 хвилини; API mocked. Не запускати build або зміну runtime-джерел одночасно з цим прогоном. Порт 5183 виділено для preview.
- Після останнього уточнення шапки: 11/11 тестів CommunityConversation + ChatThread. Інші завершені вузькі запуски та backend-тести записані в audit-remediation.md; кількості перекриваються, їх не можна складати в число унікальних перевірок.
- ESLint змінених меж: 0 помилок, 2 наявні hook-dependency warnings у ChatThread. JSDOM chat-тести можуть логувати невдалі фонові XMLHttpRequests; позитивний suite не доводить мережеву доставку.
- `pnpm design:generate`, `pnpm design:check`, `git diff --check` пройшли. Після зміни design-джерел за потреби оновлювати inventory, а не вимикати перевірку.
- Вузький premium static audit: 0 violations та 1 unresolved — scanner сприймає JSX `Select` як native select; фактично це імпортований authored shared Select. Не підробляти ownership manifest заради зеленого звіту. Повного чистого repository-wide audit немає.
- Реальні migration/rollback/concurrency, два акаунти, WebSocket/calls, всі теми/мови, screen reader та iOS/Android не перевірені. Docker engine був недоступний у попередній ітерації; у новій сесії стан слід перевірити заново, не вважати вічним блокером.
- 21st catalog не відповів у попередній ітерації; використано наявні компоненти та theme variables. Генерацію/імпорт 21st-компонентів не виконували.

Стабільні скриншоти з вигаданими тестовими даними лежать у `C:\Users\unbeatable\.codex\visualizations\2026\10\21\01a15dda-4c8f-7312-bd97-55ab0f50e492\`: `eternal-community-overview.png`, `eternal-community-workspace-desktop.png`, `eternal-community-workspace-mobile.png`. Це артефакти локальної перевірки, не production-контент.

### Готовий текст для нового чату

```text
Продовжуй роботу над Eternal у C:\Users\unbeatable\Documents\Social Network (Antigravity)\social-network.
Спочатку прочитай AGENTS.md, docs/design/discord-reference-2026-10-22.md повністю, особливо розділ «Передача роботи в новий чат», та пов'язані документи. Збережи всі наявні незакомічені зміни й існуючі можливості інтерфейсу. Сервери, канали, публічний пошук та вступ за інвайтом уже погоджені.
Категорії, порядок, редагування назв/описів і архівування/відновлення вже реалізовані локально; прочитай останній розділ продовження з перевірками й migration caveat. Наступні функціональні етапи — приватні channel permissions або серверні notification inheritance/mute/mentions за матрицею. Hard delete потребує окремої політики даних. Реалізуй обраний етап наскрізно й перевір його; не замінюй backend декоративним UI. Перед backend/API/WebSocket змінами прочитай docs/SERVICE_OWNERSHIP.md. Не виконуй production deployment, зовнішні повідомлення чи застосування міграцій до робочої БД без окремого дозволу. Звітуй про фактично зроблене, перевірки та відкриті обмеження, оновлюй цей документ для наступного продовження.
```

## Продовження: організація каналів — 22 жовтня 2026

Реалізовано локальний наскрізний блок категорій, порядку та редагування каналів. Це не завершення всіх етапів продукту: архівування/відновлення, остаточне видалення, приватні права та інші рядки матриці залишаються відкритими.

### Поведінка й межі

- `CommunityCategory`, nullable `CommunityChannel.categoryId` та `Community.channelRevision`; нова адитивна міграція `20261022120000_community_channel_layout`. Старі канали залишаються без категорії. Складений FK не дозволяє прив'язати канал до категорії іншої спільноти.
- `PATCH /messenger/communities/:id/channel-layout` належить messenger. Повний snapshot перевіряє revision, повноту/унікальність каналів, належність категорій та активну OWNER/ADMIN-роль. Валідація DTO не замінює авторизацію в транзакції.
- Community lock серіалізує зміни. Категорії, порядок, назви/описи каналів і відповідних Conversation, revision та COMMUNITY_CHANGED outbox зберігаються однією транзакцією. Створення каналу також підвищує revision. GET бере shared lock, щоб повернути цілісний snapshot. Незмінені канали не переписуються.
- Видалення категорії переносить її канали в Uncategorized; історія й членство не змінюються. Категорії не створюють приватних каналів і не змінюють all-members модель доступу.
- Власник/адмін відкриває Manage channels. Категорії створюються, перейменовуються, впорядковуються та видаляються; канали редагуються, переміщуються між категоріями й впорядковуються кнопками без drag-only взаємодії. Усі зміни застосовуються після Save changes.
- HTTP/shape errors і 409 зберігають draft. Повторний stale save заблокований: користувач явно закриває/відкидає draft, оновлює дані спільноти й відкриває керування заново. Закриття dirty-діалогу через кнопку, Escape або backdrop показує підтвердження перед анімацією закриття. Для цього shared Modal має необов'язковий `onBeforeClose`; поведінка наявних споживачів без guard збережена.
- Старі клієнти зберігають плоский `data` масив. Новий клієнт читає стару відповідь без категорій/revision, але не дозволяє unsupported layout writes. ID каналів/розмов і deep links стабільні. Використано існуючі query invalidation та transactional outbox; новий транспорт не додавався.
- Незалежна вузька перевірка виявила проблему dirty-dismiss і неузгоджений ліміт 200 каналів; обидва виправлено, додано регресії. Повторна статична перевірка цих двох виправлень не знайшла залишкових проблем. Довільного ліміту 200 більше немає; великі snapshot-и все ще підпорядковані лімітам HTTP і часу транзакції, навантажувальних гарантій немає.

### База даних і порядок rollout

Docker у цій сесії доступний. Створено окремий тимчасовий PostgreSQL 17 контейнер `eternal-channel-layout-test`, БД `channel_layout_test` на loopback-порті 55433. Робочі БД не використовувалися.

Початковий `prisma migrate deploy` з оригінального дерева зупинився з P3015: локальний каталог `20261016000000_upload_budget` не містить `migration.sql`. Він не відстежується Git; його не видаляли й не підробляли SQL. Для ізольованої перевірки використано тимчасову копію schema та всіх 58 наявних міграцій із SQL, без цього порожнього каталогу. У цій копії всі міграції, включно з новою, успішно застосувалися. Це не є доказом, що прямий deploy з поточного локального дерева проходить без виправлення цього каталогу.

Перед production: перевірений backup, застосування сумісної адитивної міграції на core, потім messenger і frontend за SERVICE_OWNERSHIP.md. Для rollback застосунку зберігати нові таблиці/колонки; не видаляти категорії чи історію down-міграцією. Production deployment, production migration і реальні зовнішні повідомлення не виконувалися.

### Відтворювані перевірки цього блоку

- Backend unit: 96/96 у communities repository/service та conversations service; frontend unit: 30/30 у layout dialog, response contracts, CommunityPage та shared Modal. Запуски перекривають попередні результати; не складати їх як унікальні тести всього репозиторію.
- PostgreSQL integration: 4/4 у `apps/backend/test/community-channel-layout.e2e-spec.ts`. Перевірено двох конкурентних редакторів (один commit, один 409), узгоджені назви/описи й outbox, повний rollback при помилці outbox, cross-community FK, збереження повідомлень/учасників при видаленні категорії та відхилення draft після створення нового каналу.
- Інтеграційні тести запускаються тільки з явно заданим `COMMUNITY_TEST_DATABASE_URL` для localhost/127.0.0.1 та БД `channel_layout_test`: `pnpm --filter backend exec vitest run --config vitest.config.e2e.ts test/community-channel-layout.e2e-spec.ts`. Без opt-in цей набір пропускається. Це перевірка реального repository/Prisma/PostgreSQL, а не повний HTTP/JWT/WebSocket стенд.
- Prisma validate пройшов. Frontend production build пройшов TypeScript, Vite та 32 SEO prerenders; наявне попередження lottie-web про eval не усувалося в цьому блоці.
- Вузький premium static audit: 0 violations, 2 unresolved. Scanner знову помилково трактує імпортовані authored JSX `Select` у CommunityManagement і новому layout dialog як native select; обидва використовують shared/ui/Select. JSON-звіт збережено в поточній папці visualizations. Повний root-scan зупинено через обхід усього dependency tree; звіт охоплює communities features/widgets/pages, а не весь репозиторій.
- 21st catalog search повернув помилку; використано наявні Modal/Select, community control styles і runtime CSS/theme tokens. Компоненти чи assets з 21st не імпортовано.

### Точка наступного продовження

Почати з архівування/відновлення каналів: визначити контракт читання/публікації й історії, membership/reconnect/unread/search/attachments та узгоджений lifecycle перед UI. Не повторювати готовий редактор категорій/порядку. Повний multi-account WebSocket/calls, production rollout, screen readers, усі теми/мови й справжні мобільні клавіатури залишаються окремими неперевіреними межами.

### Додаткове виправлення під час браузерної перевірки

Негайний reload після успішного save міг відновити попередній свіжий IndexedDB snapshot без HTTP-запиту. `useCommunityChannels` тепер має `staleTime: 0` та `refetchOnMount: always`, тому відкриття спільноти узгоджує канали/revision/роль із сервером. Регресія з попередньо заповненим fresh cache пройшла; фінальний response/cache набір — 10/10. Це не гарантує доставки WebSocket у production.

Перший браузерний прогін: попередні 24 сценарії пройшли, два нові зупинилися через помилковий button-локатор для authored combobox. Після виправлення локатора вузький повтор знайшов описану справжню проблему persisted cache при reload; перевірку reload не видаляли й не замінювали штучною паузою.

Backend build/typecheck, змінені ESLint-межі, Prettier, design generation/check, тест документації та whitespace check пройшли. Початкові lint warnings у новому mock і Vitest describe виправлено типізацією/import; правила не вимикалися. Після оптимізації запису незмінених каналів повторний repository suite — 40/40, PostgreSQL suite — 4/4. Тимчасовий PostgreSQL контейнер зупинено та автоматично видалено після перевірок.

Фінальний frontend unit-прогін після cache-виправлення: 31/31 (layout dialog, response/cache API, CommunityPage, shared Modal). Збірка frontend після цього виправлення повторно пройшла TypeScript/Vite і всі 32 SEO prerenders.

### Виправлення гонки навігації чату

Фінальний браузерний прогін після cache-виправлення: обидва нові сценарії керування каналами пройшли, але desktop-сценарій переходу до учасників виявив окрему гонку. `ChatThread.handleCloseChat` залишав 240ms таймер після unmount: швидкий перехід до Members міг бути перезаписаний відкладеним поверненням на Overview. Таймер тепер зберігається в ref і скасовується при unmount. Додано unit-регресію скасованого close callback; наявний browser-сценарій із негайним переходом до Members збережено.

Окрема регресія таймера: фінальний ChatThread unit suite — 8/8; перед додаванням цієї регресії сумісний ChatThread + CommunityConversation — 11/11. ESLint ChatThread — 0 errors, 2 наявні hook-dependency warnings. Повторна design generation/check після тимчасової filesystem-помилки пройшла; inventory актуальний, 26 guides/links/assets перевірено.

### Підсумок фінальної перевірки продовження

- Після виправлення delayed-close таймера фінальна production-збірка пройшла TypeScript/Vite та 32 SEO prerenders.
- Фінальний `AUDIT_PREVIEW=1 VITE_API_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --config playwright.audit.config.ts e2e/community-workspace.spec.ts`: **8/8 passed (1.5m)** на 390px і 1440px. Перевірено original chat tools/drafts, швидкий перехід до Members, редактор категорій/порядку, dirty Escape, конфлікт, save/reload, forged channel та internal invite preview. API mocked. Build/runtime sources не змінювалися під час цього прогону.
- Попередній повний прогін після cache-виправлення: 25/26; єдиний збій відтворив delayed-close race, виправлену вище. Немає твердження про фінальний повтор усіх 26 після timer fix: повторено всі 8 affected workspace tests; 18 audit-remediation tests пройшли до timer fix, а shared chat має окремі unit checks.
- Стабільні скриншоти з fictional fixtures: `C:/Users/unbeatable/.codex/visualizations/2026/10/22/01a162e4-57c4-7fc2-b46b-d1f456fce4dc/eternal-channel-layout-mobile.png` та `eternal-channel-layout-desktop.png`. Мобільну й desktop композиції візуально оглянуто; це не production-контент.
- Усі зміни залишені локально, попередню незакомічену роботу збережено. Новий архівний lifecycle ще не реалізовано. Реальні two-account WebSocket/calls, всі теми/мови, screen reader і native телефони залишаються відкритими.

## Продовження: архівування та відновлення каналів — 22 жовтня 2026

Реалізовано окремий глобальний `CommunityChannel.archivedAt` з адитивною міграцією `20261022140000_community_channel_archive`. Це не особиста папка архіву ConversationParticipant. Зберігаються ID, історія, вкладення, доступ активних учасників, пошук/календар і наявні unread; читання може очистити unread звичайним способом. Зворотне відновлення повертає публікацію в ту саму розмову. Hard delete не реалізовано.

### Сервер і конкурентність

- `PATCH /messenger/communities/:id/channels/:channelId/archive`: boolean archived + layout revision, ParseUUID/Zod, auth guard, активний OWNER/ADMIN у транзакції, scoped community/channel lookup. Revision відхиляє застарілі archive/restore/layout запити; зміна + revision + COMMUNITY_CHANGED outbox атомарні.
- `withUnreadWriteLock` має явний `requireWritableChannel`: після блокування participant rows перевіряє актуальний archivedAt перед durable mutation. Цей варіант використано в основному MessagesService.sendMessage (включно з HTTP/WS/story-reference), repository create для forward, edit, addReaction, pin і Call create. Community archive блокує ті самі rows у тому самому порядку; повідомлення не може записатися після commit архіву на stale preflight.
- Заборонені нові повідомлення/forward-in, редагування, нові реакції/закріплення та нові DB calls. Читання/пошук/markRead/forward-out, існуючі авторизовані delete-for-me/delete-for-all, removeReaction та unpin залишаються доступними для cleanup/moderation. Архів не скасовує авторизацію цих дій.
- Наявний активний persisted Call повинен завершитися до archive; інакше 409 без зміни каналу. Call creation серіалізовано з archive тим самим participant lock.
- Typing start, mesh join/signal, soundboard та watch-together перевіряють writable archive state. Typing stop зберігає membership check. Нові room joins мають повторну перевірку після join і явну негативну acknowledgement для forbidden-стану.
- Наявна voice mesh кімната не має DB Call. Поточний web-клієнт при отриманні archived Conversation через існуючий outbox/invalidation/refetch викликає leaveRoom, що зупиняє треки та peer connections. Manager відкидає пізній microphone stream після leave, використовує generation для повторного join тієї самої кімнати й повідомляє hook про async denied acknowledgement. Це не доказ припинення audio capture старим, offline або модифікованим P2P-клієнтом; справжній двоакаунтний voice тест ще потрібен.

### Інтерфейс

Manage channels використовує наявні Modal/Select/community controls. Після збереження draft доступні Archive/Restore; явний вкладений діалог фокусує Cancel, пояснює історію/unread/публікацію й зберігає помилку до retry. Непідтверджена або невалідна HTTP-відповідь не закриває керування як успіх.

Archived channels залишаються в окремій навігаційній групі. ChatThread має окремий global-archive статус замість composer, вимкнені call/mesh-start та publication actions, але збережені історія, пошук, media, forward-out, report і дозволений cleanup. Draft store не очищується при архівації.

### Перевірки й rollout

Нова міграція застосована лише до окремого PostgreSQL 17 контейнера `eternal-channel-archive-test`, localhost:55433, `channel_layout_test`. Як і в попередньому етапі, використано тимчасову копію valid SQL migrations без старого порожнього каталогу `20261016000000_upload_budget`; 59 valid migrations пройшли. Оригінальне локальне дерево міграцій цим не сертифіковане для прямого deploy. Production БД не використовувалися.

Перед rollout: backup, адитивна міграція на core, оновлений messenger із drain усіх старих instances, і лише потім frontend із archive controls. Старий messenger-код не знає archive guard: mixed-version publication не можна вважати захищеною. Application rollback зберігає колонку/історію; для повернення на старий messenger треба заздалегідь узгодити відновлення архівних каналів або призупинення запису. Деструктивної down-міграції немає.

- Backend focused run: 181/181 у communities, messages service/repository, gateway, conversations service, search та unread regressions.
- Frontend focused run: 34/34 у mesh manager, ChatThread/CommunityConversation, archive/layout dialogs і CommunityPage; response/cache compatibility окремо входив у попередній 30-test run. Ці кількості перекриваються.
- Реальний PostgreSQL integration: 6/6, включно з archive↔publication concurrency, блокуванням create/edit/react/pin/call, доступною історією/search/mark-read, відновленням, active-call conflict, stale revision і rollback archive при outbox failure. Тест вмикається лише через явний COMMUNITY_TEST_DATABASE_URL для ізольованої локальної БД. pg виводить deprecation про паралельні запити одного transaction client; успіх не означає майбутню сумісність із pg9.
- Prisma validate, backend typecheck/build пройшли. Частина JSDOM chat-тестів виводить фонові невдалі XHR, як і до цього етапу; це не перевірка реальної доставки.

### Наступна точка продовження

Не повторювати categories/layout/archive implementation. Пріоритети матриці: єдина модель приватних channel permissions, серверні notification inheritance/mute/mentions, community audit/report workflow. Остаточне видалення потребує окремої політики retention. До production залишаються реальні два акаунти/WebSocket/voice/calls/reconnect, всі теми/мови, screen reader та телефони.

### Додаткові результати archive етапу

Змінені ESLint-межі backend/frontend мають 0 errors. Власні нові warning-и виправлено; залишилися наявні gateway/message-test any warnings, два ChatThread hook-dependency warnings та наявні unused imports у message menu/test. Правила не вимикалися. Незалежний reviewer знайшов mesh cleanup gap, а після першого виправлення — delayed-ack hook state та повторний join тієї самої кімнати; ці випадки виправлені callback/generation cleanup і покриті manager regression tests. Реальний двоакаунтний media transport не перевірено.

Додаткові compatibility checks: mapper/interface suites пройшли; repository pin mock потребував підтримки interactive transaction після нового lock guard, його виправлено без зміни продуктового контракту. Conversations repository + calls reconnect: 14/14. Суми цих запусків не означають повний repository test run.

Вузький premium audit: 0 violations, 2 unresolved через той самий scanner false positive для authored JSX Select у CommunityManagement/layout dialog. JSON: поточна папка visualizations, `premium-channel-archive-audit.json`. Не заявляється чистий repository-wide audit.

### Фінальні результати archive продовження

- Фінальна frontend production-збірка: TypeScript/Vite та 32 SEO prerenders пройшли; backend build і наступний typecheck також пройшли.
- `AUDIT_PREVIEW=1 VITE_API_URL=http://localhost:3000 pnpm --filter frontend exec playwright test --config playwright.audit.config.ts e2e/community-workspace.spec.ts`: **10/10 passed (1.3m)** на 390px і 1440px з mocked API. Перевірено попередню навігацію/chat drafts, layout editor, archive/restore confirmation, безпечний Cancel focus, archived navigation, stable links/reload, forged channel і invite preview. Composer/call disabled state перевірений окремим unit-тестом, реальна історія/search/read — PostgreSQL інтеграцією; browser fixture цього сам не доводить.
- Design generation/check, Prettier і whitespace пройшли. Тимчасовий `eternal-channel-archive-test` контейнер зупинено та автоматично видалено. Всі зміни залишені локально, попередню роботу збережено.

Окремий visual QA repeat після очікування завершення opacity-анімації: archive/restore 2/2 passed (20.9s). Стабільні PNG зі fictional fixtures візуально оглянуто: `C:/Users/unbeatable/.codex/visualizations/2026/10/22/01a162e4-57c4-7fc2-b46b-d1f456fce4dc/eternal-channel-archive-mobile.png` та `eternal-channel-archive-desktop.png`. Перші screencast JPEG були проміжними кадрами анімації й не є фінальними візуальними артефактами.


## Продовження: серверний доступ до приватних текстових каналів — 22 жовтня 2026

Цей етап реалізує серверну модель та очищення клієнтського кешу. Окремого UI керування приватністю ще немає. Вкладення приватних каналів потребують закритого медіасховища: поточний R2 public URL не стає приватним після перевірки membership. Тому приватні канали приймають текст, але сервер відхиляє нові вкладення (включно з forward-in, GIF/story references та legacy/direct uploads). Перетворення каналу з будь-якими історичними вкладеннями на приватний повертає 409, навіть якщо повідомлення вже видалене для всіх. Історичні публічні URL не оголошуються захищеними.

### Контракт доступу

- Адитивна міграція `20261022160000_private_community_channels`: `isPrivate=false`, порожній `allowedUserIds` для наявних каналів. Explicit allowlist обмежений 200 унікальними активними учасниками тієї ж спільноти; довільні ролі й permission overrides не вводилися.
- OWNER і активний ADMIN мають доступ до всіх каналів. MEMBER має доступ до публічних каналів та приватних із явним дозволом. Адміністратор може керувати allowlist; він не може виключити власника чи інших активних адміністраторів із їхнього неявного доступу.
- Створення через наявний POST channels приймає необов'язкові `isPrivate` і `memberIds`, щоб приватний канал не проходив через публічний стан. Старі запити створюють публічний канал.
- GET/PATCH `/messenger/communities/:id/channels/:channelId/access`: лише активний OWNER/ADMIN. PATCH приймає `{isPrivate, memberIds, revision}`. Сервер перевіряє UUID/schema, адміністративні права, community/channel scope та revision окремо. Відповідь має той самий shape з актуальною revision. Застарілий editor отримує 409.
- `ConversationParticipant.leftAt` залишається спільною межею авторизації для повідомлень, розмов, пошуку, вкладень, unread і WebSocket. Зміна доступу, participants, revision та COMMUNITY_CHANGED outbox атомарна й використовує наявний порядок locks.
- Join/rejoin через інвайт додає тільки публічні канали. Leave/kick/ban прибирає явні grants; повторний вступ їх не відновлює. Підвищення/пониження ADMIN та transfer owner синхронізують неявний доступ приватних каналів. Збережена історія доступна після нового явного grant; новий grant встановлює joinedAt/lastReadAt, щоб відсутність доступу не накопичувала unread.
- Список каналів MEMBER фільтрується за актуальними participants. Explicit allowlist не повертається в member directory. Категорії лишаються загальною структурою спільноти.

### Запис, доставка та відкликання

- Після отримання participant locks send/edit/react/pin/call повторно перевіряють актуальний доступ. Cleanup delete/removeReaction/unpin теж перевіряє автора під lock, зберігаючи дозволений cleanup архівного каналу. Background retention без user actor продовжує працювати.
- Forward locks охоплюють destination і source; перед копіюванням перевіряється актуальний доступ до джерела, включно з hide-author. Local/global message search, media search і history мають membership predicate у фактичному SQL/Prisma query, а не тільки початкову перевірку.
- Зміна доступу чи видалення учасника конфліктує з активним persisted Call. Створення Call перевіряє кожного callee під тими самими locks, щоб stale target list не запрошував виключеного користувача.
- Відкладений MESSAGE_SENT outbox та entity fanout перетинають збережені recipients із поточними participants. Збій lookup залишає outbox для retry. Reconnect replay перевіряє доступ повторно для conversationId, повного ConversationView, вкладених message/call/conversation, voice room та callId.
- Retraction прибирає conversation і voice-mesh rooms, сповіщає peers та надсилає адресний conversationDeleted. Старий outbox не виключає користувача, який уже знову отримав доступ. Web cache прибирає list entry, history, detail/alias, activity і локальні/global search results; unread-count query інвалідується.
- Це не обіцянка дистанційно стерти вже завантажені копії або зупинити медіатреки модифікованого P2P-клієнта. Реальні два акаунти, multi-instance WebSocket, browser/native reconnect та voice transport залишаються окремою operational перевіркою.

### Rollout і межі

Нові маршрути належать messenger; Core зберігає ownership міграцій. Перед production потрібні backup і сумісна міграція на Core, потім оновлення та повне виведення старих messenger/all instances. Не створювати приватні канали до завершення drain: старий accept-invite не знає isPrivate та може відновити зайвий доступ. Повернення на старий messenger при наявних приватних каналах небезпечне; rollback потребує збереження access guards або призупинення відповідних API. Down-міграції та остаточного видалення каналів немає.

Міграції перевіряються лише в окремому `eternal-channel-access-test` PostgreSQL 17 на localhost:55433, БД `channel_layout_test`. Як у попередніх етапах, для deploy використано тимчасову копію schema та valid SQL migrations без старого порожнього каталогу `20261016000000_upload_budget`. Оригінальне дерево не оголошується готовим до прямого production migrate deploy. Робоча/production БД не використовувалася.


### Перевірки цього серверного етапу

- Backend focused regression: **235/235**, 12 файлів (communities, messages/conversations/search repositories/services, gateway, outbox, queue, direct uploads). Після додаткової перевірки доступу перед кожною порцією queued delivery повторено тільки queue + communities: **58/58**; ці запуски перекриваються, не є сумою унікальних тестів.
- Frontend cache/compatibility: **27/27** у chatCacheSync, realtimeChatBatch та communitiesApi. Перевірено видалення snapshot/local/global search при retraction, збереження unrelated detail і попередню сумісність response/cache.
- Реальний PostgreSQL integration: **11/11**, включно з попереднім layout/archive lifecycle. Нові сценарії перевіряють private directory/history/search, media denial, denied callees, regrant, ADMIN promotion/demotion, ownership transfer, leave/rejoin, transactional rollback, revoke проти stale writer, source-forward recheck і блокування removal під активним Call.
- Prisma generate/validate, backend typecheck/build та shared-contracts typecheck пройшли. Змінені ESLint-межі — 0 errors; власні нові unsafe-assignment warnings прибрані. Лишаються наявні gateway/message repository/test warnings. Prettier, whitespace check та test:design-docs пройшли.
- Окремий PostgreSQL контейнер після перевірки зупинено та автоматично видалено. Production migration/deployment не виконувалися. HTTP/JWT та справжні multi-account WebSocket/calls/reconnect у цьому етапі не запускалися; браузерного visual QA немає, бо UI керування приватністю ще не доданий.


Фінальні збірки серверного етапу: backend повторно пройшов після останньої зміни queued delivery; frontend пройшов TypeScript/Vite та всі 32 SEO prerenders. Збереглося наявне попередження lottie-web про eval. На той момент UI приватності, закрите медіасховище й production rollout не виконувалися; наступне продовження нижче оновлює цей стан.

## Завершення web-приватності та вкладень — 22 жовтня 2026

Попереднє обмеження «лише текст, без UI» замінене реалізацією нижче. Production deployment не виконувався.

- Створення каналу підтримує приватність і вибір дозволених учасників одразу. Редактор доступу відкривається з layout dialog; показує неявний доступ OWNER/ADMIN, пошук учасників із серверною пагінацією, ліміт 200 grants та підтвердження змін. Застаріла revision повертає конфлікт зі збереженням чернетки; незбережені зміни потребують явного відкидання. Приватні канали позначені замком у навігації.
- Вкладення приватного каналу завантажуються й публікуються в окремому закритому `R2_PRIVATE_BUCKET`. Відсутній або спільний із публічним bucket блокує операцію. Міграція `20261022180000_private_channel_media` додає durable registry і bucket до pending metadata. Завершення upload повторно перевіряє доступ; транзакція повідомлення перевіряє готовність, retain і належність URL/thumbnail.
- Повідомлення зберігають opaque `private-media://uuid`. JWT-захищений Core endpoint повертає GET на 60 секунд лише за актуальним доступом до видимого повідомлення. API не проксіює байти. Web resolver охоплює previews/reply/pins/search, voice/video playback, документи, lightbox, download/edit і forwarding. Signed URLs виключені з persisted cache; account switch і retraction очищають відповідну межу.
- Пересилання публічного файлу в приватний канал створює приватну копію через direct upload і прибирає публічний thumbnail. Старі публічні вкладення продовжують блокувати переведення каналу в приватний. Оригінальне публічне джерело не оголошується секретним. Явне пересилання приватного файла може надати доступ адресатам копії; це свідома дія користувача.

### Фактичні перевірки завершення

- Backend focused regression: **183/183**, 10 файлів. PostgreSQL layout/archive/access integration: **11/11**; це включає попередні сценарії й не є сумою унікальних тестів усіх етапів.
- Нова інтеграція реальних HTTP/JWT + PostgreSQL 17 + S3-сумісного RustFS: **6/6**. Перевірено анонімний 403 для staging/final object, JWT 401, outsider 403, actual signed GET/PUT bytes, TTL 60 секунд, forged/unretained/public thumbnail denial, видалення, архів, intentional forwarding і revoke/privacy-change під час upload. Token revocation dependency в цій fixture замінена; production revocation має окремі тести.
- Frontend regression: **69/69**, 13 файлів; додатковий resolver suite **8/8** та forwarding regression **2/2** перевіряють transient cache, account switch, retry, unsafe URL, приватну копію і hide-author. Запуски перекривають comprehensive suite; це не повний repository test run. Наявні jsdom XHR diagnostics не спричинили падіння тестів.
- Playwright із mocked API: access editor **2/2** і приватне вкладення/denial **2/2**, кожен на 390px і 1440px. Reload зберігає доступ; browser реально завантажує mocked storage image. Screenshots редактора на обох розмірах візуально оглянуто. Це не перевірка production CORS або двох реальних акаунтів.
- Prisma generate/validate, backend typecheck/build, frontend TypeScript/Vite та 32 SEO prerenders пройшли. Є наявне lottie-web eval warning. Незалежний read-only review приватного media boundary не знайшов must-fix; зафіксував TTL і retention межі.
- Вузький premium UI audit: 0 violations, 2 unresolved для authored JSX Select (scanner false positive). Звіт `premium-private-channel-audit.json` у поточній папці visualizations; repository-wide clean audit не заявляється.

### Умови розгортання й збережені межі

Потрібні backup, обидві адитивні access/media міграції на Core, окремий непублічний bucket, object-scoped credentials до обох bucket, CORS PUT/GET/HEAD і staging lifecycle. Потім потрібне повне виведення старих Core/Messenger/all instances та сумісний web release. Точний transport описаний у [DIRECT_MEDIA_UPLOADS.md](../DIRECT_MEDIA_UPLOADS.md). Без конфігурації приватне завантаження повертає помилку й не переходить у публічне сховище.

Історичні integration fixtures використовували одноразові localhost DB/storage. Ізольований release snapshot не містить локального порожнього артефакту `20261016000000_upload_budget`; прямий `migrate deploy` усіх п'яти community/access/media міграцій успішно відрепетирувано на відновленій localhost-копії production backup. Production DB це не змінює.

Вже виданий signed GET діє до 60 секунд після revoke. Retained private objects не видаляються автоматично, бо ними можуть користуватися явні forwarded copies; остаточне видалення каналів і політика зберігання лишаються окремою роботою. Поточний Expo app не має channel chat: FeedDock спрямовує Messages у desktop web. Майбутній native channel UI потребуватиме resolver. Production CORS, реальні multi-instance WebSocket/calls/reconnect і двоакаунтний acceptance ще не перевірені. Наступний продуктовий пріоритет — успадковані налаштування сповіщень server/channel, mute, mentions і узгоджені unread.

Фінальний контроль: frontend/backend typecheck пройшли після останніх тестових змін; resolver + comprehensive suites — 14/14, повторна HTTP/JWT/storage integration — 6/6. Lint фінальних resolver/UI/test/media boundaries — 0 errors; нові unsafe warnings у HTTP fixture усунено типом `INestApplication<Server>`. Design generation/check, test:design-docs, Prettier і git whitespace check пройшли. Є наявні jsdom XHR diagnostics та pg deprecation warning; вони не є помилками цих запусків. Обидва одноразові `eternal-private-media-*` контейнери зупинено й автоматично видалено, сторонній PostgreSQL контейнер збережено.


### ����������� � ���������, 23 ������ 2026

�������� ������ ��� ���������: ��� ������� ������� ��������� ������������, grant/revoke/regrant, �����, �������� R2-����, WebSocket send/replay/reconnect. ϳ��� ����������� SDP ������������ production-���������� ��������� � ���� �����; ���� ���������� QA-����� �� peer connections ������. ���������� ������ � � docs/operations/private-channel-rollout-2026-10-22.md.

����� 2 ���������� � release worktree: ������ �������� ������ ALL/MENTIONS/NONE, ���������� mute, nullable channel override � �������������; ���������� mute ������� ������ ��������� ��. ����������� @username ������ ����� ���� �������� ID ��������� ��������, �������� ��������, ������������ ���������� �� idempotent replay. Offline encrypted retry ������ ���������� envelope � ������; forwards �� ���������� ������ � ���� �������. ������������ ������� in-app toast/sound, �� ������� �������� ��� canonical unread. ������� operating-system push �� �����������.

�������� unread-������ �������������� ������� �������� projection ����� ��� ������ ���� ������������� ���������. Personal events � reconnect/resync ��������� ������������ �� ���������� alert. ����� �������� ����������� Modal/Select, ������ �������� drafts �� ��������� �� ��������. ��������� focused suites, �������� ���������� PostgreSQL � ��������� ������ 390/1440px; ���� encrypted production backup ���������, ������� �������������� �� ��ﳿ. Production rollout �������� �� ���������; ���� � ��� � � docs/operations/community-notifications-rollout-2026-10-23.md.
