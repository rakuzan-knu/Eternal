# Light application appearance: implementation specification

Status: **draft palette and rollout contract**, separate from existing light chat presets. The global Light menu remains unavailable until a complete application-theme implementation passes the criteria below. Native scaffold colors and a white Storybook background do not establish application parity.

## Proposed semantic palette

These HEX values are proposed light-UI tokens, not aliases currently exported by `designTokens` and not replacements for user-created chat/media palettes.

| Role               | Proposed value | Use                                        |
| ------------------ | -------------- | ------------------------------------------ |
| Application canvas | `#fafafa`      | Main background                            |
| Surface            | `#ffffff`      | Cards and dialogs                          |
| Subtle surface     | `#f5f5f5`      | Secondary controls/rows                    |
| Primary text       | `#171717`      | Headings and body                          |
| Secondary text     | `#525252`      | Descriptions and metadata                  |
| Muted text         | `#737373`      | Nonessential hints; verify each background |
| Control border     | `#737373`      | Boundaries that must be distinguishable    |
| Decorative divider | `#e5e5e5`      | Nonessential separators                    |
| Primary action     | `#5822B4`      | Eternal Purple button                      |
| On-primary         | `#ffffff`      | Text/icons on the primary action           |
| Focus              | `#7c3aed`      | Visible focus outline                      |
| Error              | `#b91c1c`      | Error text/state                           |
| Success            | `#166534`      | Success text/state                         |
| Warning            | `#92400e`      | Warning text/state                         |

Retain indigo/purple/pink brand assets. Translucent glass needs separate light compositing/shadow recipes instead of simply changing black to white. Text, icons, input placeholder/error, selected tabs, disabled controls, links and status badges all need light-specific review. Contrast should be checked on the rendered composite; a palette table alone does not prove compliance.

## Component and feature contract

For each shared primitive define normal, hover, focused, pressed, disabled, selected and pending behavior in both appearances. Preserve readable focus outlines and distinguish selection without depending only on color. Media overlays may remain dark when content requires it; document that intentional surface choice. Light chat backgrounds and outgoing/incoming bubble contrast remain independently configurable.

Audit shell/sidebar, feed/post/comment, profile/showcase/settings, search/notifications, messenger/calls, music/player, stories/reels, authentication and public pages. Public brand sections and artwork need intentional theme decisions, not a global color inversion. Replace hard-coded UI colors with semantic references only after reviewing the consuming recipe.

## Rollout and compatibility

The repository has web `useThemeStore` (`eternal-theme`) and shared UI theme state used by the native scaffold. Choose one authoritative appearance state and migration behavior before connecting the selector. Preserve stored values and decide explicitly how system preference, user override, initial paint, logout and multiple windows interact. Do not change persisted chat-theme or story IDs as part of application appearance.

Implement one vertical slice (shell + shared controls + feed) with reviewed dark/light stories and snapshots, then cover remaining surfaces. Enable the Light selector only after the complete audit passes. A system-following option should react to OS changes only while the user has selected system behavior.

## Acceptance before enabling Light

- All shared controls and affected routes have loading/error/empty/disabled/selected variants in light appearance.
- Text, focus, borders and semantic states are checked on actual backgrounds, including glass and artwork-driven player surfaces.
- 320px and 200% text-size scenarios fit; keyboard/screen-reader interaction is unchanged.
- Dark appearance and custom chat/story content pass regression checks.
- Initial paint, persistence, reload, system preference and multiwindow updates have explicit tests.
- Platform deviations and remaining media-dark surfaces are recorded in this reference.
