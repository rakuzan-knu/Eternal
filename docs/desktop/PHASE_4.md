# Фаза 4 — нативний UX

Реалізовано без нових залежностей і змін backend. Повне кросплатформне приймання
ще потребує перевірок на macOS/Linux та в установлених пакетах.

## Поведінка

- Закриття головного вікна ховає його в трей; socket, дзвінки та power blocker
  залишаються активними. Open Eternal, клік на трей і повторний запуск повертають
  вікно. Quit Eternal завершує застосунок та звільняє ресурси. Якщо створення трея
  не вдалося, закриття працює звичайно; на macOS застосунок доступний через Dock.
- Нативні сповіщення використовують наявні socket handlers і перевірки mute/DND,
  категорій та приховування імені/тексту. Для прихованого активного чату також
  надходить сповіщення; unread metadata більше не обнуляється лише через відкритий
  маршрут. Main не завантажує зовнішні аватари. Нативні сповіщення беззвучні:
  звук контролюється наявними web налаштуваннями. Сповіщення одного чату
  замінюються; максимум п'ять активних, TTL 60 секунд. Нові теги обмежені одним
  сповіщенням за секунду, щоб стримувати потоки повідомлень. Після завершення lifetime
  та logout старий клік не виконується.
- Desktop read receipts перевіряють видимість до debounce і перед відправленням;
  прихований чат не читається. Після відновлення вікна чинний чат позначається
  прочитаним; logout/unmount скасовують відкладену відправку.
- Бейдж — сума серверного scalar unread messages і notification total, включно
  з чатами поза завантаженими сторінками. macOS/Linux використовують badge API,
  Windows — overlay icon з доступним описом кількості. Локальні playlist invites
  з музичного sidebar окремо не додаються. Logout, зміна акаунта, navigation
  документа та втрата renderer очищають нативні сповіщення й бейдж.
- `eternal://messages/<conversationId>?messageId=<messageId>` і
  `eternal://notifications` працюють при старті й повторному запуску;
  macOS `open-url` реєструється до ready. Також підтримані feed, profile,
  communities/channels, reels та music playlist/track відповідно до маршрутів web.
  API/OAuth callbacks, сторонні hosts, credentials, порти, traversal та encoded
  separators відхиляються. OAuth handoff цією фазою не реалізується.
- Deep links і кліки сповіщень фокусують вікно та передають відносний маршрут
  React Router через обмежений invoke/handle long poll, без reload документа.
  До логіну зберігається останній маршрут у пам'яті. Схема реєструється тільки
  packaged застосунком; builder config містить `eternal` protocol metadata.
- Нативне меню має стандартні команди редагування, масштабування, fullscreen,
  роботи з вікном і завершення. У production немає пунктів Reload/DevTools.
  Контекстне меню editable поля додає виправлення слова й Add to dictionary;
  системні мови зіставляються з доступними словниками, macOS використовує OS.
- Положення, звичайні розміри та maximized зберігаються в `userData/window-state.json`.
  Некоректний файл і відключений монітор ігноруються; частково приховані та
  завеликі bounds підганяються під робочу область. Fullscreen/minimized не
  перезаписують нормальні bounds.
- Open at login у меню трея — opt-in, недоступний у dev. Windows/macOS
  використовують OS login items; Linux — власний файл у XDG autostart із
  коректним escaping Exec, AppImage використовує шлях `APPIMAGE`.
  У разі помилки прапорець відкочується й показується повідомлення.
- OS idle після п'яти хвилин, lock та suspend перемикають локальний статус
  трея Active/Away; unlock/resume відновлюють перевірку. IPC `getIdleState`
  повертає active/idle/locked/unknown. **Це локальний статус:** чинний серверний
  presence контракт має лише online/offline. Інші користувачі й web індикатор
  не отримують Away. Спільний auto-away потребує окремої погодженої зміни
  backend-контракту; socket не відключається й rich activity не підмінюється.

## Контракт та сумісність

До попереднього мосту сумісно додані `showNotification`, `setBadgeCount`,
`waitForNavigation`, `getIdleState`, `resetNativeState`. Кожний канал перевіряє
власника WebContents, main frame, origin і Zod-кортеж аргументів; довільний
ipcRenderer не доступний. Старі методи дзвінків залишаються сумісними.
Web перевіряє доступність нових методів для старої desktop оболонки.

Hosted fallback B з фаз 1–2 збережено. Нові renderer інтеграції запрацюють у
звичайній desktop збірці після публікації оновленого web стандартним релізним
процесом. Наявний опублікований сайт цим завданням не оновлювався.

## Перевірено

На Windows x64 пройшли desktop TypeScript/build/ESLint, web TypeScript і desktop-mode
build, ESLint змінених web файлів (чотири наявні попередження в useCallManager/useMessageActions),
Knip для desktop/web, Prettier і перевірка diff whitespace.

82 desktop тести перевіряють також нові URI/IPC обмеження, обмеження черги,
window bounds, idle lifecycle, opt-in autostart та lifetime сповіщень.
72 цільові web тести перевіряють notification privacy/mute, unread, відкладену
навігацію до логіну, StrictMode, бейдж після зміни акаунта й очищення на logout.

Electron smoke, native UX E2E та media E2E пройшли: реальний close-to-tray,
second-instance/startup deep links, bounds persistence, menu, lock/unlock IPC,
ізоляція bridge на untrusted документі; media перевірка фази 3 також проходить.
Нативний toast у тесті підміняє `Notification.show` та генерує клік, без
показу приватних даних у системі. Hosted smoke не є перевіркою нового
неопублікованого renderer: його інтеграції покриті локальними web тестами.
`electron-builder --dir --publish never` створив Windows x64 unpacked app,
включно з tray asset та fuses.

## Залишилося для повного приймання

- Реальні OS toast permission/delivery/Action Center, системний спеллчекер,
  tray/dock badge й клавіатурний доступ до нативних меню на всіх трьох ОС.
- Справжній другий запуск через системну реєстрацію `eternal://`, autostart після
  входу в ОС і зняття opt-in в установлених пакетах. Тести autostart використовують
  тимчасову XDG директорію й OS mocks; реєстр та login items цього комп'ютера
  не змінювалися. Flatpak/Snap autostart потребує окремої перевірки у фазі магазинів.
- Приймання нових renderer інтеграцій у hosted середовищі після звичайного web
  релізу. Deployment, підписування, commit і push не виконувалися.

Документація API: [Electron app](https://www.electronjs.org/docs/latest/api/app),
[Notification](https://www.electronjs.org/docs/latest/api/notification),
[Exec escaping](https://specifications.freedesktop.org/desktop-entry/latest/exec-variables.html).
