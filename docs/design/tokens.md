# Shared design tokens

The typed source is [tokens.ts](../../packages/shared/ui-primitives/src/tokens.ts), exported as `designTokens` from `@social-network/shared-ui-primitives`. [generate-tokens.mjs](../../scripts/design/generate-tokens.mjs) creates [tokens.css](../../apps/web/src/shared/design/tokens.css), imported by [index.css](../../apps/web/src/index.css). Edit the typed source, then run `pnpm design:generate`; do not edit generated CSS by hand.

## Catalog and units

| Group                   | Values / contract                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`                 | Purple `#5822B4`, glow `#A855F7`, void `#07050F`, black `#000000`                                                                                         |
| `color`                 | Body `#050505`, app `#070709`, immersive `#08090d`, primary text `#ffffff`, inverse text `#000000`                                                        |
| `spacing`               | half/xs/sm/md/control/lg/xl/xxl/section = 2/4/8/12/14/16/20/24/32 logical units                                                                           |
| `radius`                | sm/md/lg/control/panel/card/presentation = 4/6/8/12/16/24/32 logical units                                                                                |
| `typography.size`       | xs/sm/body/lg/xl/title = 12/14/16/18/20/24                                                                                                                |
| `typography.lineHeight` | xs/sm/body/lg/xl/title = 16/20/24/28/28/32                                                                                                                |
| `typography.weight`     | normal/medium/semibold/bold = 400/500/600/700                                                                                                             |
| `typography.familyWeb`  | Explicit sans/mono/serif browser stacks; native clients leave fontFamily unset ([font policy](font-policy.md))                                             |
| `motion.duration`       | fast/control/panel/ripple = 150/200/300/600ms                                                                                                             |
| `motion.easing`         | standard (.4,0,.2,1), enter (.16,1,.3,1), ripple (.22,1,.36,1) cubic-bezier                                                                               |
| `layer`                 | modal/settings/menu/submenu/tooltip = 300/310/1000/1010/9999                                                                                              |
| `web`                   | Exact Tailwind 4.3.3 OKLCH/alpha recipes for neutral text, control surfaces/borders/hover, error/focus, glass and toggle; blur 24px and shadow-2xl recipe |

Numeric geometry and typography represent logical px/points at a 16px web root. The CSS adapter divides them by 16 and emits `rem`, so text-size changes scale them. Duration becomes `ms`; layer and weight remain unitless; `web.glassBlur` becomes `px`. Nested paths become kebab-case variables: `radius.control` → `--eternal-radius-control`, `typography.lineHeight.body` → `--eternal-typography-line-height-body`.

## Use by platform

The additive `semantic` group names dark application roles: `text.primary/secondary/muted/error`, `surface.canvas/control/overlay/opaque`, `border.control/overlay/focus`, and `action.primary/primaryText/primaryHover/secondaryHover/destructive`. CSS paths follow the same generated naming, e.g. `--eternal-semantic-text-secondary`. Button, Input and GlassCard now consume these roles. The old `color` and browser recipe exports remain available for compatibility; migrate other components when changing them rather than replacing every feature palette at once. RGBA semantic values need platform color parsing/compositing review; CSS utilities remain web-specific.

Web can use generated variables in CSS or Tailwind arbitrary values:

```tsx
<div className="rounded-[var(--eternal-radius-panel)]" />
```

Native code imports numeric/HEX foundation values directly:

```ts
import { designTokens } from '@social-network/shared-ui-primitives';

const surface = {
  backgroundColor: designTokens.color.canvasApp,
  padding: designTokens.spacing.lg,
  borderRadius: designTokens.radius.panel,
};
```

The `web` group is explicitly browser-only: React Native must not consume `color-mix`, CSS OKLCH or CSS shadow strings directly. Convert colors into the target color space and compose alpha against the actual surface, with visual review. Native font scaling, line-height metrics and OS accessibility preferences still require native APIs; do not multiply values by screen pixel density. Desktop can consume CSS in a web shell or translate foundation values after its runtime is chosen.

Current consumers include global body/fullscreen canvases; Button/GlassCard geometry and timing; Input geometry, border/focus/error recipes; Modal, DropdownMenu and Tooltip layers/timing; RadioGroup geometry/timing; theme-ripple timing; and the mobile scaffold's colors/spacing. Remaining feature styles intentionally retain their existing recipes. This is incremental foundation adoption, not a global replacement of every color/class.

## Maintenance

1. Verify a repeated recipe in actual consumers before adding a token. Keep chat/user-content palettes in their owning features.
2. Preserve existing appearance unless the change explicitly includes a redesign. Inspect alpha compositing and OS font differences.
3. Regenerate CSS and the source inventory with `pnpm design:generate`.
4. Run `pnpm design:check`, relevant runtime checks and the affected screenshot comparisons. Review screenshots before updating baselines.

CI checks generation and documentation through [ci.yml](../../.github/workflows/ci.yml). New tokens do not imply a complete light appearance; see the separate [specification](light-theme.md).
