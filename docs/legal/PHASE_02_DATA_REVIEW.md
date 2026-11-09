# Перевірка даних та українських вимог — 9 листопада 2026

Україна відкрита після PR155. Ця перевірка не змінює допуск, Terms або client/server
контракти й не підтверджує повну юридичну відповідність. Результат фази:
**needs_user** — доступна інвентаризація/підготовка виконана, людські та provider
gates залишаються відкритими. Інші фази не виконували.

Повний локальний реєстр, первинні джерела з датами/SHA256, catalog/metadata
receipts, retention matrix і проєкт операторського процесу збережені в пакеті
`C:/Users/unbeatable/Documents/Sites/Eternal-desktop-context/phases/results/02.md`.
Цей шлях — локальний handoff, не публічна URL й не backup сховищ.

## Фактичні результати

- PostgreSQL 17.6: strict TLS, read-only catalog; 70 Prisma models наявні серед
  74 public tables, 656 columns, 114 FK, 22 trigger entries. Application records
  не читали. Admission, sessions, complaints, media references й outbox включені
  до карти; каскадне видалення SQL не доводить видалення зовнішніх копій.
- Redis 8.6.2: noeviction, 22/30 clients разом із probe, 85 keys у неатомарному
  проході; лише category/type/PTTL aggregates, без значень і raw identifiers.
  Redis залишається без TLS; до Aiven application data не переносили.
- Messenger stored config має Cassandra telemetry/archive flags; SQL capture=true.
  Не можна позначати Cassandra not applicable. Astra management API401 і UI
  sign-in не дозволили підтвердити actual CQL schema/TTL/region/backup scope.
- R2 `social-network-media` і `social-network-private-media` повернули location
  EEUR. Lifecycle403, public-access-block501; це не доказ відсутності політик.
  Public/private роль за кодом ще потребує dashboard перевірки. Objects не читали.
- Знайдено Core stored-config розрив: linked env-group updated2026-08-14 має
  legacy MINIO bucket avatars; specialty roles мають поточні R2 settings. Не
  копіювати env bulk і не вважати stored config доказом live process.
- MEDIA_PENDING_TRACKING_ENABLED і MEDIA_ORPHAN_CLEANUP_ENABLED відсутні у
  перевіреному stored config. Наявність cleanup-коду не доводить active purge.
- Загальні строки для SQL sessions, reports, private media, generic outbox/DLQ,
  Cassandra, provider logs/mail/backups не погоджені. Backup script7d не доводить
  запущений backup cron; попередній public-schema dump не є full backup.

## Мінімальне локальне виправлення retention

У `AutoDeleteService` storage errors раніше поглинались перед видаленням
Message/Attachment references. Тепер strict deletion передає error до наявного
per-user handler: сторінка залишається для повторного sweep, інші користувачі
продовжують оброблятися. Регресії перевіряють retry та ізоляцію збою.

Не змінено sender/cutoff scope, messenger ownership, unread transaction locks,
private-media exception або події після SQL delete. Нових retention periods,
SQL migration і production deletion немає. Виправлення локальне, не deploy-нуте;
cross-store account erasure ним не реалізовано.

Відомий окремий erasure/auth ризик: після self-delete JwtStrategy може повернути
кешовану identity, оскільки UsersService не викликає revocation/invalidation.
Цей шлях описано в handoff; попередній E2E без відповідного cache-warming не
доводить інвалідацію всіх процесів. Auth code у фазі02 не змінювали.

## Українське право й договори

