# Platform validation log

Prepared on 2026-10-04; updated on 2026-10-05. The available physical device reported by the user is **iPhone 11**. The user reported that the local prototype generally works, with a scroll-reset finding below; the test environment, exact OS/browser version and detailed physical-device checklist remain unreported. Mobile native UI is still a scaffold; desktop runtime is still under evaluation.

## Evidence levels

| Environment                           | Status                                                                        | What it proves                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Windows Chromium canonical suite      | Final canonical run passed 69/69 on 2026-10-05                                | Local web layout/state/keyboard assertions and reviewed screenshots                                           |
| Windows Firefox / WebKit              | Final interaction and reflow scopes passed on 2026-10-05; details below       | Browser-engine behavior on Windows                                                                            |
| WebKit iPhone 11 emulation            | Final interaction and reflow scopes passed; iPhone 11 device context          | Device-emulated viewport and asserted actions; real iOS keyboard and touch swipes unverified                  |
| Physical iPhone 11 Safari / VoiceOver | Confirmed device run pending; prototype feedback has no specified environment | Real safe areas, keyboard occlusion, text settings, scrolling and screen-reader behavior                      |
| User-owned Android / TalkBack         | Unavailable, pending                                                          | No user-owned Android hardware claim                                                                          |
| BrowserStack real iPhone 16 / Safari  | Targeted prototype checks passed on iOS 18.5                                  | Physical iOS browser rendering and tested actions; keyboard opening and VoiceOver unverified                  |
| BrowserStack real Galaxy S23 / Chrome | Targeted prototype checks passed on Android 13.0 / Chrome 149                 | Physical Android browser actions, Cyrillic input and send with a reduced visual viewport; TalkBack unverified |
| Native iOS/Android / native desktop   | Not implemented for these flows                                               | No native parity claim                                                                                        |

The 320 CSS px reflow test is the layout area of a 1280px screen at 400% zoom. It is not the browser zoom UI. Existing 200% root-font tests are a text-size stress check, not OS Dynamic Type. Test actual browser zoom at 200% and 400% manually with the browser menu; verify controls and content remain reachable without horizontal page scrolling, except genuinely two-dimensional media.

## Running automated checks

From the repository root with installed locked dependencies:

```powershell
$env:VITE_API_URL = 'http://127.0.0.1:3000'
pnpm --filter frontend build
pnpm --filter frontend build:storybook
pnpm --filter frontend exec playwright install chromium firefox webkit
pnpm --filter frontend test:design
pnpm --filter frontend test:design:platforms
```

Current checks serve the built production app through Vite preview on port 6007 and built Storybook on 6006. Rebuild after app edits; CI builds with the fixed local fixture API origin above. POSIX shells should export the same `VITE_API_URL` before building. The matrix reuses offline Feed/Profile/Chat fixtures, blocks remote media/fonts and WebSockets, exercises narrow layout and composer draft retention, and attaches screenshots rather than reusing Windows Chromium pixel baselines for another engine. HTML reports are local ignored artifacts. CI runs this matrix after canonical screenshots; cloud physical-device automation is optional and is described below. Accessibility and OS settings still need manual review.

Local result on 2026-10-04: **16/16 passed** across Chromium, Firefox, WebKit and iPhone 11 WebKit emulation (four checks per project, one worker, approximately two minutes). Each project checked Feed/Profile/Chat reflow and built-CSS removal of backdrop blur. Hosted CI has not been run for these changes. The design configuration uses one worker to avoid competing cold Vite module loading and performance sampling; this changes scheduling, not assertions or screenshot tolerances.

The full canonical Windows Chromium run before the prototype scroll regressions passed **63/63** in approximately 4.4 minutes with one worker. This includes 30 extended screen scenarios, theme draft guardrails, effect diagnostics, component keyboard behavior, typography and the existing actual-screen/prototype checks. Earlier concurrent runs encountered unfinished Vite module loading before API requests; those runs are failures, not device findings. The passing run retained normal assertions and screenshot tolerances. The nested-menu capture waits for the parent menu's final scale before measuring its submenu, and its settled baseline was visually reviewed.

## Real-app continuity checks, 2026-10-05

The platform matrix now has 60 checks: 44 interaction journeys (11 per project) and 16 reflow/effects checks. It serves the built React app and built Storybook with fictional offline API fixtures. Playwright 1.63.0 uses bundled Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6 on Windows; the iPhone 11 project is WebKit device emulation, not Safari on iOS. Journeys resize to 1280 × 900 and 390 × 844. Desktop history browsing uses native wheel input; mobile WebKit uses PageUp on the named history region because Playwright wheel input is unsupported there. This does not verify a touch swipe or OS keyboard.

### Final measured scopes

