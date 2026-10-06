---
version: alpha
name: Eternal
description: Existing social application; independent decorations extend user rows and profile cards.
colors:
  background: '#070709'
  primary: '#8b5cf6'
  text: '#ffffff'
  secondary: '#94a3b8'
typography:
  sans:
    fontFamily: 'Inter, Segoe UI, system-ui, sans-serif'
rounded:
  row: '0.75rem'
  card: '1rem'
spacing:
  page-max: '72rem'
components:
  nameplate: {}
  shop-card: {}
  shop-dialog: {}
---

# Eternal design context

## Overview
This bounded context records the existing shop and user-list conventions; it does not redesign unrelated screens. The product register is a compact social interface with decoration artwork carrying expression. A nameplate remains a quiet horizontal backdrop beneath the avatar and name. Existing Russian shop labels and English collection names are retained; market is not inferred from language.

## Colors
The canonical runtime owners are `apps/web/src/index.css` and `apps/web/src/shared/model/useThemeStore.ts`. This document mirrors the base defaults, not generated tokens. Shop surfaces consume `--app-bg-color`, `--app-text-primary`, and `--app-accent-color`; theme overrides remain authoritative. Media-backed rows use white text with a shadow and the catalog's bounded `shadeOpacity` for readability over bright art.

## Typography
Inherit application typography and custom-font preferences. Names truncate without resizing the row. Shop titles use the existing bold hierarchy; secondary explanation remains subdued.

## Layout
Preserve sidebar width and the shop's existing internal scroll owner. The catalog grid changes from one to two to three columns at existing `sm`/`xl` breakpoints. Delivery artwork is 640 × 112; rows use cover/right alignment. The complete source scene is retained on the right and feathered into a sharp panorama. Encoded artwork has no baked blur. A softly feathered 2px blur and dark patch follows only the visible nickname glyphs, with 8px horizontal and 6px vertical padding. Badges/checkmarks remain crisp foreground content; blank space stays unobscured.

## Elevation & Depth
Preserve existing theme surfaces, subtle borders, rounded cards and modal backdrop. Nameplate media sits in an isolated row stacking context below content and never intercepts clicks or changes avatar frame geometry.

## Shapes
Use the existing rounded-xl rows and rounded-2xl shop cards/dialog. The backdrop inherits the row radius; adjacent action menus and status indicators must retain their own positioning.

## Components
`shared/ui/Nameplate.tsx` is the sole list backdrop. `NameplatePreview` composes that same backdrop with the existing avatar decoration primitive. The native dialog lifecycle follows `ShopItemModal`; the browser supplies focus isolation, Escape, and focus return. New actions have explicit focus/disabled states. There is no second product-wide dialog or token system.

## Motion
Only visible, eligible nameplates mount video. One shared IntersectionObserver enforces at most eight players, four on low-memory/low-core devices, zero for data saving or reduced motion. Hidden pages use posters. Native source cadence and duration are retained except variable frame delays normalized to their average; no artificial 60 FPS or 4K claim is made.

## Accessibility
Decorative media is aria-hidden. Names, badges, row navigation, and actions remain semantic content. Catalog category controls use native buttons with aria-pressed. Search has a clear button; errors are announced and recoverable. Selection never changes the avatar decoration.

## Profile effects
The existing shop owns the third category and native effect dialog. `ProfileEffectPreview` composes the existing Avatar and the sole shared `ProfileEffect` overlay. Main profile header cards and MiniProfileHoverCard own the overlay boundaries; effects never extend over feeds, sidebars, navigation or actionable hit regions. The actual avatar center anchors the 3D entrance after responsive layout. Portrait media is 640 × 1120 at 60 FPS, with 2.5 seconds of action and 5.5 seconds of transparent rest. Racing nameplates remain 640 × 112, with real 60 FPS scenes. No new application token or font owner is introduced.

Three eligible visible profile effects may animate, one on smaller devices. Reduced motion, hidden pages and data saving disable animation; profile content stays unobscured, while shop previews use static posters. Hover/focus promotes a card within the same global budget. All rendering failures preserve usable profile controls.

Profile card frames (2026-10-06): retain existing typography, app background/accent/text tokens, profile theme and card radii. Art colors are asset-specific metadata, not new application theme tokens. Proportional crowns occupy reserved top space; thin rails and fixed SVG corners frame the content without covering the nickname, bio or actions. Compact cards inset crowns into the banner. Shared ProfileFrameSurface/DecorationShopDialog own sizing and behavior. Frame/effect playback shares a visibility and reduced-motion budget. No card-wide image stretching or decorative interaction surfaces.

Racing profile frames: Apex Circuit uses the supplied blue Formula 1 with ice/silver carbon trim; Neon Paddock uses the supplied purple kart with lime details. Fixed corner flags, pit bridge and diffuser are original vector art. Two small cars follow the card perimeter, ease through turns and leave short edge trails; the center stays readable. Actual 3D heading atlases preserve model geometry. Local layout coordinates keep tracks aligned during entrance animation and resizing. Reduced-motion and decoding failures retain two parked cars.