Перевірено офіційні чинні print-версії: [№2297-VI, редакція14.06.2025](https://zakon.rada.gov.ua/laws/show/2297-17),
[№3321-IX](https://zakon.rada.gov.ua/laws/show/3321-20),
[ЦК, редакція05.08.2026](https://zakon.rada.gov.ua/laws/show/435-15) і
[СК, ст.177](https://zakon.rada.gov.ua/laws/show/2947-14). Враховано зміни2026
до ст.31–32 ЦК; старі копії кодексу не є достатнім актуальним джерелом.

Прийняття договору, privacy acknowledgement і згода на окрему мету різні.
Content licence має майновий аспект; 13-річний і 14–17-річний мають різні
межі дієздатності. Заява представника не перевіряє його особу/повноваження;
Discord/content rating цього не замінюють. Потрібні рішення операторів та
українська фахова оцінка конкретного договору, secondary uses/business status
для №3321-IX й [особливого ризику/повідомлення Уповноваженого](https://ombudsman.gov.ua/en/oprilyudnennya-informaciyi-na-vimogu-statti-9-ta-24-zakonu-ukrayini-pro-zahist-personalnih-danih/poryadok-ta-formi-zdijsnennya-povidomlen-dodatkova-informaciya).

Provider register відокремлює опублікований DPA від applicable account agreement.
[Vercel DPA](https://vercel.com/legal/dpa) прямо охоплює Pro/Enterprise;
[Terms](https://vercel.com/legal/terms) містять model-training умови Hobby/trial Pro
та opt-out. Actual plan/settings/scope ще не підтверджені. Це питання для
перевірки, не доказ фактичного навчання на даних Eternal чи відсутності договору.
Aiven ticket110203 scope лишається unresolved; дубль листа не надсилали.

Проєкт спірних заяв/старих акаунтів зберігає права дитини, не збирає паспорти
за замовчуванням, не фабрикує admission records і не запускає backfill без
погодження/compatibility checks. Runbook і synthetic desk-check не дорівнюють
реакції операторів. Людський drill та weekday підміна не підтверджені.

## Уточнення від операторів після первинного receipt

9 листопада2026 користувач повідомив: доходів/донатів0, реклами та платіжного
сервісу немає; майбутня комерціалізація ще не обрана/не запущена. Обидва оператори
переглядатимуть звернення за надходженням і за можливістю. Реєстраційний статус,
secondary uses, правова кваліфікація діяльності, гарантований строк реакції,
повне погодження runbook і фактичний drill цією відповіддю не підтверджені.
Фаза лишається needs_user. Це уточнює попередні невідомі; решта gates незмінні.

## Друге уточнення операторів — 9 листопада2026

За повідомленням користувача обидва оператори є повнолітніми фізособами без ФОП;
власного використання даних поза сервісом/підтримкою/захистом не було й не планують.
Додатковий архів завершених службових даних не потрібний; можливі затримки ручного
очищення є обмеженням ресурсу, а не погодженим строком зберігання. Підготовлено
короткий runbook v2 з event-based retention targets; новий purge не реалізовано.
Участь обох у training і готовність увійти до provider accounts підтверджені,
але фактична перевірка ще відкрита. Фаза лишається needs_user; попередні невідомі
про форму операторів та їхні власні secondary uses цим уточнено.

## Актуалізація після перевірки кабінетів і операторських рішень

Стан попередніх секцій уточнено такими результатами 9 листопада 2026.

- Astra на Free відновлено за дозволом операторів до Active. System schema підтвердила eternal.message_bodies, call_telemetry_by_call, call_telemetry_by_user, default_time_to_live=0 і gc_grace_seconds=864000. Дані повідомлень не читали. Історичні копії, runtime writers і виконання purge залишаються відкритими.
- R2 lifecycle підтверджено в обох buckets, public/private розвиткові URL розрізнено. Це уточнює ранні помилки API403/501.
- Render Hobby має документовані 7 днів журналів. Proton support на Free, загальна автоматична очистка звернень не підтверджена. Scribe для відповідей не використовували за прямою відповіддю користувача.
- Supabase Free не включає project backups. Redis Cloud має вимкнені persistence/remote backup/HA. Відновлення між сховищами ще не продемонстровано.
- Sentry DPA5.1.0 оператор прийняв самостійно. UI підтвердив Version 5.1.0 signed Nov 9, 2026. Vercel model-training opt-out збережений за попереднім дозволом.
- Оператори погодили синтетичний сценарій представника, базовий перехід старих акаунтів і ціль мінімізації завершених звернень. Графік обробки — за можливості. Доставка й своєчасність реакції потребують перевірки.
- Перевірено опубліковану різницю EN/UK ліцензій, підготовлено узгоджений проєкт. Поточна реєстраційна схема приймає лише точний Terms digest. Старі web/mobile/desktop builds надсилають digest зі своєї збірки. Одночасна заміна literal на сервері призведе до HTTP400 для таких клієнтів.
- Strict storage retry перевірений незалежно. Комбінований запуск двох backend test files пройшов 12/12. Окремо звірено SHA256 нормалізованого джерела Terms і рівність shared/server schemas.

Перед зміною Terms потрібне сумісне рішення для старих клієнтів. Варіанти мають зберегти зв'язок фактично показаного тексту з accepted digest, передбачити зрозуміле оновлення та архів незмінного попереднього тексту. Автоматична підстановка нового digest до старої декларації створила б недостовірний запис погодження.

Поточний worktree privacy-compliance містить локальне виправлення retry, яке ще не розгорнуте. Production rollout потребує перевіреного recovery/rollback, ownership messenger та контролю Redis overlap за SERVICE_OWNERSHIP.md. Міжсховищний purge і приватні forwarded media цим виправленням не покриваються.

Загальний результат фази залишається незавершеним. Невирішені питання мають конкретні технічні й зовнішні умови, наведені нижче.

## Виконані HTTP-auth і recovery виправлення

У JwtStrategy прибрано позитивний process-local WeakRefCache. Після commit видалення акаунта наступна HTTP-авторизація перевіряє актуальний User через repository й відхиляє відсутнього користувача. Додано регресію для попередньо авторизованого акаунта. Ціна — один indexed User lookup на кожний HTTP auth request. Уже авторизовані запити та WebSocket-з'єднання потребують окремого покриття.

У scripts/db/verify-backup.sh увімкнено pipefail/nounset, вилучено eval і типовий encryption key, OpenSSL читає ключ з env. psql використовує -X і ON_ERROR_STOP=1. Помилки decrypt/потоку/SQL завершують drill невдачею. Temporary DB має унікальне ім'я та очищається після успішного створення. Успішний table count більше не оголошується гарантією RPO.

Перевірки успішні — 9 JWT/auto-delete тестів і 45 users/repository/auth-guard тестів, backend typecheck, build і targeted ESLint. Node/Git Bash regression для restore пройшла. Реальний ізольований PostgreSQL17 drill перевірив encrypted backup→restore обох синтетичних рядків, failure на навмисно некоректному SQL та очищення. Контейнер і тимчасові БД прибрано. Production recovery цим не підтверджується.

Код збережено у worktree privacy-compliance. Зміни потребують безпечного production rollout за SERVICE_OWNERSHIP.md. Окремі незакриті прогалини — WebSocket user-existence/revocation, R2 account-media erasure, privacy-forwarded references, provider copies і Terms compatibility.

## Підсумок поточного виконання

Незалежний reviewer завершив перегляд HTTP-auth і restore-script diff. Після зауваження про приховану помилку cleanup виправлено EXIT trap — невдалий dropdb повертає failure, початковий статус помилки restore зберігається. Обидва сценарії покриті успішними регресіями. PostgreSQL17 synthetic drill було виконано перед цією зміною trap, повторну DB-перевірку для неї не заявлено. Нові файли й SHA збережено у 02-auth-recovery-verification.json, точний patch актуалізовано.

Docker Desktop тепер запущений, engine29.7.2 відповідає. Тимчасові ресурси drill видалені. Фактичний production backup, міжсховищне відновлення і розгортання змін лишаються неперевіреними. Локальна синтетична перевірка підтверджує роботу інструмента restore, а не відновлюваність чинного production.

Уточнення Aiven110203 запрошено як зовнішній доказ для реєстру. Дані до Aiven не переносили. Фази03–12 залишаються поза поточним виконанням.
