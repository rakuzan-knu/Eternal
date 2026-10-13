# Motion, interaction and accessibility

## Motion vocabulary

[Global CSS](../../apps/web/src/index.css) defines the following named animations. Values below use the **last declaration** where names are repeated. Framer Motion and component-local animation values also exist; see inventory `presentation` entries for `initial/animate/exit/transition/whileHover/whileTap` rather than treating this table as the only motion source.

| Class / effect               | Duration / curve                                | Behavior                                                           |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `skeleton-shimmer`           | 1.6s ease-in-out, infinite                      | Background150%→-50%, white4/9/4%                                   |
| `animate-fadeIn`             | 150ms ease-out                                  | Opacity0→1, scale.96→1                                             |
| `animate-menuIn`             | 150ms cubic-bezier(.16,1,.3,1)                  | Opacity0→1, scale.9→1, y4→0px                                      |
| `animate-popIn`              | 280ms cubic-bezier(.34,1.56,.64,1)              | Scale.3→1.15→1 with fade                                           |
| `animate-modalPop`           | 200ms cubic-bezier(.16,1,.3,1)                  | Opacity0→1, scale.92→1, y6→0px                                     |
| `animate-fadeInOverlay`      | 220ms ease-out                                  | Fade0→1                                                            |
| `animate-slideInRight/Left`  | 220ms cubic-bezier(.16,1,.3,1)                  | Fade in, x±24→0px                                                  |
| `animate-slideOutRight/Left` | 180ms cubic-bezier(.4,0,1,1), forwards          | Fade out, x0→±24px                                                 |
| `animate-slideUp`            | 220ms cubic-bezier(.34,1.56,.64,1)              | Fade in, y6→0px                                                    |
| `animate-shake`              | 400ms cubic-bezier(.36,.07,.19,.97)             | Alternating horizontal offsets up to5px                            |
| `animate-badgeExpand`        | 260ms cubic-bezier(.16,1,.3,1), delay90ms, both | Fade/scale.6→1, x6→0px                                             |
| `animate-badgeCollapse`      | 220ms same curve, delay60ms, both               | Fade/scale.5→1; despite its name, keyframes increase opacity/scale |
| `animate-reactionBounce`     | 350ms cubic-bezier(.34,1.56,.64,1)              | Scale1→1.35→.92→1                                                  |
| `animate-typingDot`          | 1.2s ease-in-out, infinite                      | y0→-4px, opacity.5→1                                               |
| `animate-jumpHighlight`      | 1.5s ease-out                                   | Purple background/glow fades away                                  |
| `animate-dateJumpPulse`      | 1.2s cubic-bezier(.16,1,.3,1), forwards         | Date badge scale up to1.06 with purple border/glow                 |
| `animate-equalizerBar`       | .8s ease-in-out, infinite                       | Height4→16px                                                       |
| `animate-gummy-squish`       | 2.4s ease-in-out, infinite                      | Small anisotropic stretch, origin center bottom                    |
| `animate-prisma-flow`        | 4s linear, infinite                             | Background position0→200%, background size200%                     |
| `animate-neon-flow`          | 4.5s linear, infinite                           | Stroke dash offset100→0                                            |
| `animate-cloud-wave`         | 5s linear, infinite                             | x0→-50%                                                            |
| `animate-halo-float`         | 2.8s ease-in-out, infinite                      | y0→-3px, rotation-6→-4deg                                          |
| `animate-terminal-cursor`    | .85s, infinite                                  | On/off opacity blink                                               |

Global CSS also contains `liveEqualizer` keyframes (scaleY.25→1) and `marquee-ticker` (horizontal movement from `--marquee-dist`, fallback40px). They are keyframes, not necessarily one fixed reusable duration/class. Read the owning player/text component for timing and activation.

Story layer animation classes:

| Class                   | Duration / behavior                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `story-anim-float`      | 3s ease-in-out infinite, y0→-8px                                                         |
| `story-anim-bounce`     | 1.8s cubic-bezier(.34,1.56,.64,1) infinite; scale1→1.08→.96→1 and small vertical offsets |
| `story-anim-glow`       | 2.2s ease-in-out infinite; white glow6px to purple20px/pink35px                          |
| `story-anim-wave`       | 2.8s ease-in-out infinite; rotation±2deg and y-2px                                       |
| `story-anim-typewriter` | .8s step-end infinite; 2px currentColor cursor border blinks                             |

General Tailwind transitions inherit150ms and cubic-bezier(.4,0,.2,1) unless overridden. Controls commonly use150–200ms, cards/shells200–300ms. Existing press scales vary (.99 buttons, .98 menus/profile controls, .95 public cards, .9 reel actions); preserve context rather than imposing one value.

The stylesheet repeats `.animate-slideInRight`/`slideInRight` and `.animate-shake`/`shake`; earlier fullscreen260ms slide and350ms shake are superseded by the later220ms/24px slide and400ms shake. A port copying the first occurrence would produce different behavior.

## Theme changes, media and haptics

[Theme ripple](../../apps/web/src/features/chat/lib/themeRippleTransition.ts) expands a circular clip from the interaction point through the View Transitions API when supported,600ms cubic-bezier(.22,1,.36,1); fallback uses an overlay/ripple. Its overlay uses z9999. The ripple attempts vibration `[15,40,15]`; [themeUtils](../../apps/web/src/features/chat/lib/themeUtils.ts) also offers a6ms default haptic. Both gracefully tolerate unavailable vibration. Native ports should map these to platform feedback rather than assume browser vibration works.

