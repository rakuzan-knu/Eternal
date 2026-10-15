# Readability audit and release checks

## Scope and reproducible evidence

The local audit exercises the actual Feed, Profile and Messenger routes using [offline API fixtures](../../apps/web/e2e/design/screen-fixtures.ts). The [screen tests](../../apps/web/e2e/design/screens.spec.ts) cover long multilingual content at 1280px/100%, 390px/100%, and 320px/200%, plus separate empty/error screens and successful Feed/Chat retry with the draft preserved. Readiness waits for the rendered post or message inside the thread, rather than a profile heading or conversation-list preview.

Each content test writes `readability.json` to its Playwright output directory and attaches it to the HTML report. [auditReadability](../../apps/web/e2e/design/readability.ts) converts computed CSS colors through Chromium's sRGB canvas, composites foreground/background alpha through ancestors, linearizes channels, and computes `(Llighter + .05) / (Ldarker + .05)`. Tests reject measurable text below its applicable threshold. Regenerate screenshots deliberately and review the diffs; the inventory alone cannot prove contrast.

[WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) requires 4.5:1 for normal text and 3:1 for large text. The audit uses 24 CSS px, or approximately 18.67px at weight 700+, as the large-text threshold. The [relative luminance definition](https://www.w3.org/WAI/WCAG22/Understanding/relative-luminance.html) uses linearized sRGB, not weighted unconverted RGB channels.

## Findings and changes

| Measured finding | Change / boundary |
| --- | --- |
| Gray-500 metadata/counts on the post canvas measured about 4.04:1 | Post metadata and action text now use gray-400 |
| Inactive profile tabs and radio descriptions used the same low-contrast gray | Raised the text shade; selection/focus semantics remain separate |
| Chat-list timestamp measured about 2.97:1 on its selected surface | Raised the timestamp and muted preview shade |
| Offline status text measured about 4.07:1 | Raised shared offline text to gray-400 |
| Empty suggestions/friends blocks measured about 4.04:1 | Raised those messages and Feed/Chat empty guidance |
| Long post author extended the page beyond 390px | Constrained hover-card trigger width; wrapped metadata; truncated name within available space |
| At 320px/200%, the desktop navigation gutter left no usable post body | Narrow layout removes the gutter, provides a mobile navigation header and access to the existing navigation drawer |
| Messenger panels consumed the entire narrow viewport | Narrow routes use list/detail navigation with Back; thread header can wrap; tests check composer bounds |
| Post action targets were only 16px high; collection chevron was 16px wide | Action targets are at least 32px square and wrap; profile statistics have a minimum height; story create target is 24px and a sibling native button |
| RGB luminance was not linearized; auto white text failed on medium-gray solid bubbles | Corrected equivalent HEX/RGB luminance; auto text chooses stronger white/slate contrast, with black fallback near the crossover |
| Default chat advertised an unavailable GG Sans font | Shared system font stack and accurate default label; see [font policy](font-policy.md) |

The screenshots and reports record the tested combinations, not a claim that all application states meet WCAG. [Shared component reference](scenarios.md#executable-reference-coverage) also covers keyboard operation, dialog focus, menus, radios and enlarged text.

## Translucent and customized content

Alpha colors must be checked against the rendered background. Darken/dim a busy image, strengthen an overlay, or use an opaque text surface when the composition needs it. A single sampled pixel does not establish contrast across a gradient, image, shader or video.

Chat auto body text compares the existing white and slate candidates against the configured solid color or average gradient luminance. It preserves explicit user text colors and theme IDs. A medium gray solid bubble now selects readable text; a mixed black/white gradient cannot be made readable everywhere with one foreground. Bubble opacity, imported images, procedural backgrounds, effects, custom text colors and timestamps still need rendered compositing review. For these combinations, choose a stable solid bubble/overlay or adjust the user's palette; never certify the average-luminance heuristic as WCAG compliance. Existing light chat presets are content customization and do not implement a light application theme.

## Target and layout review

[WCAG target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24 CSS px or qualifying spacing/exceptions. The report lists smaller targets for manual examination; it does not automatically fail inline author links or declare spacing exceptions valid. Native platform guidance still prefers a generous 44pt/48dp touch target. Current 32px web post actions meet the geometric minimum, but should become at least the native target when adapted.

Review icon-only actions, disabled controls, placeholder text, hover/focus/pressed states, scrollbar controls, overlays and touch spacing separately. The automatic text check excludes backgrounds with gradients/images and ancestor opacity, and does not measure pseudo-elements, SVG icon contrast, filters, shadows, remote fonts, occlusion or native screen readers. Excluded entries appear under `manual` in the report.

Root enlargement in these tests scales rem typography/geometry, while deliberate fixed-pixel feature text remains fixed. This is a layout stress test, not a substitute for full browser zoom, OS text-size testing, every breakpoint or WCAG reflow certification. Messenger's viewport assertions catch a clipped composer that document overflow alone would miss.

## Release checklist

1. Run `pnpm --dir apps/web test:design` after building Storybook; inspect screenshot/report changes and the attached contrast audit.
2. Exercise enlarged text and long unbroken content on the target OS/browser, keyboard and portrait/landscape sizes.
3. Review each customized media palette with actual rendered backgrounds; check metadata and links as well as body text.
4. Test native targets, safe areas, keyboard avoidance and assistive technology on actual devices. The [interactive prototype](prototypes.html) simulates the intended behavior for review; it is not native validation.
5. Update the affected guide, screenshot baselines and inventory together. Global light appearance remains inactive.