| Scope                                  | Result                                         | Evidence boundary                                                                                                                    |
| -------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Real-app interaction journeys          | **44/44 passed** on the final production build | 11 per engine/device context in the last complete matrix attempt; its separate initial-Feed readiness check failed as recorded below |
| Browser reflow/effects                 | **16/16 passed** in 44.2 seconds               | All four projects retested after the initial-content wait changed; action and geometry assertions retained                           |
| Canonical Windows design suite         | **69/69 passed** in 2.2 minutes                | Final production app and built Storybook; eight reviewed baselines refreshed; Profile error baseline unchanged                       |
| Targeted units and static/build checks | **Passed**                                     | Relevant units, frontend lint/typecheck, app/Storybook builds, generated inventory/tokens, links and docs-validator regression       |

The interaction and reflow results are separate measured scopes. After the last full 60-case attempt, only the changed reflow harness was rerun; hosted CI remains pending. These local fixture checks do not establish physical-device or native-client parity.

The first complete run passed all 44 journeys and 15/16 reflow/effects checks (59/60 total). The final iPhone chat reflow check did not reach a rendered app within its initial ten-second content wait; its trace had preload warnings and no rendered chat. The same unchanged check then passed three isolated runs. Initial route/module/data content readiness now has a bounded thirty-second wait for all three screens; loaded-layout and action assertions retain their usual timeouts. This is a harness readiness change, not evidence of a native-device fix.

The first production-preview canonical run passed 61/69, with eight pixel comparisons failing. All eight diff images were reviewed: differences were confined to SVG checkmark/sound details and story caption rasterization, with layout/state assertions passing. Only those [reviewed baselines](screen-captures.md) were refreshed; screenshot tolerances and content assertions were retained. Earlier initial-history failures exposed alignment against the previous size-container height; committed geometry observation now preserves live alignment while user input and explicit history jumps cancel automatic following.

A second matrix run passed 59/60; Firefox narrow initial history remained above the live edge despite no user input. A focused regression now also realigns late offset corrections from scroll events while following is active, and confirms that upward user input cancels the pending frame. This failure is retained as pre-fix evidence, not a pass.

With the final app build, all 44 interaction journeys passed in the next complete matrix attempt. One iPhone Feed initial-content check exceeded its old ten-second wait (59/60 total), so only the 16 reflow/effects cases were retested after extending initial readiness consistently. A preceding canonical repeat passed 68/69; the Profile error screenshot captured a transient loading frame. Its baseline was left unchanged for the final retest.

Targeted unit checks cover optimistic post state, composer input, retry identity, draft revision/account ownership, route restoration, bounded chat snapshots, keyboard conversation actions and live-following cancellation. The application production build, Storybook build, frontend lint/typecheck and design source/link checks pass. Existing build warnings include circular vendor chunks and Storybook chunk-size/eval diagnostics. A missing local WebKit executable was repaired with the official same-version Playwright installer; no security settings were changed. Hosted CI, real-device checks of these React journeys, production API/encrypted peers and native clients remain unverified.

## BrowserStack real-device prototype checks

Run on 2026-10-04 using the user-configured BrowserStack Local tunnel and Automate free plan. This loaded the offline prototype from the local Vite server; it did not test the actual React app or native clients. The two final sessions passed and were closed after capturing results.

| Device / browser                               | Browser viewport before focus | Passed checks                                                                                                                                 | Evidence                                             |
| ---------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| iPhone 16 / iOS 18.5 / Safari 18.5             | 393 × 659 CSS px, DPR 3       | Feed/Profile like and save in both directions; menu save and focus return; follow; navigation to Chat; Cyrillic send and failed-message retry | [Chat capture](assets/browserstack-ios-chat.png)     |
| Samsung Galaxy S23 / Android 13.0 / Chrome 149 | 360 × 649 CSS px, DPR 3       | Same action/navigation checks; Cyrillic send through a touch pointer while the visual viewport was 355px high; failed-message retry           | [Chat capture](assets/browserstack-android-chat.png) |

The frame was deliberately shortened to 500px to ensure scrollable content. The checks compare both the prototype pane and outer-page scroll before/after like/save/menu/follow. Inspection controls are set through DOM change events; action buttons use WebDriver input. The iOS screenshot includes Safari/system chrome, while the Android screenshot captures browser content. Neither capture shows the real OS keyboard. These are targeted behavioral checks, not cross-platform pixel baselines.

Two initial Android runs failed to send through WebDriver Element Click: captured pointer/mouse events targeted the HTML background, the enabled Send button received no click/submit, and the draft remained intact. The final harness uses a W3C touch pointer at the button's visible coordinates, accounting for `visualViewport.offsetTop`. It verifies that the composer submits, clears the draft and adds the message. This is a test-input correction; the evidence does not establish a defect in the prototype's Send handler. Both initial failures remain recorded in the local result folders.

On Android, focus reduced the visual viewport from 649px to 355px. On iOS, it remained 659px, so this run does **not** confirm opening or avoiding occlusion by the real iOS keyboard. Landscape, actual browser zoom, OS text settings, VoiceOver/TalkBack, production network behavior and the user's iPhone 11 checklist remain pending. Short Live trial sessions expired before completing these checks and are not counted as passes.

