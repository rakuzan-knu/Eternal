# Interface writing and localization

Applies to new and changed product copy. The current web UI primarily uses English; the Ukrainian offline prototype is a separate review artifact. This guide does not claim a completed translation or introduce a localization library.

## Voice

Use short, direct sentences. Name the action and its result. Use sentence case, familiar verbs and one term for each concept. Avoid technical identifiers, blame, jokes in errors, “Oops”, and vague “Something went wrong” when a useful recovery is known.

| Situation | Preferred copy | Avoid |
| --- | --- | --- |
| Feed request failed | Your feed could not load. Try again. | No posts yet (on a failed request) |
| Empty search | No results for “{query}”. Try another name or keyword. | Nothing found!!! |
| Message send failed | Message not sent. Try again. | Network exception: 503 |
| Pending upload | Uploading attachment… | Success (before acknowledgement) |
| Unsaved edit | Discard your changes? / Keep editing / Discard changes | Are you sure? / Yes / No |
| Destructive action | Delete this post? This cannot be undone. / Delete post | OK |
| Permission denied | You do not have permission to edit this post. | Invalid input (when authorization failed) |
| Unmapped login/network failure | We could not log you in. Try again. | Incorrect credentials (without that server result) |

Loading, error and empty are distinct states. Retry must retry the named request and keep input/drafts. Never promise that a message was sent, an item was deleted or a setting was saved before the server confirms it. Validation describes a fix; authorization describes an unavailable action without exposing private resources.

## Working glossary

These Ukrainian/Russian entries are starting copy for review by a native speaker, not deployed translations.

| English product term | Ukrainian | Russian | Meaning |
| --- | --- | --- | --- |
| Post | Допис | Публикация | Feed content item |
| Story | Історія | История | Temporary media |
| Message | Повідомлення | Сообщение | Conversation item |
| Follow / Unfollow | Стежити / Не стежити | Подписаться / Отписаться | One-way relationship; distinguish from friends |
| Save / Saved | Зберегти / Збережене | Сохранить / Сохранённое | Saved content; distinguish from sending an edit |
| Try again | Спробувати ще раз | Попробовать ещё раз | Retry a failed operation |
| Cancel | Скасувати | Отмена | Close without applying |
| Apply theme | Застосувати тему | Применить тему | Save the selected theme |
| Use readable bubbles | Зробити бульбашки читабельними | Сделать пузыри читаемыми | Change theme draft; not a save action |

## Formatting and translation contracts

- Use the selected locale for dates/numbers with existing `Intl` APIs. Keep timestamps as UTC/ISO data and format at presentation time. Relative times need a complete localized phrase; never concatenate a number with an English suffix.
- Use plural rules for counts, including Ukrainian/Russian one/few/many; check 0, 1, 2, 5, 11, 21 and 101. Keep a complete message as the translation unit, including placeholders and plural variants.
- Store keys by meaning rather than the English sentence when localization is implemented. Reuse a label only where its meaning and grammar are the same. Avoid introducing an i18n dependency solely for this guide.
- Preserve names and user text. Truncation is a layout choice, not a string mutation; keep the full accessible name where needed. Do not abbreviate essential error recovery or destructive consequences.
- Test Cyrillic `іїєґ / ёйщыэ`, emoji with modifiers/ZWJ, accented Latin, long URLs and unbroken names. Review layouts with 30–50% longer translations and enlarged text. RTL needs an explicit product scope and layout review before declaring support.
- Icon-only controls need the same meaningful accessible name as a visible action. Announce asynchronous errors/status once; do not announce decorative animation frames or every keystroke.

## Change checklist

For every affected state, record the visible title, explanation, primary action, accessible name and whether a draft survives. Check wording alongside behavior, not just in a string list. Link the related scenario in [extended screen coverage](extended-screens.md) or [screen scenarios](scenarios.md). Review new terminology here in the same change as its first use.
