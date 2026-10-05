# Chat and story customization

These are user-content settings. Keep them separate from application appearance, and preserve their stable IDs when porting saved themes or media. The [inventory](web-design-inventory.json) contains exact unevaluated catalog expressions, including spread defaults; resolve those defaults before translating to another platform.

## Chat theme contract

[chatTheme.ts](../../apps/web/src/features/chat/model/chatTheme.ts) defines the configuration, catalogs and defaults. [themeUtils.ts](../../apps/web/src/features/chat/lib/themeUtils.ts) validates/imports configurations and computes backgrounds, text contrast, bubble geometry and effects. [SelectThemeModal](../../apps/web/src/features/chat/ui/SelectThemeModal.tsx) owns the customization UI.

| Default field                                           | Value                                  |
| ------------------------------------------------------- | -------------------------------------- |
| `id`, `name`                                            | `default`, `Default Dark`              |
| `backgroundType`, `backgroundColor`                     | `solid`, `#0b0b0c`                     |
| `gradientColors`, `gradientAngle`                       | `[#0b0b0c, #14151b]`, `135`            |
| `bgBrightness`, `bgBlur`                                | `0.8`, `0px`                           |
| `bubbleShape`, `bubbleType`                             | `telegram-modern`, `gradient`          |
| `bubbleColor`, `bubbleGradientColors`, angle            | `#9333ea`, `[#9333ea, #6366f1]`, `135` |
| `bubbleContinuousGradient`                              | `false`                                |
| `bubbleTextColor`, opacity, blur                        | `auto`, `0.9`, `16px`                  |
| Incoming color, text color, opacity, blur               | `#12131b`, `auto`, `0.8`, `16px`       |
| `textFont`, `textEffect`, `textColor`, `textApplyToAll` | `default`, `minimal`, `auto`, `false`  |

Optional fields include image URL, shader ID, audio reactivity/parallax and incoming bubble type/gradient/angle. Background types are `solid/gradient/image/preset/shader`; bubble types are `solid/gradient/preset`. Gradient angles are CSS degrees.

The runtime Zod schema accepts angles0–360, background brightness0–1, background/bubble blur0–50px, outgoing/incoming opacity.05–1 and color arrays up to10 entries. Schema fallback opacity defaults (.95 outgoing/.85 incoming) differ from the explicitly configured default theme (.9/.8). Schema fallback audio reactivity and parallax are true. Preserve this distinction when importing partially specified themes. String validation is not a guarantee of readable color contrast.

## Background presets

All presets inherit the default configuration before applying the overrides below; gradients are135deg. Tile preview and actual background can differ.

| ID                 | Actual background             | Outgoing gradient / other overrides                |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| `default`          | `#0b0b0c`                     | Default                                            |
| `pure-black`       | `#000000`                     | `#3b82f6 → #1d4ed8`                                |
| `pure-white`       | `#f1f5f9` (preview `#f8fafc`) | `#3b82f6 → #60a5fa`; incoming `#e2e8f0`            |
| `discord-slate`    | `#1e1f29`                     | `#5865F2 → #7289da`                                |
| `midnight-purple`  | `#120726 → #2d0b4e → #0a0416` | `#a855f7 → #ec4899`                                |
| `deep-ocean`       | `#061321 → #0c2b48 → #030a12` | `#0ea5e9 → #2563eb`                                |
| `emerald-forest`   | `#061c14 → #0d3829 → #030d09` | `#10b981 → #059669`                                |
| `cyberpunk-neon`   | `#1c0624 → #3d0c4e → #0d0211` | `#f43f5e → #a855f7`                                |
| `sunset-mirage`    | `#2e081f → #541c2c → #702e1b` | `#f97316 → #e11d48`                                |
| `cosmic-aurora`    | `#091e2b → #113f38 → #182848` | `#06b6d4 → #8b5cf6`                                |
| `telegram-sky`     | `#0f1c3f → #1e3a8a → #0b1120` | `#0284c7 → #38bdf8`                                |
| `instagram-velvet` | `#4c1d95 → #c026d3 → #f43f5e` | `#d946ef → #f43f5e → #fbbf24`; continuous gradient |

Procedural wallpaper IDs are `neon-smoke`, `cosmic-aurora`, `synthwave-grid`, `starlight-drift`, `cyber-matrix`; their preview gradients and color arrays are captured in `PROCEDURAL_SHADER_PRESETS`. Previews do not reproduce the animated renderer. Audio-reactive and parallax behavior requires an appropriate renderer/performance fallback on each platform. Uploaded image/GIF and recent wallpaper palettes are runtime content and cannot be fully enumerated in this document.

## Bubble color and shape presets

