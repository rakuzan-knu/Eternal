# Eternal interaction contract

## Community notification preferences

Every active member controls their own server alerts (all messages, personal mentions or none) and temporary server mute. Channels inherit that preference unless the member selects an override. Existing conversation mute remains an independent veto; expiry is evaluated when an alert arrives. Preferences affect message toasts and sounds, including reactions, rather than delivery, history or unread counts. Calls keep their existing mute controls.

Notification settings reuse the community Modal, Select and control styles. Save waits for a validated server response; errors retain drafts, scope changes and dismissal confirm discarding unsaved changes. Personal preference events and reconnect/resync invalidate verified settings before a subsequent alert. Unavailable current settings suppress the alert. Unread badges use the existing server conversation projection and reconcile on message/read/delete/clear/reconnect events, including channels absent from loaded conversation pages.

Personal @username mentions resolve only known authorized conversation participants, with bounded explicit IDs validated by the server. The same IDs and encrypted envelope survive offline retry; forwards do not copy mention metadata into a different conversation. This feature provides in-app alerts; offline operating-system push delivery is not implemented.

## Scope and ownership

This contract records the community workspace and its reused chat boundaries. Existing application behavior outside these surfaces remains owned by its feature and maintained docs/design guides.

- Visual identity: runtime `apps/web/src/index.css` and `useThemeStore`; typed foundation tokens remain generated through the existing design scripts.
- Community domain reads/mutations: `features/communities`, using shared response contracts and central query keys.
- Chat and delivery: existing `features/chat` / `entities/chat`. Community pages may embed CommunityConversation; they must not duplicate message transport, draft stores or call providers.
- Modal, focus trap and focus return: shared Modal. Single-select: existing shared Select.

## Navigation and scroll

Discovery is a document-scrolling application list. Authenticated server detail is an explicit bounded communication workspace. The global destinations remain available. Desktop retains server/channel context. Small screens show navigation or an active detail; a named back action restores channel navigation and focus. Member/about detail owns an operable scroll region. Music dock space remains reserved.

The selected channel is route-backed. Members/about view is query-backed. Only membership-scoped channel IDs may resolve a conversation. An unknown channel shows recovery without fetching arbitrary IDs. Losing membership or role hides protected data and administrator dialogs; cached success must not keep privileges alive after an error.

## Async behavior

Reads distinguish loading, no results, unavailable access and transport failure. Invalid HTTP response shapes are errors, including old cached shapes. Mutation success is acknowledged only after a valid server response. Failures preserve entered values. Existing confirmed per-recipient delivery and stable retry IDs remain authoritative.

Search uses 300ms debounce for remote queries, ignores IME composition, cancels obsolete requests and restores committed URL state. Local channel filtering is immediate and does not mutate membership. Clear returns focus to its input.

## Safety and feedback

Owner/admin/member authorization remains server-enforced. Dangerous membership actions use existing named confirmation dialogs and focus the safe action first. Invite credentials are not telemetry, title, offline-cache or permanent-storage values. A pasted invitation navigates only to an internal preview; accepting membership is a distinct action.

## Accessibility and customization

Actions use buttons, routes use links, navigation exposes its current destination, search controls have names and errors use live semantics. Focus is visible, restoration is deterministic, and reduced motion is respected. Existing decorative themes, media and profile personalization remain available and may not obscure controls. No inferred age, legal or billing policy is added.

## Channel organization

Categories organize navigation and grant no additional access. Active owners/admins edit a complete channel layout in the existing shared Modal; arrows provide keyboard/touch ordering without drag dependence. Save applies category names/order, channel assignment/order and channel name/description atomically. Removing a category keeps every channel and message. Unsaved dismissal asks before discarding; errors and revision conflicts preserve the draft. Conflict recovery closes/discards explicitly, reloads community data and reopens management. Server revisions reject concurrent overwrites, including channel creation by older clients. New clients read older flat responses but disable management when no revision is supplied. Shared/backend contract copies must remain identical.

