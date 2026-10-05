# Design foundations

## Brand identity

The product name is **Eternal**. Its visual signature is an “E” symbol with a rounded square and an indigo → purple → pink gradient. [Brand data and SVG exports](../../apps/web/src/pages/Brand/data/brandingData.ts) and [BrandIcons](../../apps/web/src/shared/ui/BrandIcons.tsx) define reusable artwork; reuse the relevant asset rather than drawing a new letter/logo.

| Brand swatch      | Exact value                     | Role in the brand page     |
| ----------------- | ------------------------------- | -------------------------- |
| Eternal Purple    | `#5822B4` / `rgb(88, 34, 180)`  | Primary brand color        |
| Light Purple Glow | `#A855F7` / `rgb(168, 85, 247)` | Glow and neon accent       |
| Messenger Void    | `#07050F` / `rgb(7, 5, 15)`     | Purple-black canvas        |
| Pure Black        | `#000000` / `rgb(0, 0, 0)`      | Contrast and black artwork |

The brand swatches do not replace the other purples used in UI. The exported purple logo uses `#6366f1 → #8b5cf6 → #ec4899`, with `#a855f7` for its wordmark. The symbol export uses `#8b5cf6`. Preserve this distinction.

The full exported wordmark has a `320 × 80` viewBox, a `56 × 56` mark at `(12,12)` with `18px` corners, and a system-font wordmark at weight `900`, size `38`, letter spacing `-1px`. Symbol-only exports use `100 × 100`. Rounded app-icon exports use `120 × 120`, a `112 × 112` square inset by `4`, radius `34`; the dark variant is `#120f24` with a `4px #8b5cf6` stroke. Brand-page clearspace copy requires half an “E” around the full logo and one-third of the icon width around the icon; see [clearspace section](../../apps/web/src/pages/Brand/ui/BrandClearspaceSection.tsx).

## Color roles and surface recipes

| Documentation role         | Existing value/recipe                                            | Evidence                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Body/authentication canvas | `#050505`                                                        | [Global CSS](../../apps/web/src/index.css), [login](../../apps/web/src/pages/Login/LoginPage.tsx)                           |
| Application/PWA canvas     | `#070709`                                                        | [App](../../apps/web/src/app/App.tsx), [manifest](../../apps/web/public/manifest.json)                                      |
| Public content canvas      | `#07050f`                                                        | [PrivacyPage](../../apps/web/src/pages/Privacy/PrivacyPage.tsx), [BlogPage](../../apps/web/src/pages/Blog/BlogPage.tsx)     |
| Chat default canvas        | `#0b0b0c`                                                        | [Chat theme](../../apps/web/src/features/chat/model/chatTheme.ts)                                                           |
| Fullscreen/game canvas     | `#08090d`                                                        | [Global CSS](../../apps/web/src/index.css)                                                                                  |
| Chat incoming bubble       | `#12131b`, opacity `0.8`, backdrop blur `16px`                   | [Chat theme](../../apps/web/src/features/chat/model/chatTheme.ts)                                                           |
| Primary text               | `text-white`; public prose also uses `#E0E0E6`                   | App and PrivacyPage                                                                                                         |
| Secondary/muted text       | `text-neutral-300`, `-400`, `-500`; some components use `gray-*` | [Input](../../apps/web/src/shared/ui/Input.tsx), [GlassCard](../../apps/web/src/shared/ui/GlassCard.tsx) and screen sources |
| White primary button       | `bg-white text-black`, hover `bg-neutral-200`                    | [Button](../../apps/web/src/shared/ui/Button.tsx)                                                                           |
| Secondary control          | `bg-neutral-900/80`, `text-neutral-300`, `border-neutral-800`    | Button                                                                                                                      |
| Authentication card        | `bg-neutral-900/50`, border `neutral-800/60`, blur `xl`          | GlassCard                                                                                                                   |
| Public reading card        | `bg-[#0e0a1f]/40`, `border-purple-800/20`, blur `sm`             | PrivacyPage                                                                                                                 |
| Input focus                | `border-purple-500/50`                                           | Input                                                                                                                       |
| Validation error           | `text-red-400`                                                   | Input                                                                                                                       |
| Outgoing chat gradient     | `135deg`, `#9333ea → #6366f1`                                    | Chat theme                                                                                                                  |

Opacity suffixes are part of the recipe: `white/5` is white at 5%, `white/[0.08]` at 8%, and `neutral-900/80` is the named Tailwind color at 80%. Composite translucent colors against their actual backgrounds before evaluating contrast. Avoid substituting a dark solid color for a translucent surface when media/backgrounds can show through.

Named Tailwind colors are defined in **OKLCH**, not the legacy Tailwind HEX palette. The inventory includes exact `tailwindDefaults.variables` from the installed locked version (4.3.3 at extraction). Use those values when translating named colors to native; any sRGB conversion should be explicit and checked visually. Literal `#9333ea` and `purple-600` should not be assumed identical.

Status colors are contextual: red/rose for destructive actions and errors, green/emerald for success/presence, amber/yellow for warnings, blue/cyan for links and service accents. Preserve each component's exact classes from the inventory. For example, the story palette's `#5865f2` is a content choice, not the primary Eternal brand purple.

## Typography

Global `font-sans` uses the explicitly shared system stack, preserving the previously installed Tailwind default:

```text
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
'Noto Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji',
'Segoe UI Symbol', 'Noto Color Emoji'
```

There is no global `@font-face` or globally loaded Inter/“GG Sans” brand font. Chat's stored `default` option is now labeled “Default (System)” and shares the application stack. See the [font policy](font-policy.md) for the platform contract and glyph verification.

