# Eternal design reference

This reference records the design implemented in `apps/web` on 2026-10-03. Use it when extending the web client or implementing the mobile and desktop clients. It combines the existing visual language, shared foundation tokens, executable component examples and platform acceptance criteria.

## Start here

| Reference                                           | Contents                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [Foundations](foundations.md)                       | Brand, colors, typography, spacing, radii, borders, glass, shadows, icons and assets                                       |
| [Components](components.md)                         | Controls, cards, dialogs, menus, feedback, content rendering and component states                                          |
| [Screens and layouts](screens.md)                   | Navigation, feed, profile, search, notifications, chat, stories, reels, music, authentication and public pages             |
| [Chat and story customization](customization.md)    | Exact theme defaults, presets, fonts, bubble shapes, text effects, drawing and filters                                     |
| [Motion and accessibility](motion-accessibility.md) | Timings, animation behavior, scrollbars, interaction and verification requirements                                         |
| [Platform adaptation](platforms.md)                 | What to preserve and how to adapt for web, mobile and desktop                                                              |
| [Shared tokens](tokens.md)                          | Typed values, generated CSS, native units, consumers and maintenance                                                       |
| [Screen scenarios](scenarios.md)                    | Screen/state matrix, responsive review and local screenshot tests                                                          |
| [Actual screen captures](screen-captures.md)        | Feed/Profile/Chat at desktop, narrow and enlarged text, including empty/error states                                       |
| [Readability audit](readability.md)                 | Measured contrast, target sizes, responsive fixes, reports and release limits                                              |
| [Font policy](font-policy.md)                       | Shared system stacks, Cyrillic/emoji, decorative font fallback and platform checks                                         |
| [Component usage](component-usage.md)               | Correct/incorrect examples, component selection and state contracts                                                        |
| [Component portability](component-portability.md)   | Component/action readiness, actual token consumers, platform adaptations and continuity evidence                           |
| [Design decisions](design-decisions.md)             | Stable decision IDs, implemented/proposed/experimental scope, rationale, tradeoffs and change triggers                     |
| [Interactive prototypes](prototypes.md)             | Offline mobile/desktop Feed → Profile → Chat flows, keyboard/safe-area simulation and review scenarios                     |
| [Light appearance specification](light-theme.md)    | Proposed roles, migration and acceptance criteria; global light appearance remains inactive                                |
| [Source inventory](web-design-inventory.json)       | Searchable snapshot of literal colors, class expressions, inline presentation, motion, theme catalogs, CSS and asset paths |

## Evidence and boundaries

Additional implementation and review guides: [theme readability](theme-readability.md), [interface writing/localization](ui-writing.md), [platform validation and iPhone 11 session](platform-validation.md), [visual effect performance](visual-performance.md), and [extended screen coverage](extended-screens.md).

The implementation is the authority. Every guide links to the files defining the behavior. Repeated foundations now have a typed [token API](tokens.md) and generated CSS variables imported by the web client. Adoption is incremental: most feature recipes remain Tailwind utilities, inline styles and feature-local configuration. Documentation roles outside the exported catalog are not automatically available as tokens.

Three related visual families coexist:

1. **Application UI:** near-black surfaces, white text, subtle borders, rounded controls, purple interaction accents and glass overlays.
2. **Public/brand UI:** purple-black canvas, large heavy uppercase typography, generous spacing, colorful illustrations and indigo/purple/pink gradients.
3. **User-created media:** configurable chat backgrounds and bubbles, decorative fonts, text effects, story layers, gradients, filters and shaders. These settings do not define the global UI theme.

Global appearance currently defaults to dark. The light appearance menu is marked “Soon” and is inactive in [ThemeSubmenu](../../apps/web/src/widgets/sidebar/ui/ThemeSubmenu.tsx). Light chat presets are available independently. A light Storybook background is a preview option, not proof of a complete light application theme.

The mobile app is an Expo/React Native scaffold in [App.tsx](../../apps/mobile/App.tsx). Desktop is under evaluation in [its README](../../apps/desktop/README.md). Platform adaptation guidance is explicitly a future implementation contract, not a claim that those clients already match web.

## Using the source inventory

The checked-in JSON complements the readable guides with the long tail of screen-specific values. It records source paths and one-based source lines, so a developer can locate a recipe without guessing which similar shade or radius was intended. Search by a component path, utility class, HEX/RGB color or exported catalog name.

Regenerate from the repository root with installed workspace dependencies:

```sh
pnpm design:generate
pnpm design:check
pnpm test:design-docs
```

The generator uses TypeScript syntax trees without executing application code. It scans runtime web source, `index.html`, the PWA manifest and the Storybook preview; tests, mocks and stories are excluded from design extraction, while story filenames are indexed for visual review. Public images, icons, fonts, videos and sounds are listed as assets; HTML/manifest icon references are separately checked in `declaredAssets`, including absent files. Tailwind defaults come from the installed version, which must match `pnpm-lock.yaml`.

This is a **source snapshot**, not computed browser CSS or a portable native component library. Class expressions can contain runtime conditions, spreads or variables. Literal colors may be illustrative data, SVG artwork, generated content or comments rather than semantic UI tokens. Inherited/browser styles, remote media, generated shader output, user-uploaded palettes and native font metrics need verification at rendering time. Do not treat every extracted value as a reusable global token.

## Keeping it current

When a visual change lands, update the affected guide and regenerate the inventory and CSS in the same change. Preserve component variants and state behavior rather than merging superficially similar values. Verify real content, narrow and wide layouts, keyboard navigation, reduced motion, loading/error/empty states and media overlays using the [review checklist](platforms.md#acceptance-checklist). The [scenario matrix](scenarios.md) separates current executable reference coverage from feature acceptance criteria. CI rejects stale generated files, broken local links/headings and missing declared assets, and runs the local screenshot suite for frontend changes.
