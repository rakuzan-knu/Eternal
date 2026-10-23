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

Community notification preferences reuse the existing Modal and authored Select, community button styles and runtime theme tokens. A server/channel scope selector separates account preferences from administrator settings. Use explicit inheritance and temporary-mute wording, preserve failed drafts, and show canonical unread counts as compact channel badges. No new palette, font, navigation surface or notification renderer is introduced.

## Communities and sharing

Communities add an invitation-based server model without converting or removing existing group chats. Public discovery exposes names, descriptions and counts; channel conversations and member lists require active membership. Keep the existing purple identity, readable compact cards and all navigation destinations. Use the shared Modal and Select for keyboard navigation, focus recovery and mutation states. Community cards retain page gutters on narrow screens; invitation dialogs scroll internally without hiding actions.

Owner/admin/member controls follow server authorization. Destructive membership actions require an explicit in-app confirmation. Invitations expose their credential only immediately after creation, support clipboard/manual selection, explicit external share links and confirmed direct-message delivery. Never persist bearer invite query keys or send them to telemetry. Sharing errors retain drafts and failed recipients; retries reuse delivery identifiers. The Reels page supplies the existing chat sender through component props so feature slices do not import each other.

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

### Audit remediation (2026-10-21)

Premium continuation constraint: retain all existing destinations, controls, effects and customization. A pinned navigation preference is device-scoped; authenticated content and modal state are never persisted with it. Profile content tabs may scroll to their panel while the full header and showcase remain in the document. Saved videos extend Saved alongside existing post collections. Unavailable sales receive visible explanation with all preview/wishlist/gift entry points retained. Form selection begins with explicit placeholders rather than invented personal defaults.

Preserve the existing palette and type owners. Empty stories use a compact creation action; populated stories keep the established avatar rail. Chat folders reserve their own scroll region and keep creation outside it, with a visible overflow control and selected button state. On narrow screens, settings navigation and the active form occupy separate views; selecting a subsection returns focus to the visible navigation toggle. Desktop settings retain their existing two-column layout.

Reuse `shared/ui/Modal` for the new-group dialog, including its input-Escape opt-in and focus return. Disabled/unavailable native downloads are informational states with a web-app destination, never synthetic installer files. Reels mutations announce success only after acknowledgement; failures retain drafts and permit retry. Public previews must not enter the keyboard focus order when hidden from accessibility APIs. These changes use the existing components rather than a second navigation, modal, or theme system.

## Profile effects
The existing shop owns the third category and native effect dialog. `ProfileEffectPreview` composes the existing Avatar and the sole shared `ProfileEffect` overlay. Main profile header cards and MiniProfileHoverCard own the overlay boundaries; effects never extend over feeds, sidebars, navigation or actionable hit regions. The actual avatar center anchors the 3D entrance after responsive layout. Portrait media is 640 × 1120 at 60 FPS, with 2.5 seconds of action and 5.5 seconds of transparent rest. Racing nameplates remain 640 × 112, with real 60 FPS scenes. No new application token or font owner is introduced.

Three eligible visible profile effects may animate, one on smaller devices. Reduced motion, hidden pages and data saving disable animation; profile content stays unobscured, while shop previews use static posters. Hover/focus promotes a card within the same global budget. All rendering failures preserve usable profile controls.

Profile card frames (2026-10-06): retain existing typography, app background/accent/text tokens, profile theme and card radii. Art colors are asset-specific metadata, not new application theme tokens. Proportional crowns occupy reserved top space; thin rails and fixed SVG corners frame the content without covering the nickname, bio or actions. Compact cards inset crowns into the banner. Shared ProfileFrameSurface/DecorationShopDialog own sizing and behavior. Frame/effect playback shares a visibility and reduced-motion budget. No card-wide image stretching or decorative interaction surfaces.

Racing profile frames: Apex Circuit uses the supplied blue Formula 1 with ice/silver carbon trim; Neon Paddock uses the supplied purple kart with lime details. Fixed corner flags, pit bridge and diffuser are original vector art. Two small cars follow the card perimeter, ease through turns and leave short edge trails; the center stays readable. Actual 3D heading atlases preserve model geometry. Local layout coordinates keep tracks aligned during entrance animation and resizing. Reduced-motion and decoding failures retain two parked cars.

## Community workspace revision — 2026-10-22

The user rejected the prior UX and requested a substantial redesign informed by their open Discord desktop app. Adopt a stable three-level communication hierarchy: global product → server/channel navigation → conversation. Discovery is a separate task surface. Server detail is a bounded workspace; members/about remain explicit navigable views. Preserve all existing features and personalization; do not replace the real composer or media/call controls with a sketch.

Runtime token ownership remains Model B: existing app CSS/theme values → workspace CSS; DESIGN.md mirrors intent, not a second generated palette. Use neutral surface/card/elevated roles with purple limited to selection, focus and primary invitation action. Keep system typography and inherited user preferences, compact 12–14px utility navigation, readable 14px content and restrained 24–32px welcome type. Geometry: 68px server rail, 244px channel panel, 58px context header. The signature is continuity of server identity and channel context alongside Eternal's existing personalized conversations and music. Reduced motion removes transitions, without disabling functions.

Canonical owners and state/navigation rules are in UX-CONTRACT.md. Observed competitor evidence and the explicit capability/gap inventory are in docs/design/discord-reference-2026-10-22.md. This replaces the earlier community profile-card-only layout, while preserving its create/edit/invite/member operations.

Channel organization (2026-10-22): retain the server/channel/conversation hierarchy and runtime theme ownership. Categories are navigation groups visible to every member. Manage channels reuses shared Modal, Select and community controls; explicit arrows support keyboard/touch ordering. Category removal preserves channels/history. The editor stages changes until Save, keeps failed/conflicting drafts and confirms dirty dismissal before exit animation. Reopening the workspace always reconciles persisted channel data with the server; revision checks reject stale edits. Archive/delete and private permissions remain separate work.

Channel archives (2026-10-22): use the same server workspace, shared confirmation Modal and runtime tokens. Archived channels have a named navigation group and readable history; the composer becomes an explicit read-only status. Preserve search, media, existing unread and authorized cleanup actions. Archive/restore are deliberate revision-checked admin actions; permanent deletion remains unavailable.


### Private community channels

Channel privacy extends the existing Manage channels dialog with a focused access editor, member search and explicit review. Reuse Modal, community control styles and the existing community scroll owner. Private channel navigation uses a lock icon with an accessible label. OWNER/ADMIN access is implicit and explained, while explicit grants remain individually removable across search pages. Keep a revision-conflicted draft intact; reopening obtains the current policy. Do not introduce another palette, overlay system or notification owner.

Private attachment URLs are opaque in messages and durable cache. Shared privateMedia/privateMediaView owns authenticated resolution, loading, denial/retry and one refresh on storage failure. Signed URLs remain transient and never enter persistence. Public attachment rendering stays unchanged.