Monospace UI/code uses `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`. The serif default is `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`. Decorative chat/story fonts and their load behavior are listed in [customization](customization.md#chat-fonts).

| Utility                    | Size at 16px root | Default line height |
| -------------------------- | ----------------- | ------------------- |
| `text-xs`                  | 12px              | 16px                |
| `text-sm`                  | 14px              | 20px                |
| `text-base`                | 16px              | 24px                |
| `text-lg`                  | 18px              | 28px                |
| `text-xl`                  | 20px              | 28px                |
| `text-2xl`                 | 24px              | 32px                |
| `text-3xl`                 | 30px              | 36px                |
| `text-4xl`                 | 36px              | 40px                |
| `text-5xl`                 | 48px              | 1 × size            |
| `text-6xl`                 | 60px              | 1 × size            |
| `text-7xl` / `8xl` / `9xl` | 72 / 96 / 128px   | 1 × size            |

These are inherited defaults, not a requirement to use every size. Arbitrary sizes such as `text-[10px]`, `text-[11px]` and `text-[13px]` are common for badges and metadata; locate all exceptions in the inventory. Do not promote them to main mobile body text.

Weights: normal `400`, medium `500`, semibold `600`, bold `700`, extrabold `800`, black `900`. App controls use semibold/bold, while public headings frequently use black, uppercase and `tracking-tight` (`-0.025em`). Small labels often use uppercase and `tracking-wider` (`0.05em`) or `tracking-widest` (`0.1em`). Public prose uses relaxed line height (`1.625`); login hero overrides it to `1.1`. Chat font scales and tracking are feature settings, not global typography.

## Geometry, glass and elevation

Tailwind spacing unit is `0.25rem` (4px at a 16px root). Numeric spacing utilities multiply that unit; fractional values are used too.

| Common utility     | Pixel value    | Typical use                               |
| ------------------ | -------------- | ----------------------------------------- |
| `1` / `1.5` / `2`  | 4 / 6 / 8      | Tight gaps, labels, compact controls      |
| `3` / `3.5` / `4`  | 12 / 14 / 16   | Control padding, row/card spacing         |
| `5` / `6` / `8`    | 20 / 24 / 32   | Icons, section gutters, card padding      |
| `10` / `12` / `16` | 40 / 48 / 64   | Public section spacing, controls, avatars |
| `24` / `28` / `32` | 96 / 112 / 128 | Sidebar reservation, docks, hero spacing  |

| Radius                     | Value          | Existing use                                    |
| -------------------------- | -------------- | ----------------------------------------------- |
| `rounded-sm` / `md` / `lg` | 4 / 6 / 8px    | Small surfaces and rows                         |
| `rounded-xl`               | 12px           | Button, Input                                   |
| `rounded-2xl`              | 16px           | Icon tiles and panels                           |
| `rounded-3xl`              | 24px           | GlassCard, public reading cards                 |
| `rounded-[32px]` / `4xl`   | 32px           | Brand swatch cards, large presentation surfaces |
| `rounded-full`             | Capsule/circle | Avatars, pills, indicators                      |

Borders are normally `1px`; low-contrast white borders often use 5–10% opacity, while authentication controls use neutral shades. Distinguish focus/selected borders from decorative hairlines. Glass combines translucent fill, a subtle border and backdrop blur; it is not a standalone texture. Blur defaults: `sm=8`, `md=12`, `lg=16`, `xl=24`, `2xl=40`, `3xl=64px`. Native ports need an opaque fallback.

Tailwind shadows include `xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` and `2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25)`. Feature-local glow shadows use colored RGBA and multiple layers. For example, login's desktop icon has `0 0 25px rgba(99,102,241,0.4)`; its small-screen icon uses `0 0 20px rgba(147,51,234,0.35)`. Exact custom shadows, gradients, filters and SVG attributes are retained in the inventory.

## Icons, illustration and assets

[lucide-react](../../apps/web/package.json) provides most interface icons. Sizes vary by context (commonly 14–24px); preserve the source `size`, `strokeWidth` and classes. Brand/service marks use custom SVG in BrandIcons and entity components, not arbitrary Lucide replacements. Retain accessible names for icon-only actions.

Public imagery lives under [public/images](../../apps/web/public/images), including `shared/EternalBanner.png`, safety illustrations and company/blog artwork. Game rank icons live under [public/icons](../../apps/web/public/icons). PWA sizes are 48, 96, 144, 192 and 512px; the manifest labels the 192/512 variants `any maskable`. Reuse exported silhouettes and validate safe cropping on the target OS. Inline React/SVG illustrations in page `ui/` directories are also design assets; they appear under inventory source entries even when no image file exists.

The inventory asset list includes paths and byte sizes for local media, plus sound/video files. Its `declaredAssets` list separately checks the image/icon paths referenced by HTML and the manifest. [favicon.svg](../../apps/web/public/favicon.svg) reuses the rounded purple brand icon from [brandingData](../../apps/web/src/pages/Brand/data/brandingData.ts). `favicon.ico` and the manifest's `icon-48/96/144/192/512.png` files are also present. The [favicon generation script](../../apps/web/scripts/generate-favicons.cjs) uses this SVG as input; existing raster icons have not been regenerated. `pnpm design:check` rejects absent declared assets.

Remote/user-generated assets are not bundled here. Preserve media fit/crop, aspect ratio, overlays and attribution from the owning component; file existence alone does not mean an asset is used on every screen.
