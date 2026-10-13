# Visual effect performance

## Implemented fallback

The theme preview exposes a device-level “Simplify visual effects” toggle. [useVisualEffects](../../apps/web/src/shared/model/useVisualEffects.ts) stores the preference locally, synchronizes tabs and applies an HTML attribute. It does not change a shared conversation theme or infer hardware quality from a user-agent string.

- [ProceduralChatBackground](../../apps/web/src/features/chat/ui/ProceduralChatBackground.tsx) renders one static frame, disables audio reactivity/parallax and caps canvas pixel density at 1 in simplified mode. Resizing still redraws the static image.
- [CSS](../../apps/web/src/index.css) removes backdrop blur from utility/inline backdrop-filter consumers. Shared GlassCard uses an opaque surface and removes its shadow so its text remains legible without glass compositing.
- User-selected wallpaper and message palettes remain. “Use readable bubbles” is a separate explicit draft action when transparency compromises readability. Simplification does not certify custom themes or disable every animation in the application.
- OS Reduce Motion retains its independent behavior. Re-enabling full effects does not override that OS preference.
- Full-mode shader scheduling pauses when the document is hidden or the canvas leaves the viewport, then resumes with one scheduled frame when visible. Listeners and RAF are cleaned up when the component unmounts.

## Repeatable local measurement

[VisualEffects story](../../apps/web/src/features/chat/ui/VisualEffects.stories.tsx) combines the actual cosmic-aurora canvas with three actual GlassCards. [effects.spec.ts](../../apps/web/e2e/design/effects.spec.ts) compares full/simplified modes with OS motion allowed, Chromium 6× CPU slowdown and two-second frame samples. It attaches `effects-performance.json` with frame count, p95 frame interval, long-task durations and actual backdrop-filter state.

```sh
pnpm --filter frontend build
pnpm --filter frontend build:storybook
pnpm --filter frontend test:design effects.spec.ts
```

Timing is diagnostic rather than a brittle FPS assertion on shared CI hardware. The test asserts the preference actually removes blur and the sampled page continues rendering. Unit tests assert static mode schedules no shader RAF, redraws on resize and cancels motion when toggled.

### Recorded local sample

The passing canonical run on 2026-10-04 produced this [raw measurement](effects-measurement.json): Chromium 151.0.7922.34 on Windows, 1280 × 900, DPR 1, OS motion allowed, 6× CPU slowdown, about two seconds per mode.

| Mode         | Sampled frames | p95 frame interval | Tasks over 50ms | Computed backdrop filter |
| ------------ | -------------- | ------------------ | --------------- | ------------------------ |
| Full effects | 22             | 116.7ms            | 18              | `blur(24px)`             |
| Simplified   | 121            | 16.7ms             | 0               | `none`                   |

This single synthetic story sample demonstrates the fallback's local effect under these conditions. The observer samples page frames and main-thread tasks, not attributed shader/GPU timings. It does not establish an iPhone performance result, actual scrolling FPS, battery savings or a universal speedup. Repeat warm samples on the physical target before evaluating the budgets below.

## Review budgets

These are review targets, not claims about untested devices:

| Concern                     | Target                                                                      | Required evidence                                              |
| --------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Active foreground scrolling | p95 frame interval at or below 33.3ms on the chosen lower-end target device | At least three warm samples during actual Feed/Chat scrolling  |
| Main-thread stalls          | Investigate repeated tasks over 50ms caused by visual effects               | Trace with attribution to effect work; compare simplified mode |
| Simplified shader           | No continuous shader RAF; DPR ≤ 1                                           | Automated lifecycle test and profiler trace                    |
| Glass fallback              | No backdrop blur; shared card stays opaque/readable                         | Computed CSS and visual inspection                             |
| Input                       | Composer remains responsive during effects and keyboard use                 | Physical device typing and interaction sample                  |
| Memory/battery              | No steadily increasing allocations after repeated screen switches           | Longer physical-device profiling session                       |

CPU throttling models reduced CPU capacity; it does not emulate mobile GPU bandwidth, thermal throttling, battery use, iOS compositing or Android drivers. Local story measurements cannot establish a device budget pass. Keep browser/version, viewport, DPR, motion preference, CPU slowdown and sample duration with every result. Compare like-for-like scenarios and repeat unstable measurements before drawing conclusions.

## Built CSS regression

The local browser check exposed an ordering issue in the installed Lightning CSS 1.32 optimizer: writing the prefixed backdrop-filter declaration last retained only that property, so Chromium kept the utility blur. Keep the prefixed declaration before the standard declaration. Both the Chromium measurement and the browser matrix assert **computed styles in built Storybook CSS**, rather than assuming the source rule disables blur. Upstream [prefix optimization documentation](https://github.com/parcel-bundler/lightningcss/blob/master/website/pages/minification.md) explains the role of browser targets; the ordering result above was reproduced with this repository's installed dependency. No minifier settings or package versions were changed.

## Physical-device protocol

On the available iPhone 11, compare full/simplified modes with the same wallpaper, scroll/typing sequence and brightness. Warm the route, take three samples, note heat/background apps and verify VoiceOver/Reduce Motion separately. Android remains pending until a device is available. Use [platform validation](platform-validation.md) to record actual results and connect actionable issues to a regression.