Story viewer Framer transitions use.32/.28s and easing `[.32,.72,0,1]`. ProgressiveImage transitions400ms and reel blurhash700ms are media readiness behavior, not generic menu timing. Scroll/seek/progress/recording and canvas particles should remain coupled to actual media state. Pause story timing during interactions that currently pause playback.

## Layering and scroll behavior

| Layer                                                   | Existing z-index examples |
| ------------------------------------------------------- | ------------------------- |
| Settings host panel                                     | 40                        |
| Sidebar, some drawers/offline banner                    | 50                        |
| Shared modal / standalone settings panel                | 300 / 310                 |
| Shared menu / submenu                                   | 1000 / 1010               |
| Tooltip, mini-profile, story/reel editors, theme ripple | 9999                      |

Shared overlay defaults use exported layer tokens, but feature overlays do not all use them. DOM stacking contexts, portals, transformed parents and separate PiP windows affect rendering order. Verify overlapping player/menu/dialog/media states rather than assuming a larger number always fixes layering.

Global scrollbars are thin with a transparent track: WebKit6px, white14% thumb, white45% hover/active, capsule corners,200ms transition. `.custom-scrollbar` is5px with overscroll containment; `.tabs-scrollbar` is3px with white25%→50% hover. `.no-scrollbar` hides the scrollbar. Emoji picker overrides use white15%→25% and6px width. Firefox uses its thin scrollbar rendering rather than the exact WebKit pixels.

`html` uses stable scrollbar gutter. Game mode/fullscreen removes gutter, hides overflow/scrollbars and sets `#08090d`. Body/overlay scroll-lock ownership matters; nested dialogs should restore the previous scroll state on close. Avoid carrying fullscreen rules into normal native scroll views.

## Accessibility: existing behavior and gaps

Global CSS now respects `prefers-reduced-motion: reduce`: animation/transition durations become 0.01ms, iteration count 1, delays 0 and scroll behavior automatic. [main.tsx](../../apps/web/src/main.tsx) wraps the app in Framer Motion `MotionConfig reducedMotion="user"`, which suppresses transform/layout animation; opacity/color transitions may still run. Theme ripple applies immediately without vibration. The [procedural chat background](../../apps/web/src/features/chat/ui/ProceduralChatBackground.tsx) renders a static frame, disables parallax/audio reactivity and the animation loop, and responds to live preference changes. Other custom canvas/WebGL/media renderers still need individual review. These changes and tests are not an accessibility certification.

| Boundary             | Current observation                                                                                                      | Reuse requirement                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Modal                | Named dialog, focus trap/return, React autoFocus support, nested stack and owned portals; topmost Escape/outside-click   | Give dialogs names, manage initial focus and focus return, prevent background interaction and support keyboard/back dismissal |
| Input                | Generated/supplied ID connects label; error exposes invalid state and description; existing description IDs are retained | Associate labels/errors, expose invalid state and retain readable focus indication                                            |
| Tooltip              | Hover/focus description, Escape dismissal and hoverable tooltip content                                                  | Provide keyboard focus access/description; on touch expose essential information without hover                                |
| Radio/tabs           | Radiogroup/tab semantics and roving arrow/Home/End selection; real profile panel association                             | Apply matching role/selected/checked semantics and keyboard pattern or use native controls                                    |
| Dropdown             | Menu roles, keyboard selection/typeahead, nested Right/Left navigation and focus return                                  | Ensure keyboard access, disabled-state semantics, focus management and viewport collision handling                            |
| Toggle/Select        | Switch/combobox semantics already present                                                                                | Preserve checked/selected state and accessible labels across platforms                                                        |
| Images/media         | Alt/placeholder support varies by caller; some failure paths have no replacement                                         | Meaningful alternative text, recoverable failures, explicit playback/permission state and accessible controls                 |
| Custom themes        | Luminance heuristic chooses text; translucent and gradient backgrounds remain variable                                   | Measure rendered contrast for text/icons/states; offer readable fallback for extreme user choices                             |
| Offline notification | Polite live status and Retry                                                                                             | Preserve status announcement without stealing focus                                                                           |

Required future checks: keyboard-only traversal, screen-reader names/state, visible focus, touch target size, text scaling/zoom, long/translated content, color-independent status, reduced motion, media captions and safe-area behavior. These are adaptation/review requirements; they are not all implemented by today's shared primitives.

## Existing verification surfaces

[Storybook preview](../../apps/web/.storybook/preview.tsx) imports global CSS and uses dark `#0b0b0c`/light `#ffffff` preview backgrounds with color-contrast checking enabled. It decorates stories with query/router providers. It uses the app Tailwind pipeline and reduced-motion policy, viewport presets and a 100/150/200% text-size toolbar. [Design/Reference](../../apps/web/src/shared/ui/DesignReference.stories.tsx) demonstrates shared controls and feedback/overlay states; inspect the other indexed stories for feature-specific variants.

Repository commands: `pnpm --dir apps/web storybook`, `pnpm --dir apps/web build:storybook`, `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e`, and `pnpm --dir apps/web test:design`. See [scenarios](scenarios.md#executable-reference-coverage) for the local screenshot workflow and CI environment. Shared control/caller tests cover associations, keyboard selection, focus trapping/return, nested overlays and React autofocus; shader/ripple tests cover reduced-motion behavior. `test:visual` remains the existing optional Chromatic integration. Screen-reader/native device checks and all feature states are not covered by these automated checks.
