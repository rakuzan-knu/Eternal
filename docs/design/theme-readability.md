# Chat theme readability guardrails

Implemented in [themeReadability.ts](../../apps/web/src/features/chat/lib/themeReadability.ts), with [regression tests](../../apps/web/src/features/chat/lib/__tests__/themeReadability.test.ts) and the [theme editor](../../apps/web/src/features/chat/ui/SelectThemeModal.tsx).

The live preview checks outgoing and incoming primary message text independently. Explicit text color overrides follow their own/all-message scope. Solid opaque HEX colors are compared using linearized relative luminance; the normal-text target is 4.5:1. Outgoing gradients use their weakest configured stop rather than an average. Passing stops still require visual review of interpolation.

## Results

| Preview status | Meaning | Action |
| --- | --- | --- |
| Low contrast | At least one measurable stop is below 4.5:1 | Adjust colors or use readable bubbles |
| Needs visual check | Alpha, unknown color syntax, decorative shape/effect or gradient interior cannot be certified | Review on actual background and device |
| Solid text measured | Opaque solid primary text meets the target | Still inspect secondary content and controls |

Image/video/shader backgrounds are not sampled or declared accessible from their average color. An opaque plain bubble isolates its primary text from that background; transparent bubbles need visual review. Timestamp colors, quotes, links, reactions, attachment UI, SVG/pseudo-elements and metadata are outside this check. A positive result is not certification of the whole theme.

## Readable bubbles action

“Use readable bubbles” changes only the working draft: plain shape, opaque `#171717` surfaces, white primary text, no bubble blur or continuous gradient, and the minimal text effect. Wallpaper and font choice remain. The preview switches to New so the user can inspect the result; normal Apply theme behavior saves it. Custom settings are never silently overwritten, and the existing serialized theme schema is preserved.

The opaque bubble is the fallback surface behind text. It works independently of image brightness, gradient position or animation frame. Compare New / Before changes before applying. Text may still need native font/large-text review, and secondary colors remain separate review obligations.

## Regression matrix

Automated cases cover opaque outgoing/incoming, a black-to-white gradient (weakest stop), explicit text color with incoming scope excluded, bubble alpha, HEX alpha, decorative shapes, gradient text, unsupported color syntax and source-config preservation. The editor test verifies a readable draft is not immediately saved.

Manual cases: wallpaper with bright/dark regions, GIF/video frames, shader movement, quotes and timestamps, long links, attachment captions, enlarged text and VoiceOver/TalkBack. Record findings in [platform validation](platform-validation.md). This work does not enable a light application theme.