| Bubble preset ID       | Color(s)                      | Direction / mode                   |
| ---------------------- | ----------------------------- | ---------------------------------- |
| `purple-glow`          | `#9333ea → #6366f1`           | 135deg gradient                    |
| `telegram-blue`        | `#0284c7 → #0ea5e9`           | 135deg gradient                    |
| `instagram-sunset`     | `#ec4899 → #f43f5e`           | 135deg gradient                    |
| `emerald-mint`         | `#059669 → #10b981`           | 135deg gradient                    |
| `cyberpunk-fuchsia`    | `#d946ef → #8b5cf6`           | 135deg gradient                    |
| `crimson-flame`        | `#dc2626 → #ea580c`           | 135deg gradient                    |
| `golden-amber`         | `#d97706 → #f59e0b`           | 135deg gradient                    |
| `discord-blurple`      | `#5865F2`                     | Solid                              |
| `pure-white-bubble`    | `#ffffff`                     | Solid                              |
| `pastel-lemon`         | `#fef08a`                     | Solid                              |
| `instagram-continuous` | `#ec4899 → #8b5cf6 → #3b82f6` | 180deg, continuous across viewport |

Supported shape IDs: `default`, `ios-classic`, `telegram-modern`, `cyber-glass`, `retro-pixel`, `gummy`, `prisma`, `capybara`, `frog`, `cat-dog`, `doge`, `dino`, `heart-pepe`, `liquid-neon`, `star-bubble`, `pink-cream`, `sheetbook-note`, `moon-bubble`, `cloudy-bubble`, `evil-bubble`, `halo-bubble`, `system-bubble`. The shape-selector catalog is a subset of the complete supported type; do not assume every supported classic ID has a tile in `BUBBLE_SHAPE_PRESETS`.

Classic shapes adapt corners to own/incoming and first/middle/last messages. Telegram Modern uses18px main corners,8/6px clustered inner corners and3px final tail corner, mirrored for incoming. Decorative shapes can override fill/text, introduce image/SVG decorations, layered shadows, textures and animations. `sheetbook-note` and `halo-bubble` are light-content cases; terminal/evil/moon shapes have their own contrast palette. Exact preview colors and recommended solid/gradient values for every decorative shape are in `BUBBLE_SHAPE_PRESETS`; actual rendering geometry lives in `getBubbleShapeStyles` and the message decoration components. A single global `borderRadius` cannot reproduce them.

Auto text selection uses luminance heuristics in `getBubbleContrastTheme`: average outgoing gradient colors, incoming solid color, threshold.48 and special handling for notebook/custom text colors. Dark text is `#0f172a`; light text is `#ffffff`, with context-specific quotes, timestamps and links. The RGB and HEX calculation paths differ, and gradients/transparency are not evaluated as rendered contrast ratios. Treat this as existing behavior, not certified contrast compliance.

## Chat fonts

| Stable ID      | Font stack                                                                 | Scale / line-height / tracking |
| -------------- | -------------------------------------------------------------------------- | ------------------------------ |
| `default`      | Shared system sans stack ([font policy](font-policy.md)); label “Default (System)” | 1 / 1.4                        |
| `serif`        | `'Playfair Display', Georgia, serif`                                       | 1 / 1.4                        |
| `bubble`       | `'Rubik Bubbles', cursive`                                                 | 1.05 / 1.35                    |
| `medieval`     | `'Ruslan Display', serif`                                                  | 1 / 1.4                        |
| `comfortaa`    | `'Comfortaa', cursive, sans-serif`                                         | .98 / 1.4                      |
| `pixel-arcade` | `'Press Start 2P', monospace`                                              | .8 / 1.6 / -.03em              |
| `pixel-clean`  | `'Pixelify Sans', monospace`                                               | .95 / 1.45                     |
| `journal`      | `'Caveat', cursive`                                                        | 1.15 / 1.3                     |
| `cyber`        | `'Exo 2', sans-serif`                                                      | 1 / 1.4                        |
| `mono`         | `'JetBrains Mono', monospace`                                              | .92 / 1.45                     |
| `gothic`       | `'Kelly Slab', cursive, serif`                                             | 1.02 / 1.4                     |
| `cursive`      | `'Pacifico', cursive`                                                      | 1.02 / 1.4                     |

[fontLoader](../../apps/web/src/features/chat/lib/fontLoader.ts) loads decorative Google Fonts on demand with `display=swap`; individual requests ask for400/600/700/800. Opening the text tab batches11 decorative families with family-specific weights; the comment says12, counting the default option. Inter and generic families are skipped. Check requested weights and actual glyph fallback before shipping native font files; no chat/story font files are bundled under `public` at extraction. Third-party content renderers such as KaTeX have their own package fonts/styles.

Text-color choices: `auto`, Mint`#34d399`, Emerald`#10b981`, Sky`#38bdf8`, Lavender`#c084fc`, Rose`#f43f5e`, Gold`#eab308`, Orange`#f97316`, Teal`#059669`, Forest`#16a34a`, Ocean`#0284c7`, Purple`#9333ea`, Crimson`#e11d48`, Red`#dc2626`, White`#ffffff`.

Effects from [index.css](../../apps/web/src/index.css):

