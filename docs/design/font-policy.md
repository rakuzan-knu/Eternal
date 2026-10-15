# Font policy

## Decision

Use the operating system's sans-serif family for application UI and the default chat font. Do not bundle a new brand typeface or load a remote font for ordinary UI. The existing web stack is now explicit in [shared tokens](../../packages/shared/ui-primitives/src/tokens.ts) and connected to Tailwind's `font-sans`, `font-mono`, and `font-serif` through [index.css](../../apps/web/src/index.css). This preserves the previously installed Tailwind stack while preventing an implicit dependency on a future default.

The sans stack is `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`.

| Platform | Expected primary family | Implementation rule |
| --- | --- | --- |
| Windows web/desktop web shell | Segoe UI | Use the shared CSS stack; metrics vary with OS version |
| macOS/iOS browser | Apple system family | Keep system aliases rather than shipping Apple's font files |
| Android browser | Roboto when available | Fall back through the shared stack |
| Linux browser | Available Noto/Arial/system sans | Review on supported distributions |
| React Native | OS default | Leave `fontFamily` unset; a CSS family list is not a native font name |
| Future native desktop | OS default | Select the native API after choosing the runtime |

Monospace: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`. Serif: `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`. These lists are web-only values. Keep native numeric sizes and scalable text rules from [platform adaptation](platforms.md).

## Chat and user-created media

[CHAT_FONTS](../../apps/web/src/features/chat/model/chatTheme.ts) keeps the stored ID `default` and now calls it “Default (System)”. The previous “GG Sans” label advertised a font that was not shipped. Default chat and app UI share the stack; no Google Fonts request is made for that option. Decorative families remain opt-in content styling with their existing IDs and loader. See [customization](customization.md#chat-fonts).

Remote decorative fonts use fallback while loading and when offline. Do not promise that every decorative family includes Ukrainian/Russian glyphs or every requested weight. Before bundling one for native use, verify its license, actual subsets, weight files, fallback, and measured layout. Do not silently replace a user's stored family ID. KaTeX's package fonts belong to mathematical content and are separate from this policy.

## Verification

[Design/Typography](../../apps/web/src/shared/ui/TypographyReference.stories.tsx) exercises weights 400/500/600/700, Ukrainian `і ї є ґ`, Russian `ё й щ ы э`, Latin, numbers, skin-tone/ZWJ/flag emoji, monospace and serif. [Browser tests](../../apps/web/e2e/design/typography.spec.ts) verify the token, no remote request, no horizontal overflow, and reviewed Windows Chromium screenshots at 100%/200%. Real Feed/Profile/Chat fixtures also use multilingual content and long names.

These checks verify layout and fallback on the tested machine. A font-family computed value does not identify the font used for each glyph; screenshots do not certify other operating systems or native rendering. Before each platform release, repeat the samples with OS text enlargement, real keyboards, and VoiceOver/TalkBack or the target desktop screen reader.

The reviewed Windows emoji baseline displays regional-indicator flags as letter pairs (for example `UA`), while other operating systems may display flag artwork. Treat this as an OS emoji difference; the application does not bundle a custom emoji artwork set.

Any future brand font decision needs actual font files, licensing/subset evidence, offline loading behavior, layout comparisons and separately reviewed platform baselines. Until then, system fonts are the implementation contract.