The reusable [WebDriver script](../../scripts/design/test-browserstack-prototypes.mjs) needs an already running local server/tunnel and `BROWSERSTACK_USERNAME`, `BROWSERSTACK_ACCESS_KEY`, and `BROWSERSTACK_TEST_URL` in its process environment. Obtain credentials privately from account settings; keep them out of source files and command history. The test URL must point to `/prototypes.html`. Run from the repository root:

```sh
node scripts/design/test-browserstack-prototypes.mjs
# Optional single-platform retest:
node scripts/design/test-browserstack-prototypes.mjs android
node scripts/design/test-browserstack-prototypes.mjs ios
```

JSON diagnostics and PNGs go to ignored `scratch/browserstack-design/`, or `BROWSERSTACK_RESULTS_DIR`. A failed assertion produces a nonzero exit code. The script closes sessions in `finally`, redacts credentials in reported errors, and does not install an SDK or activate cloud CI. Credentials are sent only to the BrowserStack WebDriver endpoint. This optional workflow uses the account's testing allowance; check its remaining minutes before another run.

Vendor references: [Local testing](https://www.browserstack.com/docs/local-testing/overview), [real device capabilities](https://www.browserstack.com/docs/automate/selenium/select-browsers-and-devices), [W3C WebDriver actions](https://www.w3.org/TR/webdriver/#actions).

## iPhone 11 review session

Record date, exact iOS version, Safari version if available, portrait/landscape, text settings and VoiceOver state. Use a configured reachable development/staging URL for **actual app** results; no deployment was performed for this task.

To review the existing offline prototype over trusted local Wi-Fi, run the existing Vite executable from the repository root:

```sh
pnpm --filter frontend exec vite ../../docs/design --host 0.0.0.0 --port 6010 --strictPort
```

Open `http://<computer-local-IP>:6010/prototypes.html` on the phone. Keep both devices on the same trusted network, use the computer's local address rather than localhost, and stop Vite with Ctrl+C after review. Do not open firewall ports or publish a tunnel automatically. If the OS blocks the connection, use an already reachable development URL. The prototype uses fictional local data: its keyboard and safe-area simulation do not replace checking actual app controls, network states or native clients.

| Step                                        | Expected result                                                                    | Result / evidence |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------- |
| Feed → Profile → Chat → Back                | Correct destination, reachable actions, no lost draft                              | Pending           |
| Portrait → landscape on each screen         | Controls stay reachable; content wraps                                             | Pending           |
| Focus message field; open real iOS keyboard | Composer/send visible above keyboard; newest message reachable                     | Pending           |
| Send multiline emoji/Cyrillic text          | No clipping, understandable send state                                             | Pending           |
| Increase Safari page zoom/text size         | No overlap or essential truncated copy                                             | Pending           |
| VoiceOver: headings, tabs, buttons, field   | Names/roles accurate; order follows visual flow                                    | Pending           |
| Open menu/dialog, dismiss, continue         | Focus stays in dialog and returns to trigger; background inaccessible during modal | Pending           |
| Retry a failed request/send                 | Error announced, action clear, input preserved                                     | Pending; app only |
| Enable Reduce Motion / simplified effects   | Static shader, no parallax in simplified mode; controls still work                 | Pending           |
| Image/gradient custom theme                 | Message text, metadata and controls readable over changing background              | Pending           |

For desktop, also run keyboard-only Tab/Shift+Tab, arrow navigation in tabs/menu, Escape dismissal, actual browser zoom and the available OS screen reader. Record browser/OS/scale and the affected state for each issue.

## Finding template

### Prototype finding from the user, 2026-10-04

`PROTO-001 / available device: iPhone 11, test environment and exact browser/iOS version unreported / local prototype / Feed and Profile actions / scroll down, like or save / retain scroll position / pane jumped to its beginning / caused by recreating the screen DOM / fixed by updating toggle buttons and counters in place / automated regression added for iOS, Android and desktop prototype layouts / physical retest pending`.

Regression check on 2026-10-04: **27/27 passed** with `pnpm --filter frontend test:design prototypes.spec.ts --browser=all`. Nine prototype action/navigation scenarios ran in each of Windows Chromium, Firefox and WebKit. The new checks cover pane and outer-page scroll, both toggle directions, counters, menu save and focus return. These are browser-engine checks of simulated layouts, not real iOS/Android OS sessions.

The six added regression cases bring the default canonical suite to 69 scenarios. This follow-up ran the affected prototype scenarios across all three engines; a complete 69-scenario run was not repeated at that point for the isolated HTML/test change. The subsequent full production-preview run passed 69/69 on 2026-10-05 as recorded above.

This report is scoped to the prototype and is not a completed pass for every iPhone/Safari/VoiceOver checklist row.

`ID / environment + version / actual app or prototype / route + state / steps / expected / actual / screenshot or recording reference / severity / owner / fix / retest date`.

An unavailable or pending environment is not a pass. Close a finding only after reproducing the original steps in the same relevant environment. Add new repeatable web regressions to the existing suite; native behavior needs native evidence.
