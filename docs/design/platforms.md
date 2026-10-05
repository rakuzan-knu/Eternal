# Reusing the design across platforms

## Implementation status

Web is the visual reference. [Mobile](../../apps/mobile/App.tsx) contains an Expo/React Native scaffold and now consumes shared foundation values for its canvas, text and spacing; [desktop](../../apps/desktop/README.md) is under runtime evaluation. The [shared UI primitives package](../../packages/shared/ui-primitives/src/index.ts) exports typed design tokens, interfaces and an avatar fallback helper. It is not a styled cross-platform component library.

The following is guidance for future implementations, not an assertion that platform parity already exists. The [token contract](tokens.md) is available now; native components and feature screens still require implementation. This work does not select a desktop runtime or add native dependencies.

## What to preserve

Preserve Eternal identity/assets, semantic color roles, text hierarchy, content aspect ratios, incoming/outgoing distinction, delivery/read states, selected/error/disabled treatment, action priority and the relationship between background, glass surface and readable content. Preserve stable saved-theme and story layer IDs, normalized coordinates and user settings. Match essential behavior before decorative effects.

Carry source values with their units and context. `px` geometry, rem-based web defaults, native logical points, percentage positions and viewport/container units are different representations. Do not scale every measurement by device pixel density. Resolve CSS logical units to native layout units intentionally, and keep typography responsive to user text-size settings.

## Adaptation matrix

| Concern           | Web                                                               | Mobile implementation guidance                                                                                                   | Desktop implementation guidance                                                           |
| ----------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Typography        | System Tailwind stack; optional decorative fonts loaded on demand | Use platform system fonts for UI; bundle/load chosen decorative families with fallback and verify Cyrillic/emoji/weights/metrics | Verify OS/webview system fonts; package optional fonts if offline fidelity is required    |
| Color             | Literal HEX/RGBA plus Tailwind OKLCH colors                       | Translate actual colors into supported native space; preserve alpha and test compositing                                         | Reuse web styles in a web-based shell; verify gamut and webview color support             |
| Glass/shadows     | Backdrop blur, alpha surfaces, multilayer shadows                 | Match appearance with supported blur/shadow APIs; opaque fallback on unsupported/low-performance modes                           | Verify rendering/performance and transparent-window limits in the selected runtime        |
| Navigation        | Floating/collapsible sidebar and wide multi-panel views           | Use reachable tabs/stack/detail navigation; avoid desktop left padding and hover-only navigation                                 | Keep collapsible navigation, resize behavior, pointer and keyboard access                 |
| Chat/music panels | Resizable panels with pixel bounds                                | Full-width screens or sheets according to available space                                                                        | Retain explicit min/max widths, drag affordances and no animation while resizing          |
| Overlays          | Portals, local z-indices, viewport collision                      | Use native modal/sheet/navigation conventions; safe areas and system Back                                                        | Manage window focus, Escape, portal stacking and separate PiP windows                     |
| Controls          | Pointer hover, keyboard focus, compact icon controls              | Persistent access to actions, appropriate platform hit areas; press feedback                                                     | Pointer hover plus visible keyboard focus; shortcuts only where implemented intentionally |
| Media             | HTML media, blurhash/canvas, autoplay policies                    | Adapt media/permission lifecycle and interruptions; preserve aspect/crop/captions                                                | Adapt device/screen-share permissions and window/media lifecycle                          |
| Motion            | CSS/Framer/canvas/WebGL and browser ripple                        | Map timings/curves intentionally, reduced motion and readable static fallbacks                                                   | Verify animation API availability in the runtime, reduced motion and performance          |
| Haptics           | Best-effort navigator vibration                                   | Platform feedback when supported and allowed                                                                                     | Optional; interaction must remain understandable without vibration                        |
| Scroll            | Thin custom bars, hidden scrollbar in immersive views             | Native scrolling/insets/overscroll and keyboard avoidance                                                                        | Keep visible scroll affordance and wheel/keyboard behavior                                |
| App chrome        | PWA colors/icons and dynamic chat theme-color                     | Match status/navigation bars to active surfaces with safe-area contrast                                                          | Respect OS titlebar/control regions and minimum window sizes                              |

## Layout adaptation rules

Use web breakpoints as evidence of when content reorganizes, not as hard-coded native device categories. Choose layout based on available width and input capability. A phone, tablet split view and narrow desktop window may require the same single-column arrangement.

Feed cards retain hierarchy and readable width rather than filling every wide screen. Profiles retain banner/avatar overlap without clipping controls. Chat selects list/detail presentation where both panels cannot fit. Music grids reduce columns and make hover-revealed play actions available to touch. Public reading layouts collapse their sticky contents/sidebar into usable narrow navigation. Story/reel media keeps9:16 content coordinates and separates display cropping from editor/export coordinates.

Account for safe areas, keyboard, dynamic viewport and bottom-player reservations together. Current App uses56/112px player padding; treat those as web dock dimensions, not universal native insets. Keep entry/close/Back behavior consistent across nested editors/settings/dialogs, including unsaved changes and confirmation flows.

## Token and component handoff

For a new screen:

1. Find the closest existing screen/component in [screens](screens.md) and [components](components.md).
2. Retrieve its source recipe from the inventory and follow references for dynamic styles.
3. Identify the semantic role, exact color representation, opacity, font fallback, spacing/radius and states.
4. Translate only platform-specific rendering/layout; preserve persisted content/theme contracts.
5. Verify affected states and document any intentional deviation.

Extend the shared token layer from repeated verified recipes rather than every literal in the inventory. Read [tokens](tokens.md) for units and web-only recipes. Additional roles such as warning and success should be reviewed against actual consumers before export. Keep brand palette, general UI palette and user-content palettes separate. Do not silently replace feature-specific purples, avatar sizes or bubble geometry with one global constant.

## Acceptance checklist

- Compare default, selected, focused, pressed, disabled and pending controls against the web recipe.
- Verify loading, empty, error/retry, unavailable and content-rich states; do not substitute an empty state for a failed request.
- Verify narrow/wide layout, long names/messages, translated text, enlarged system text and keyboard/safe-area changes.
- Verify dialogs, menus, drawers, player dock, tooltip and immersive media together for stacking and scroll/focus restoration.
- Verify custom light/dark bubbles, image/shader wallpapers and decorative fonts with readable text, timestamp, links, emoji and replies.
- Verify keyboard/screen-reader behavior, touch access, reduced motion and media permission/playback failures.
- Verify bundled assets/icons/fonts work offline and do not depend on unrecorded external font availability.
- Record actual tests/render checks and deviations; do not claim native parity from a source inventory alone.

## Validation

`pnpm design:check` verifies deterministic CSS/inventory generation, local links/headings, declared assets and locked Tailwind versions. `pnpm test:design-docs` checks validator behavior. Runtime changes also require the owning platform's lint/typecheck/tests/build and inspection of affected rendered states. The [screenshot suite](scenarios.md#executable-reference-coverage) exercises shared web compositions; neither a source inventory nor passing web tests proves native parity.
