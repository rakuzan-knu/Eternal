# Актуальний стан — фаза 01, 9 листопада 2026

Read-only перевірка: 15:25–15:35 UTC (17:25–17:35 Europe/Kyiv). Production не змінювали.
Це технічна карта, а не юридичне схвалення чи підтвердження публікації в магазинах.

## Git і production

Remote main після fetch: `d1c72c84b0f3e34b2852363c43448a594853d3da`.
Різниця з [PR155](https://github.com/rakuzan-knu/Eternal/pull/155), merge
`d68923699d24b2082484c1ef3168d949ccaf3ece`, — лише `CHANGELOG.md`.

| Сервіс / canonical URL | Live source SHA | Deployment ID |
| --- | --- | --- |
| [Core](https://social-network-backend-4h47.onrender.com/health/ready) | `d68923699d24b2082484c1ef3168d949ccaf3ece` | `dep-dboejc6417fc7381kutg` |
| [Messenger](https://eternal-messenger.onrender.com/health/ready) | `d68923699d24b2082484c1ef3168d949ccaf3ece` | `dep-dboeg8jl550s739g7oag` |
| [Reels](https://eternal-reels.onrender.com/health/ready) | `4209fd3bf78cf122a77ec254c654376c31eb245f` | `dep-dbnmk05g1s2s73d49hv0` |
| [Music](https://eternal-music-hub.onrender.com/health/ready) | `2b98bd3530704c6e3e4cc37d0ea7053911a790ed` | `dep-dbnnve15efls73bshf6g` |
| [Web](https://eternalnet.vercel.app/register) | `d68923699d24b2082484c1ef3168d949ccaf3ece` | `dpl_iEWRMPiWwQrhYLkAYFgNid2JHSJ8` |
| [Mobile web](https://eternal-mobile-web.vercel.app) | `d1c72c84b0f3e34b2852363c43448a594853d3da` | `dpl_HjVU6YGC52W8MBZyqXHrq8JyemWP` |

Джерела: Render GET service/deploys та Vercel inspect, GET deployment metadata з
canonical alias. Обидва Vercel deployments READY; IDs відрізняються від знімка
8 листопада. Усі чотири readiness повернули 200, database/redis `ok`;
resource memory status `warning` — це не performance/load acceptance.
Render: Free, autoDeploy=no. Core stored `BACKGROUND_ENABLED=true`,
`UA_PUBLIC_REGISTRATION_ENABLED=true`; live policy окремо підтверджує відкриття.
Redis probe: 22/30 clients, без TLS; Aiven cutover не виконували.

**Україна відкрита:** [policy web](https://eternalnet.vercel.app/api/auth/registration-policy)
і [Core](https://social-network-backend-4h47.onrender.com/auth/registration-policy)
повернули `minimumAge=13`, `registrationOpen=true`, `reviewedMarkets=[UA]`,
`policyVersion=2026-11-08-ua-1`, `reason=UKRAINE_SELF_REGISTRATION`, `no-store`.
Інвайтів/ручного approval немає. Проживання і представник — заявлені дані.
Нових акаунтів, зокрема вигаданих дітей, у цій фазі не створювали.

## Релізи та окремий store candidate

| Джерело | SHA | Assets / результат |
| --- | --- | --- |
| [v1.14.0](https://github.com/rakuzan-knu/Eternal/releases/tag/v1.14.0) | `d1c72c84b0f3e34b2852363c43448a594853d3da` | public stable, 30 assets; 27 SHA256SUMS записів збігаються з API digest; GPG + 2 attestations PASS |
| [v1.13.4](https://github.com/rakuzan-knu/Eternal/releases/tag/v1.13.4) | `2a4e06eb639d650f38d943bb45005f3a6a8476c9` | public stable, 30 assets; 27 checksum-записів, GPG + 2 attestations PASS |
| [v1.13.3](https://github.com/rakuzan-knu/Eternal/releases/tag/v1.13.3) | `0a5652887a8bbd8c1297df2388814d42f7cccbab` | public stable, 30 assets; 27 checksum-записів, GPG + 2 attestations PASS |
| Store candidate 1.13.4 | `1116661801876259182e53b2fa762a2965a07b86` | 4 локальні пакети та artifact ZIP повторно хешовано; ZIP збігаються з чинним API digest |
| v1.13.0 / v1.13.1 / v1.13.2 | історичні теги | draft: 30 / 30 / 0 assets; не публічні stable downloads |

GPG fingerprint: `CACBA63FD0E64C10DB18F44F285F8FC2D8D07CFC`.
Для кожного public desktop release завантажено й хешовано п'ять metadata/proof
файлів, перевірено точний source у `desktop-release.json`, відповідність ключа
репозиторію, detached signature `SHA256SUMS.asc`, GitHub attestations для
`SHA256SUMS` та `desktop-release.json`. Великі binaries повторно не завантажували
і не запускали: їх опубліковані API digests звірені з підписаним manifest.
Це не перевірка Authenticode, Apple notarization чи runtime 1.14.0.

Store candidate походить з [packages run 42491677725](https://github.com/rakuzan-knu/Eternal/actions/runs/42491677725),
[desktop run 42491682868](https://github.com/rakuzan-knu/Eternal/actions/runs/42491682868),
[checks run 42492395938](https://github.com/rakuzan-knu/Eternal/actions/runs/42492395938).
Packages не expired; точні expiries — 15 листопада 2026, 14:52:20–14:56:23 UTC.
Runtime/WACK report artifacts не expired, expiry 6 лютого 2027, 14:58:23 UTC.
Candidate `publish=false` не отримує автоматично release GPG/attestations.
Історичний WACK: overall PASS, 22 PASS / 2 optional FAIL. Пакетні SHA256:

| Пакет | SHA256 |
| --- | --- |
| MSIX x64 | `d5c9d372aaabcc982423c7fb512cff55cb131c53f270ff57c042184e03fa7759` |
| MSIX ARM64 | `818d1c918ba8f90506b356843e3b04a3bacac2a5df4fb83f5b2ca6934576dbe1` |
| Snap x64 | `e16dedd9fc049cbc614602b2ced64492119b99646f1816e134b71db641dfdf90` |
| Snap ARM64 | `e2c29fca3350bd6c4a4098ca1c661fd1745c2b499ff61c9079bd79af0de0da7d` |

## Зовнішні межі

- Microsoft product `9N2XFD2B14JG`: Partner Center повторно показав In certification,
  progress 3, Publishing not started, manual Publish now hold. Публікації не було.
- Snap `eternal-desktop`: у Revisions немає рядків пакетів; «Snap is public»
  стосується visibility, а не опублікованого release. Collaboration: no accepted
  shares, no pending invites. Forum нині signed out; старий account-approval blocker
  не перевірено повторним login. Allow-sandbox approval не підтверджено.
- Aiven: 9 листопада о 04:26 Europe/Kyiv надійшло повідомлення про update ticket
  `110203`; текст update доступний лише після входу в окремий Support Center.
  Це не підтвердження DPA scope. Console показав Running Valkey Free-1,
  DigitalOcean ams, Europe/Netherlands; production cutover не виконували.
- Flathub submission не виконували; датовану policy з фази 9 не видаємо за нову
  перевірку. Людська підготовка/чинна policy залишаються окремою фазою.
- Windows S mode, Wayland, пристрої й native mobile acceptance не перевіряли;
  це hardware/manual gates інших фаз.
- Користувач підтвердив основного оператора з operational/recovery доступом до
  всіх сервісів. Незалежне відновлення і резервний доступ другого оператора
  не перевірені. Наявність API credential або відкритого кабінету не доводить
  recovery другого оператора. Нових прав чи інвайтів не видавали; app usernames
  не стали ADMIN.