| ID          | Rendering                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimal`   | No decorative effect                                                                                                                                                                              |
| `gradient`  | 135deg `#ec4899 → #a855f7 → #38bdf8`, clipped text; selection becomes white on purple45%; links sky-blue/underlined, mentions lavender semibold; emoji/images/SVG protected from transparent fill |
| `neon`      | Current-color shadows5/12px plus purple22/35px glow                                                                                                                                               |
| `cartoon`   | Weight700, black outline with2/3px offset shadows                                                                                                                                                 |
| `highlight` | Emerald glow8px and2px `#047857` extrusion                                                                                                                                                        |
| `gummy`     | Weight700, pink extrusion/shadow and white top highlight                                                                                                                                          |
| `prism`     | Rose/cyan horizontal offsets ±1.75px and emerald vertical1.5px                                                                                                                                    |

Keep selectable text, emoji color and link recognizability when porting effects. Unsupported shader/blur/text-shadow features need a readable plain-text fallback.

## Story content system

[storyCanvasUtils](../../apps/web/src/features/stories/lib/storyCanvasUtils.ts) defines fonts, gradients, palette and animation IDs. [Layer types](../../apps/web/src/features/stories/model/types.ts) preserve percent positions, scale, rotation and z-order; text may use container-relative `fontSizeCqw`. Image, caption, poll, link, mention and other overlays have separate renderers. Text backgrounds are `none/solid/neon/glass/highlight`, with left/center/right alignment and normal/italic styles. Do not convert percent coordinates to one fixed phone's pixels when saving content.

| Story font ID | Family                                 |
| ------------- | -------------------------------------- |
| `modern`      | `system-ui, -apple-system, sans-serif` |
| `classic`     | `'Montserrat', sans-serif`             |
| `signature`   | `'Caveat', cursive, serif`             |
| `neon`        | `'Monoton', cursive, sans-serif`       |
| `typewriter`  | `'Courier Prime', monospace`           |
| `cyberpunk`   | `'Orbitron', monospace, sans-serif`    |
| `poster`      | `'Russo One', sans-serif`              |

The Google Fonts preload requests Caveat600/700, Courier Prime700, Montserrat800/900, Orbitron700/900, Monoton and Russo One. The layer type also accepts legacy `sans/serif`; preserve compatibility with saved content. Animation IDs are `none/typewriter/float/bounce/glow/wave`; exact timing is in [motion](motion-accessibility.md).

Story palette: `#ffffff`, `#000000`, `#5865f2`, `#ec4899`, `#f43f5e`, `#f97316`, `#eab308`, `#10b981`, `#06b6d4`, `#3b82f6`, `#a855f7`, `#64748b`. Eight background gradients, all180deg:

| Stops                               |
| ----------------------------------- |
| `#181824 → #0b0c10`                 |
| `#2d124d → #110726`                 |
| `#093028 → #021612`                 |
| `#1f2937 → #111827`                 |
| `#4c0519 → #1f020a`                 |
| `#1e1b4b → #312e81 (50%) → #4c1d95` |
| `#1e3a8a → #0f172a`                 |
| `#431407 → #1c0a00`                 |

[Story filters](../../apps/web/src/features/stories/lib/storyFilterUtils.ts) are CSS transforms, not image-resolution upgrades despite the display names:

| ID           | Exact filter                                                       |
| ------------ | ------------------------------------------------------------------ |
| `none`       | `none`                                                             |
| `sunset`     | `contrast(1.15) saturate(1.4) hue-rotate(-10deg) brightness(1.05)` |
| `8k`         | `contrast(1.22) saturate(1.25) brightness(1.02)`                   |
| `4k`         | `contrast(1.15) brightness(1.06) saturate(1.12)`                   |
| `vintage`    | `sepia(0.38) contrast(0.95) brightness(0.96) saturate(1.25)`       |
| `noir`       | `grayscale(1) contrast(1.3) brightness(0.95)`                      |
| `tokyo-neon` | `hue-rotate(35deg) saturate(1.65) contrast(1.15)`                  |
| `cyberpunk`  | `contrast(1.3) saturate(1.8) hue-rotate(-25deg)`                   |
| `warm-gold`  | `sepia(0.25) saturate(1.5) brightness(1.08)`                       |
| `emerald`    | `hue-rotate(85deg) saturate(1.25) contrast(1.1)`                   |
| `cinematic`  | `contrast(1.25) brightness(0.92) saturate(1.15)`                   |

Drawing and music stickers have their own palette/brush/label/layout state in [StoryDrawingCanvas](../../apps/web/src/features/stories/ui/StoryDrawingCanvas.tsx), [StoryMusicCustomizerModal](../../apps/web/src/features/stories/ui/StoryMusicCustomizerModal.tsx) and [StoryMusicStickerView](../../apps/web/src/features/stories/ui/StoryMusicStickerView.tsx). Preserve compositing order and filter scope: a media filter should not unintentionally recolor UI controls or independently colored stickers.