The existing transactional community outbox and conversation/community query invalidation own update propagation. Channel and Conversation metadata change together; route and conversation IDs stay stable. Archive/delete and private permissions remain separate domain work.

## Route document title policy

Community detail uses community name; channel detail adds channel name and Eternal. Invite titles remain generic and exclude bearer tokens. Unauthorized/error state must not mount private conversation data. Existing SEOHead owns updates.

## Verification

Unit tests cover membership and cached-data boundaries, discovery search, navigation and draft-compatible chat reuse. Browser tests cover desktop/mobile, route back, layout overflow, message surface and protected deep links. Isolated database and live two-account tests are required before publication; UI fixtures do not establish those guarantees.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | No table selection in this workspace | Existing member action model | Single named member actions only | CommunityPage tests |
| Select/Listbox | shared/ui/Select | Existing authored listbox implementation | Existing invite expiry options | Select and invitation browser tests |
| Date | Locale formatting, no new date input | shared/lib/language/locale | Existing chat calendar retained | Existing chat calendar tests |
| Form | Existing schemas + app-owned noValidate forms | shared contracts and community dialogs | Create/edit/channel/join invitation | Dialog and API boundary tests |
| Scrollbar | index.css global baseline | Existing CSS/theme runtime | Bounded channel/history and members detail | Workspace browser tests |
| Toast | Existing feature feedback stores | Existing chat/Reels mutation owners | Inline error for recovery; dialog validation | Existing sender and dialog tests |
| CRUD | features/communities + shared Modal | Authenticated backend contracts | Existing owner/admin/member rules | Community and conversation boundary tests |

## Channel archive lifecycle — 22 October 2026

Global channel archive is separate from personal conversation folders. Active members retain history, attachments, pinned-message reads, search/calendar and mark-read. Existing unread is retained until read; archive does not manufacture reads or reset badges. Archive prevents new messages/forwards, edits, new reactions/pins, new DB calls, typing start and live mesh/soundboard/watch-together signaling. Existing personal deletion, authorized moderation deletion, reaction removal and unpin remain available. Restoring resumes publication with the same conversation/channel IDs and history. Hard deletion is not implemented.

Only active OWNER/ADMIN can archive or restore, using the current layout revision and an explicit app-owned confirmation. The server scopes the channel to its community; archive/restore shares membership locks and transactional outbox with other community writes, increments revision and invalidates existing channel/conversation caches. Publication rechecks archive inside the same transaction after participant locks, so send/edit/react/pin/call cannot race past a committed archive. An active persisted Call must end before archive. Existing mesh transport has no Call row: current web clients leave its room and stop tracks/peer connections when refreshed archive state arrives; denied/late microphone joins are cleaned up. This client cleanup is not a guarantee that an old/offline/malicious P2P client has stopped capturing audio.

Archive UI reuses Manage channels, shared Modal and the existing control styles. Layout drafts must be saved before archive/restore. A nested confirmation focuses Cancel, prevents duplicate submission, retains errors and closes management only after a validated acknowledgement. Archived channels remain listed in a separate navigation group and deep links stay valid; the shared ChatThread replaces its composer with archive status, disables calls and publication actions while preserving reading/forwarding-out/deletion/reporting.


## Private channel access and media

CommunityManagement and CommunityChannelAccessDialog own create/edit; shared Modal owns focus, Escape/discard and confirmation. Member search is transient sensitive dialog state, with IME-aware debounce, clear and server cursor paging; it does not change the workspace URL. Permissions are enforced on the server regardless of visibility of controls. Apply access changes follows an explicit consequence review and freezes the original revision; 409 preserves the draft and requires fresh management state before retry.

Private media resolve at presentation/download boundaries via shared/lib/privateMedia and privateMediaView. Show loading, recoverable denied/error and Retry attachment. Do not persist a signed GET. Media errors refresh once; playback does not restart on a repeating refresh timer. Explicit forwarding to another conversation exports a copy authorized by that conversation's membership. Historical public media requires a separate migration before privacy conversion.
