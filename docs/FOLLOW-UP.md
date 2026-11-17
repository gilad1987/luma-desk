# Follow-up: 3D console at the control position

State on 2026-11-17, commit `b2a3507` (`main` = `gh-pages`).

The "Console (MA)" layout is now a CSS-3D hardware console that stands at the
front-of-house control position, laid over the full-height stage. The work is
live but was **not approved**: the checks and small fixes below are still open.

## 1. Checks that still have to run

All checks below passed on earlier versions. They did not run on the final
console commit (`6d1e3fb`) because the test machine was overloaded.

- [ ] **Stage picking in MA.** Click a fixture on the stage: exactly that
      fixture is selected. Shift+drag: the box selects what is inside it.
      Orbit, pan and wheel zoom work above and beside the console. A click on
      the console does not orbit the stage.
- [ ] **Encoders, all six features.** With fixtures selected, all five encoders
      change by drag and by wheel. Gobo moves in whole steps in both directions.
      Blue changes from a middle value. Rate / Size / Spread change when a
      phaser runs on the selection, and show "No phaser on selection" when none
      does.
- [ ] **Screens.** Wheel scrolling on the Fixture Sheet, the Sequence table,
      the Auto Show pane and the pools. When the groups list is at its end, the
      wheel scrolls the pools pane. A mouse click focuses `#aBars`.
- [ ] **Edge paths.** Pointer released outside the element during a fader, pad
      or level-wheel drag: no stuck drag. Twenty quick feature switches: the
      number of canvases stays the same and one drag changes a value once.
- [ ] **Show file.** Export, then import: executors and presets come back.
- [ ] **Layout round trip, last three steps** (ma → classic → desk → ma).

## 2. The combination with "Real fixture models" was never tested

Commit `aff577e` (real fixture models, 405 fixtures, group pool with 48 slots,
a RoboSpot station on the FOH riser) landed on top of the console work. Only a
syntax check ran on the combined file. Check in MA at 1920×1080:

- [ ] The default view: the stage is framed above the console, and nothing of
      the FOH riser or the RoboSpot station shows as a second desk. The console
      view hides the riser through `fohRig` (`index.html:880-883`, `:1009`,
      `:1520`).
- [ ] Screen 2: the group pool now has 48 slots inside a 150px scroll box
      (`index.html:328`). The Presets header and one full row of preset tiles
      must stay visible without scrolling.
- [ ] No clipped labels, and every console control is the top element at its
      own centre (hit test).
- [ ] Stage picking still selects the right fixture with the new models.
- [ ] `docs/screenshots/hero.png` was captured before the new fixture models.
      Capture it again.

## 3. Small fixes that are still open

1. **Camera height in the code is not the real height** (`index.html:874`).
   The `fohMa` preset says `p [0, 3.2, 49.5]`, target `[0, 9.5, -8]`. The
   target is above the eye, so `controls.maxPolarAngle` lifts the camera to
   about `[0, 10.4, 49.8]`. The picture is right; the numbers are not. Write
   the real position into the preset. The guide Layout row (`index.html:2762`)
   says the FOH view is "from the operator's eye height"; at about 10 m that is
   not true, so change the sentence to "from the control position".
2. **Half a row of group tiles on screen 2** (`index.html:328`). The 150px
   scroll box cuts the third row. Set the height to a whole number of rows.
3. **A grip size of exactly 0.47 is not kept** (`index.html:3082`). Earlier
   versions stored 0.47 without a grip drag, so the code reads that value as
   "automatic". A drag that lands exactly on 0.47 comes back as automatic after
   a reload. Low impact; fix only if it is cheap.
4. **Position pad at 1366×768.** One corner measured 2.05% error against a 2%
   limit. The colour pad, with the same mapping, measured 0.03% there, so this
   is most likely pixel rounding on a small canvas. Confirm or fix.

## 4. Known limits (decide if they matter)

- At window widths of 1180px and below, console text is about 4.8–5.5px high.
  The window width limits the console size there.
- The top bar clips its right-hand controls at 1366px and below. This existed
  before the console work.
- Nothing was tested on a real GPU, in Safari, or with touch input. All runs
  used headless Chromium with SwiftShader.
- `boxMap` (`index.html:2049`) relies on standard CSS `zoom` behaviour
  (Chromium 128+, Firefox 126+). In Safari, check that a fader dragged to the
  top reads 100%.

## 5. How to test

The project has no test suite and no build. Serve the folder and drive it with
a headless browser.

```bash
python3 -m http.server 8000 --bind 127.0.0.1      # from the project root
```

Before the page loads, set these `localStorage` keys so the guide does not
cover the layout and the layout is the one under test:

```js
localStorage.setItem('lumadesk-guide-seen', '1');
localStorage.setItem('lumadesk-layout2', '{"deskMode":"ma","deskZoom":"auto"}');
```

Notes that cost time during this work:

- Block service workers in the test browser, or stale assets are served.
- Run one headless browser at a time. Two SwiftShader browsers at once make
  page loads take minutes and tests time out.
- For checks that do not need the picture, turn off Glow and Real light and
  shrink the renderer through the `window.__desk` test hook.
- Do not use Chrome's `--virtual-time-budget` flag; it hangs on this app.
- PAUSE only acts while a cue fade is running, and TAP ignores taps more than
  2.5 s apart. A slow test run sees "no change" for both; that is not a defect.
- Syntax check for the inline module:

  ```bash
  awk 'f&&/<\/script>/{f=0} f{print} /<script type="module">/{f=1}' index.html > /tmp/inline.mjs
  node --check /tmp/inline.mjs
  ```

The Playwright scripts written for this work (metrics, hit test, pointer
accuracy, tour, layout round trip) were kept in a temporary scratch folder and
may be gone. Their checks are the ones listed in sections 1 and 2.

## 6. Requirements the console must keep

- Every visible control does something real.
- All element IDs and the classes the JavaScript looks up stay as they are;
  there are 10 executors; the show-file format, command parser and MIDI mapping
  do not change.
- `desk` and `classic` look and behave as before.
- No `overflow`, `opacity`, `filter`, `clip-path` or `contain` on the 3D
  parents (`.maDesk`, `.maScreens`, `.maDeck`): they flatten the 3D children.
- No `:active` transform on keys inside the 3D console: it moves the key
  between pointer-down and pointer-up and the click is lost.
