# Mobile and desktop prototypes

[Open the interactive prototype](prototypes.html). Open this file directly in a modern browser with JavaScript enabled; no server, installation, credentials or network connection is needed. Keep the repository folder structure so the desktop logo resolves from the existing [favicon](../../apps/web/public/favicon.svg). Styles and behavior are embedded in the HTML; fonts use the local system stack.

These are **adaptation proposals**, not the Expo application or a selected desktop runtime. The [web foundations](foundations.md), [screen compositions](screens.md), [component recipes](components.md) and [typed tokens](../../packages/shared/ui-primitives/src/tokens.ts) remain the implementation reference. The prototype uses representative content and simplified artwork, not live users, a pixel-perfect web capture or native platform controls.

## Flow and actions

1. In **Стрічка**, select Sofia's author name/avatar to open **Профіль**. Like/save actions toggle their state without replacing the scrollable pane or resetting its position. The overflow menu exposes saving and profile navigation.
2. In **Профіль**, select **Стежити** to toggle following, then **Написати** to open **Чат**. The header Back control returns along the visited screens; persistent navigation can also select a destination.
3. Type a message and select Send or press Enter. Shift+Enter inserts a line break. Empty/whitespace-only messages cannot be sent. Drafts survive navigation, platform changes and failure presets during the current page session.
4. In the feed, select the plus action to open a named dialog, enter text and publish a local example post. Cancel/Escape close the dialog and retain its unfinished text. Publishing clears it.
5. **Скинути** clears example posts, chat messages, drafts and toggled actions. Reloading also clears all example data. No action writes to the server or persists personal data.

The desktop titlebar and mobile status/home indicators are decorative simulations. Only Sofia's conversation is represented; the prototype does not imply that multiple real conversations or contacts are implemented.

## Proposed platform choices

| Area | Phone proposal | Desktop proposal | Reason / reference |
| --- | --- | --- | --- |
| Navigation | Reachable bottom destinations; detail Back in the header | Persistent left navigation; labels collapse at narrow widths | Preserve destination identity without the web's desktop padding; [platform guidance](platforms.md#layout-adaptation-rules) |
| Feed | Full-width readable cards with 16px gutters | Centered feed capped at 672px | Preserve hierarchy and card geometry; [feed](screens.md#social-surfaces) |
| Profile | Banner/avatar overlap, reachable Follow and Message | The same hierarchy in a wider centered pane | Preserve identity and action priority; [profile source](../../apps/web/src/pages/Profile/Profile.tsx) |
| Chat | Conversation occupies one column | Conversation plus list when the inner viewport reaches 930px | Keep composer readable before adding adjacent content; [chat source](../../apps/web/src/pages/Chat/Messenger.tsx) |
| Keyboard | Optional 4-row keyboard reduces the message area; bottom destinations hide | System keyboard remains outside the window simulation | Compose above the keyboard and restore navigation afterward |
| Safe areas | Optional 46px top / 26px bottom simulation | Simulated 40px window titlebar | Insets are test values, not universal OS/device dimensions |
| Actions | At least 44px main navigation/action targets; persistent access | Same semantic names, visible focus and pointer feedback | A target is reachable without hover; actual native target requirements remain platform work |

The width control requests 480–1280px; the available browser width caps the rendered frame. The note below the frame reports its actual outer width. Layout decisions use the inner viewport's width, so borders and phone-frame padding are excluded. Narrow desktop collapses the left labels at 760px; its chat list disappears below 930px. These prototype thresholds are proposals, not changes to the existing application's breakpoints.

## State and accessibility checks

| Check | How to exercise | Expected behavior |
| --- | --- | --- |
| Loading | Select **Завантаження** on any screen | Explicit busy state with static skeletons; select Content to exit this inspection preset |
| Feed failure | Select **Помилка / повторити**, then **Повторити** | Error is separate from empty content; retry restores the example feed |
| Profile unavailable | Select **Порожньо** in Profile | Unavailable copy with a route back to the feed |
| Empty conversation | Select **Порожньо** in Chat | First-message guidance; its action restores the sample conversation/composer |
| Failed message | In Chat, type a draft, then select **Помилка / повторити** | A failed bubble appears, text is retained, and bubble-level retry changes its status to sent |
| Keyboard/insets | In Chat on either phone, toggle keyboard and safe areas; press simulated keys | The message area shrinks while the composer remains above the keyboard; keys edit the draft; **Готово** hides the keyboard |
| Resizing | Select Desktop and vary width; inspect all three screens | Feed stays capped, profile controls fit, navigation collapses, and chat switches between list/detail and detail only |
| Keyboard access | Tab/Shift+Tab through actions; open menu and use arrows/Home/End/Escape; open dialog and press Escape | Visible focus; named actions; menu dismissal/focus return; modal browser focus containment and return |
| Action scroll retention | Scroll Feed/Profile down; like/unlike, save/unsave (including the menu), follow/unfollow | Button/count updates; pane and outer-page scroll stay in place; menu focus returns to its trigger |
| Text safety | Send text containing `<`, `&`, quotes and emoji | Text is rendered as content, never parsed as HTML |

## Limits and handoff

The HTML demonstrates local transitions, not networking, optimistic cache updates, authentication, native navigation gestures, virtual keyboards, delivery/read acknowledgements, media permissions, screen-reader certification or OS accessibility APIs. Sent status is simulated; the initial “read” example is static. Failed-message retry deliberately succeeds locally. Loading is a manually selected inspection state. Insets and keyboard size do not measure a physical device. Native gesture/IME behavior, enlarged text, VoiceOver/TalkBack, display scaling, OS titlebar hit regions and real offline retry need testing in the chosen runtime.

The prototype's native HTML dialog/popover demonstrate interaction intent, not a replacement for the project's React components. Reuse existing controls and behavior described in the [component usage guide](component-usage.md), then verify implementation through the [reference scenarios](scenarios.md) and the owning platform checks. Keep these adaptation decisions separate from current implementation status in [platforms](platforms.md#implementation-status).
