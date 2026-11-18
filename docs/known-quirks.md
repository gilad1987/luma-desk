# Known quirks (kept on purpose)

> "Source" lines refer to the original single-file app: `index.html` at commit `48a3b63` (3,096 lines) and
> `sw.js` at the same commit. "Lives in" names the TypeScript file that keeps the quirk today. Code that keeps a
> quirk cites its id (for example `quirk C2`), so `grep -rn "quirk C2" src` finds every place. The citation also
> gives the original line: `// quirk A1 (orig:1689)` as a line comment, `(quirk C2, orig:1921)` inside a sentence.
> `orig:` is a line of `tests/shared/legacy/original-index.html`, the frozen copy of `index.html@48a3b63`; the
> service worker entries (I) give `orig:sw.js:<line>`. `tests/unit/knownQuirks.test.ts` fails when an entry is not
> cited or a citation has no original line; it lists the entries whose code is gone, with the reason.

## Why this file exists

The TypeScript refactor changes no behavior. The parity suite (golden `serialize()` JSON, command transcripts,
`computeOutput` snapshots, screenshots) records what the old app does, including the odd parts. If the refactor
"fixed" any of the items below, a golden file would change, and we could no longer tell a planned fix from a
regression. So each quirk moves into the new code as it is, with a comment that points here.

Fix them later, one at a time, each in its own commit that updates the golden files on purpose.

Each entry gives: where it is, the code, what it does, why it is kept, and a suggested fix. Entries added in
Phase 8 also name the file that keeps the quirk and the test that pins it.
"Kept for parity" means: the new code must give the same output or the same DOM for the same input.

Groups:

- [A. Output engine and playback](#a-output-engine-and-playback)
- [B. Programmer, presets and store](#b-programmer-presets-and-store)
- [C. Command line](#c-command-line)
- [D. Show file and boot](#d-show-file-and-boot)
- [E. Auto Show and audio](#e-auto-show-and-audio)
- [F. Rendering](#f-rendering)
- [G. UI](#g-ui)
- [H. Dead code and unused names](#h-dead-code-and-unused-names)
- [I. Service worker (`sw.js`)](#i-service-worker-swjs)
- [J. Refactor departures on paths that only crash](#j-refactor-departures-on-paths-that-only-crash)
- [K. Test mode (`?test`)](#k-test-mode-test)
- [L. Corrupt-save-only changes](#l-corrupt-save-only-changes)
- [Q. UI quirks from the Phase 5 extraction map](#q-ui-quirks-from-the-phase-5-extraction-map)

---

## A. Output engine and playback

### A1. Highlight sets `o.gobo` with a ternary whose two branches are equal

- Source: `index.html:1689`
- Code:
  ```js
  if (highlight && f.sel) {
    o.dim = 100;
    o.r = o.g = o.b = 100;
    o.strobe = 0;
    o.gobo = f.type === 'screen' ? 0 : 0;
  }
  ```
- What it does: under Highlight, every selected fixture gets gobo 0. For the LED screen, `o.gobo` is the content
  mode, so the screen switches to mode 0 (`Solid`, see `SCREEN_MODES` at 732). The default screen mode with no
  playback is 1 (`Gradient`, set at 1671). The ternary looks like it was meant to give the screen a different value,
  but both branches are `0`.
- Why kept: highlighted screens show `Solid` today. A `computeOutput` snapshot with Highlight on records that.
- Future fix: decide the intended screen mode under Highlight (probably keep the current mode, or 1), then write one
  plain assignment.

### A2. The AUTO executor has no `flashOnly` field

- Source: `index.html:1529-1530`
- Code:
  ```js
  const execs = [...Array(10)].map((_, i) => ({ ..., flash: false, flashOnly: false, cache: {} }));
  const autoExec = { name: 'AUTO', ..., flash: false, cache: {}, auto: true };
  ```
- What it does: the ten executors and `autoExec` are written as two separate literals. `autoExec` has no
  `flashOnly` and has `auto: true`. Nothing reads `autoExec.flashOnly` (only the executor UI at 2163-2166 does, and
  it only exists for `execs`), so the difference has no effect today.
- Why kept: the refactor gives both shapes one `Executor` type. The type must allow `flashOnly` to be absent (or
  default to `false`) without a change in behavior. This entry records that the asymmetry is known.
- Future fix: build both from one factory; give AUTO `flashOnly: false`.
- Status: no longer in the code — one `Executor` class (`src/engine/Executor.ts`) gives every executor, AUTO
  included, `flashOnly = false`; nothing reads it on AUTO, so the output is the same.

### A3. A cross-fade keeps a value that has no target with a check that is always true

- Source: `index.html:1647`, `1656`
- Code:
  ```js
  const p = F.dur > 0 ? clamp((now - F.t0) / F.dur, 0, 1) : 1, k = p * p * (3 - 2 * p);
  if (p >= 1) { e.vals = deep(F.to); e.fade = null; continue; }
  ...
  else { if (fa == null) fa = fb; if (fb == null) { if (k < 1) o[at] = fa; continue; } }
  ```
- What it does: the code after `p >= 1` only runs when `p < 1`, and smoothstep gives `k < 1` for every `p < 1`. So
  `if (k < 1)` is always true. A non-dimmer value that is not in the target cue holds its old value for the whole
  fade, then disappears when the fade ends (at `p >= 1`, `e.vals` becomes `F.to`).
- Why kept: the fade output at a fixed time is in the golden `computeOutput` snapshots.
- Future fix: remove the dead check.

### A4. Gobo values snap at the middle of a fade; dimmer fades from 0

- Source: `index.html:1655`, `1657`
- Code:
  ```js
  if (at === 'dim') { fa = fa ?? 0; fb = fb ?? 0; }
  ...
  o[at] = at === 'gobo' ? (k < .5 ? fa : fb) : fa + (fb - fa) * k;
  ```
- What it does: gobo (and the screen content mode, which uses the gobo attribute) changes in one step at the middle
  of the eased curve. A dimmer with no start or end value is treated as 0. All other attributes interpolate,
  including `grot`, `zoom` and `strobe`.
- Why kept: this is part of the fade model in the golden snapshots. It also looks like a design choice, not a bug.
- Future fix: none needed. Document it in TSDoc on the fade stepper.

### A5. Executor faders scale only the dimmer (HTP); all other values jump in at any level above 0

- Source: `index.html:1667`, `1674-1675`
- Code:
  ```js
  const active = allExecs.filter(e => e.on && (e.level > 0 || e.flash)).sort((a, b) => a.lastGo - b.lastGo);
  ...
  if (v) for (const a in v) { if (a === 'dim') o.dim = Math.max(o.dim, v.dim * lv); else o[a] = v[a]; }
  ```
- What it does: dimmer is highest-takes-precedence and scaled by the fader. Position, color, gobo, zoom and strobe
  are latest-takes-precedence by `lastGo`, and are not scaled. A fader at 1% moves all heads to that executor's
  position. Pressing FLASH sets `lastGo` (2163), so a flashed executor also wins LTP.
- Why kept: core output behavior, covered by golden snapshots.
- Future fix: none required (it matches a common console model). Name it in TSDoc on `OutputMerger`.

### A6. Auto beat pump only scales beams and spots

- Source: `index.html:1674`
- Code:
  ```js
  const lv = (e.flash ? 1 : e.level) * (e.auto && (f.type === 'beam' || f.type === 'spot') ? autoPump : 1),
    v = e.vals[f.id];
  ```
- What it does: the AUTO executor's pulse (`autoPump`, 2634-2637) multiplies dimmer and phaser levels only for the
  `beam` and `spot` types. `follow` uses the same mover attributes as `spot` (728) but does not pump.
- Why kept: output parity with the pulse on.
- Future fix: decide which types pump and move the list into the style or the fixture type.

### A7. Auto blinder hits ignore the hit level of the look and use the AUTO master

- Source: `index.html:1678`, `2621`
- Code:
  ```js
  if (f.type === 'blinder' && autoHitUntil > now && autoExec.on) o.dim = Math.max(o.dim, 100 * autoExec.level);
  ```
- What it does: for 0.28 s after a new chorus/drop/hook look, every blinder goes to the AUTO master level. It is
  applied before the programmer and before the Grand Master, so the programmer can override it.
- Why kept: output parity.
- Future fix: none required. Move it into the Auto Show module as an explicit "hit" layer.

### A8. Programmer values add unused keys to the phaser selection object

- Source: `index.html:1672`, `1680`, `1683`
- Code:
  ```js
  const fxSel = { pos: null, dim: null, color: null };
  if (pv)
    for (const a in pv) {
      o[a] = pv[a];
      fxSel[ATTR[a].feat] = null;
    }
  ```
- What it does: a programmer value for `gobo`, `grot`, `zoom` or `strobe` writes `fxSel.gobo = null` or
  `fxSel.beam = null`. These keys are never set to a phaser, and the loop at 1683 skips `null`, so the extra keys
  have no effect. In a typed version, `fxSel` keyed by phaser feature (`pos | dim | color`) would reject them.
- Why kept: no output effect, but a type-driven rewrite must not change the order or the result of the loop.
- Future fix: clear only phaser features (`pos`, `dim`, `color`).

### A9. A phaser replaces the dimmer instead of combining with it

- Source: `index.html:1686`
- Code:
  ```js
  if (ft === 'dim' && has(f, 'dim')) o.dim = fxTmp.dim * s.lv;
  ```
- What it does: a dimmer phaser overrides the static dimmer from all executors (no HTP with the static level). The
  `lv` is the level of the executor that owns the phaser, or 1 for the programmer.
- Why kept: output parity.
- Future fix: none required; document it.

### A10. GO on an off executor with the fader at 0 pushes the fader to full

- Source: `index.html:1635`, `1923`, `2201`
- Code:
  ```js
  if (!e.on && e.level === 0) e.level = 1;
  ```
- What it does: GO+ / GO−, `Goto Cue` and a click in the sequence table set the level to 1 when the executor is off
  and at 0. With MIDI faders, the software level then differs from the hardware fader.
- Why kept: interaction parity (smoke test presses GO+ on a fresh show).
- Future fix: none, or only when a MIDI device controls the fader.

### A11. GO resumes a paused fade instead of going to the next cue

- Source: `index.html:1634`
- Code:
  ```js
  if (e.fade && e.fade.paused) {
    e.fade.paused = false;
    e.fade.t0 = nowS() - e.fade.pausedAt;
    return;
  }
  ```
- What it does: after Pause, the next GO+ or GO− only resumes the fade. The direction is ignored.
- Why kept: interaction parity.
- Future fix: none required; it matches console behavior for GO+. GO− probably should not resume.

### A12. The OFF key on executor 1 keeps its fader level

- Source: `index.html:2159`
- Code:
  ```js
  d.querySelector('.ex-off').onclick = () => {
    execOff(e);
    e.level = i === 0 ? e.level : 0;
  };
  ```
- What it does: OFF on executors 2-10 also sets the fader to 0. On executor 1 (the main show) the level stays, so
  the next GO+ runs at the old level. `Off Exec n` from the command line (1925) and the big OFF button (2246) never
  touch the level.
- Why kept: interaction parity.
- Future fix: make OFF consistent across all three paths, or document the main-executor rule in the UI.

## B. Programmer, presets and store

### B1. `applyPresetTo` only forwards to `applyPreset`

- Source: `index.html:2133`, used at `2122`
- Code:
  ```js
  function applyPresetTo(t, n) {
    applyPreset(t, n);
  }
  ```
- What it does: nothing more than `applyPreset`. The Narrow / Medium / Wide buttons of the Beam tab call it.
- Why kept: the refactor moves code, it does not rename call paths in Phase 3-5. It is harmless.
- Future fix: call `applyPreset` directly and delete the wrapper.
- Status: no longer in the code — the Narrow / Medium / Wide buttons call `applyPreset` directly
  (`src/ui/panels/encoders/extra/beamExtra.ts`); the call they make is the same.

### B2. Empty branch for position presets

- Source: `index.html:1821`
- Code:
  ```js
  if (type === 2) {
    /* position preset also tidies running pos phasers */
  }
  ```
- What it does: nothing. The comment describes a behavior that is not implemented: running position phasers stay on
  after a position preset.
- Why kept: implementing the comment would change behavior.
- Future fix: decide whether a position preset should remove position phasers from the selection, then implement
  it or delete the branch.

### B3. Different rounding in different paths

- Source: `index.html:1809`, `820`, `825`, `2576`, `2026`
- Code:
  ```js
  (prog.vals[id] = prog.vals[id] || {})[attr] = +(+val).toFixed(2);           // 1809 progSet
  return { pan: +p.toFixed(1), tilt: +clamp(t, -135, 135).toFixed(1) };        // 825 aimAt
  const E = ..., L = x => Math.round(clamp(x * E, 0, 100));                   // 2576 genLook dimmer
  ```
- What it does: programmer values keep 2 decimals; computed positions keep 1 decimal; Auto Show dimmers are whole
  numbers; cue values written by `buildDemo` and `genLook` bypass `progSet` and are not rounded at all (only zoom is
  clamped, 2330, 2574). The display (`fmtVal`, 2026) shows 1 decimal below 10 and whole numbers above, except dimmer.
- Why kept: these numbers are in the golden show JSON and transcripts.
- Future fix: one rounding policy per attribute in the domain layer.

### B4. `aimAt` rounds after clamping tilt, but tilt-only bars clamp to ±95

- Source: `index.html:820`, `825`
- What it does: a tilt-only bar can aim only to ±95°, while `ATTR.tilt` allows ±135 (706). Pan is not clamped by
  `aimAt`; `progSet` (1806-1808) clamps it later to ±270.
- Why kept: position preset values are in golden data.
- Future fix: put the per-type tilt range in `FixtureType`.

### B5. Store Preset keeps an old name only if the old preset was a "fix" preset

- Source: `index.html:1876`
- Code:
  ```js
  presets[type][slot] = {
    name:
      presets[type][slot]?.name && presets[type][slot].kind === 'fix'
        ? presets[type][slot].name
        : `${PRESET_TYPES[type]} ${slot}`,
    kind: 'fix',
    fix,
  };
  ```
- What it does: storing over a built-in preset (kind `global` or `fn`, for example "Red") renames it to
  "Color 4". Storing over a user preset keeps its label.
- Why kept: show JSON parity.
- Future fix: keep any existing label.

### B6. Storing a new cue sets the fade twice

- Source: `index.html:1853`, `1859`
- Code:
  ```js
  if (!cue) { cue = { num, name: opts.name || `Cue ${num}`, fade: opts.fade ?? 2, vals: {}, fx: [] }; ... }
  ...
  if (opts.fade != null) cue.fade = opts.fade;
  ```
- What it does: for a new cue the second line has no effect. For an existing cue it updates the fade only when a
  fade was given.
- Why kept: harmless; part of `storeCue`, which the transcripts cover.
- Future fix: fold into one assignment.

### B7. The next cue number is computed twice, and the Auto save path does not sort

- Source: `index.html:1850`, `2714-2716`
- Code:
  ```js
  if (num == null) num = e.cues.length ? Math.floor(e.cues[e.cues.length - 1].num) + 1 : 1; // storeCue
  const e = execs[selExec],
    num = e.cues.length ? Math.floor(e.cues[e.cues.length - 1].num) + 1 : 1; // aSave
  e.cues.push(c);
  ```
- What it does: both compute "last cue number, floored, plus one". `storeCue` sorts after push (1853); the Auto
  "save look" button pushes without sorting and without the `progHasContent` check. Today the result is still in
  order because the new number is always above the last one.
- Why kept: transcript parity. The refactor may share one `nextCueNumber` helper, because the result is the same.
- Future fix: route the Auto save through `CueList.store`.

### B8. CLEAR timing: a second press within 400 ms clears everything

- Source: `index.html:1836-1843`, `3068`
- What it does: the first press clears the selection (or the programmer if nothing is selected). A second press
  within 400 ms clears all. Later, `3068` wraps the button so that it first clears a half-typed command line. The
  wrap reads `kc.onclick` at load time, so the order of the two assignments matters.
- Why kept: interaction parity.
- Future fix: none; make the wrap an explicit step in `CommandLine` instead of monkey-patching `onclick`.

## C. Command line

### C1. A second fixture list without `+` adds to the selection

- Source: `index.html:1897`
- Code:
  ```js
  const selectIds = list => { ...; setSel(list, mode === 'replace' && !selected ? 'replace' : mode === 'sub' ? 'sub' : 'add'); selected = true; mode = 'replace'; };
  ```
- What it does: in `Fixture 101 Fixture 105`, the second list is added, not a replacement, because `selected` is
  already true. Only the first list in a command replaces the selection.
- Why kept: command transcript parity.
- Future fix: none required; state it in the parser docs.

### C2. Out-of-range executor numbers fail with a JavaScript error message

- Source: `index.html:1921`, `1922`, `1925`, `1933`
- Code:
  ```js
  case 'go': { let ex = selExec; if (word() === 'exec') { i++; ex = num() - 1; } execGo(execs[ex], 1); break; }
  ...
  else if (k === 'exec') { execs[n - 1].name = name; }
  ```
- What it does: `Go Exec 20` passes `undefined` to `execGo`; the `TypeError` is caught at 1942 and its text is shown
  in the command feedback. `Exec 20` alone is clamped to 1-10 (1920). `Store ... Exec 20` checks and shows
  "No such executor" (1918). `Off Exec 20` logs "Exec 20 Off" only after `execOff` throws, so the log is not
  reached.
- Why kept: transcript parity includes error text. If the golden transcripts contain one of these, the exact text
  is a browser string, so tests should match it loosely or avoid it.
- Future fix: validate the executor number once in the parser.

### C3. `Goto`, `Delete`, `Label Cue`, `Fade` and `Pause` always use the selected executor

- Source: `index.html:1923`, `1924`, `1929`, `1931`, `1937`
- What it does: unlike `Go` and `Off`, these commands accept no `Exec n` suffix.
- Why kept: transcript parity.
- Future fix: accept an optional `Exec n` for all cue commands.

### C4. `Fade n` changes the current cue without saving

- Source: `index.html:1937`
- Code:
  ```js
  case 'fade': { const n = num(); const e = execs[selExec]; if (e.cur >= 0) { e.cues[e.cur].fade = n; log(`Cue fade = ${n}s`, 'ok'); } break; }
  ```
- What it does: no `persist()` call, unlike `Delete` (1929) and `Label` (1934). The change is saved only by a
  later save. No message when no cue is active.
- Why kept: parity of when localStorage is written.
- Future fix: persist, and report "no active cue".

### C5. The "N fixtures selected" message is suppressed by any At/Full/Zero in the command

- Source: `index.html:1941`
- What it does: the check scans the whole token list, not the order of the actions.
- Why kept: transcript parity.
- Future fix: none needed.

### C6. Feedback and labels are inserted as HTML

- Source: `index.html:1888`, `1934`, `1962`, `1973`, `2193`, `2197`
- Code:
  ```js
  function log(msg, cls = '') { ...; d.innerHTML = `<span class="${cls}">${msg}</span>`; ... }
  ```
- What it does: user labels (`Label Group 3 <b>x</b>`) and command text in error messages are rendered as HTML in
  the feedback line, the pools, the sequence table and the executor select. `openRename` (2280) escapes only `"`.
- Why kept: DOM parity in screenshots. Shows are local, so the risk is low (a pasted show JSON is the only outside
  input).
- Future fix: use `textContent` for user text. This is a small security fix and should be the first quirk fixed
  after the refactor.

### C7. An unknown executor fails with Chromium's `TypeError` text

- Source: `index.html:1921`, `1922`, `1925` (see C2)
- Lives in: `src/command/run/executorAt.ts`, used by `runPlayback.ts` and `runCueEdit.ts`
- What it does: the original read a field of `execs[n]` with `n` out of range, and the browser threw a `TypeError`
  that the command line showed as is. The typed runner cannot read `undefined`, so `executorAt` throws a
  `TypeError` with the same text, in Chromium's wording. `Off Exec 99` gives
  `Cannot set properties of undefined (setting 'on')`; `Go Exec 99` gives
  `Cannot read properties of undefined (reading 'cues')`.
- Why kept: it is the text the operator saw in Chrome and Edge, the browsers the README names. Firefox and Safari
  word the error differently, so the old app showed other text there; the new code always shows Chromium's.
- Pinned by: `tests/unit/command/CommandRunner.test.ts` ("quirk C2: an unknown executor ...").
- Future fix: C2's fix (validate the executor number in the parser) removes this too.

### C8. `Off Exec n` writes `e.on = false` before `e.off()`

- Source: `index.html:1925` (`execOff(execs[ex])`)
- Lives in: `src/command/run/runPlayback.ts` (`runOff`: `executorAt(..., 'setting', 'on')`, then
  `executor.on = false` before `executor.off()`)
- What it does: the extra write has no effect on a real executor, because `off()` also clears `on`. On an unknown
  executor it is the write that fails, so the log shows the C2 text `Cannot set properties of undefined (setting
'on')`, as the original `execOff` did.
- Why kept: it is the only way to keep the C2 error text for `Off`.
- Pinned by: `tests/unit/command/CommandRunner.test.ts`.
- Future fix: goes with C2.

## D. Show file and boot

### D1. A saved show with no cues is replaced by the demo on the next load

- Source: `index.html:3089-3090`, `2319`
- Code:
  ```js
  try { const s = localStorage.getItem(LS); if (s) { loadShow(JSON.parse(s)); loaded = execs.some(e => e.cues.length); ... } } catch (e) { }
  if (!loaded) buildDemo();
  ```
- What it does: "New empty show" (2319) saves a show with no cues. On reload, `loaded` is false, so `buildDemo()`
  runs and its `persist()` (2445) overwrites the saved groups, presets and labels.
- Why kept: boot parity; the "old saved show loads" test depends on this exact boot rule.
- Future fix: treat "a show exists in storage" as loaded, not "a show with cues".

### D2. Boot forces executor 1 to full when it has cues

- Source: `index.html:3089`
- What it does: after loading a saved show, cue 1 of executor 1 runs with no fade, and the level becomes 1 if it was
  saved as 0. Other executors keep their saved level but stay off.
- Why kept: boot parity.
- Future fix: none required; document it.

### D3. `bpm` and `haze` treat falsy values differently

- Source: `index.html:2306`
- Code:
  ```js
  bpm = d.bpm || 120;
  hazeU.value = d.haze ?? 0.62;
  $('#haze').value = hazeU.value * 100;
  ```
- What it does: `bpm: 0` loads as 120; `haze: 0` loads as 0. Both are correct for valid data (bpm 0 is not valid),
  but the operators differ. The loader does not check `v`. A field of the wrong type now counts as missing
  (section L).
- Why kept: loader parity with old saved shows.
- Future fix: validate the show with a schema; keep `v: 1` as the version.

### D4. Built-in function presets are not saved; built-in global presets are

- Source: `index.html:2297`, `2301`, `2304`
- Code:
  ```js
  presets: Object.fromEntries(Object.entries(presets).map(([t, m]) => [t, Object.fromEntries(Object.entries(m).filter(([, p]) => p.kind !== 'fn'))])),
  ```
- What it does: position presets and Narrow/Medium/Wide (kind `fn`) are left out and rebuilt from
  `defaultPresets()` on load. Dimmer, gobo, color and strobe presets (kind `global`) are saved in every show and
  override the defaults on load. A change to a built-in color in code does not reach old shows.
- Why kept: the show format `v: 1` must stay exact.
- Future fix: with a format `v: 2`, save only user presets.

### D5. Old shows get the three newer groups only into empty slots

- Source: `index.html:1550`, `1958`, `2303`
- What it does: `NEW_GROUPS` lists group names, not slot numbers. If an old show has a user group in slot 35, 36 or
  37, the new group is not added. `defaultGroups()` must keep its order, because the demo show and the guide refer
  to group numbers (comment at 1550; `G(24)`, `G(31)`, `G(33)` in 2388-2412; tour text at 2851).
- Why kept: loader parity.
- Future fix: none needed; keep the "append only" rule in a comment in `src/engine/defaultGroups.ts` and `src/show/DemoShow.ts`.

### D6. `persist()` hides storage errors

- Source: `index.html:2309`
- What it does: a full or blocked localStorage fails silently, so the user is not told that the show was not saved.
  The same pattern is in `saveLayout` (2941), the guide flag (2842) and boot (3089, 3091).
- Why kept: no UI change in the refactor.
- Future fix: report a failed save once with a toast.

### D7. A saved `maSize` equal to the default is read as "no size"

- Source: `index.html:3080-3082`
- Code:
  ```js
  const s = +L.maSize;
  if (Number.isFinite(s) && s > 0 && s !== MA_SIZE) maSize = clamp(s, 0.3, 0.7);
  ```
- What it does: older versions saved `MA_SIZE` (0.47) without a grip drag. That value is treated as the adaptive
  default. A user who drags exactly to 0.47 also gets the adaptive default after reload.
- Why kept: `lumadesk-layout2` compatibility.
- Pinned by: `tests/unit/show/layoutPrefs.test.ts` ("reads the default size as adaptive (known quirk D7)"). Also
  covered by `tests/e2e/layoutRestore.spec.ts` (`LayoutManager.restore` at boot: a saved 0.47 is dropped by the
  save at the end of boot, 0.55 stays).
- Future fix: none needed while old layouts exist.

### D8. A broken saved show is replaced by the demo with no message

- Source: `index.html:3089-3090` (`catch (e) { }`, then `if (!loaded) buildDemo()`)
- Lives in: `src/show/restoreShow.ts` (the `catch` before `demo.load()`)
- What it does: if the saved show is not valid JSON, or the loader throws on it, boot loads the demo. The demo's
  first save (500 ms later) overwrites the broken save, so the data is lost and the user is not told.
- Why kept: boot parity; same rule as D1 and D6.
- Pinned by: `tests/e2e/storage-failures.spec.ts` ("a damaged saved show falls back to the demo and is overwritten").
- Future fix: keep a copy of the unreadable text under a second key and show a toast once.

### D9. An unknown stored `deskMode` is used as it is

- Source: `index.html:3080` (`deskMode = L.deskMode || 'ma'`)
- Lives in: `src/show/LayoutPrefs.ts` (`textOr`) and `LayoutManager.restore` (`src/ui/layouts/LayoutManager.ts`,
  writes it into `#layoutSel`)
- What it does: a stored text that is not `ma`, `desk` or `classic` is kept. The layout select gets that value, so
  it shows no option, and the page is drawn in the classic layout. Only an empty value falls back to `ma`.
- Accepted change: a stored `deskMode` or `deskZoom` that is not a string now gives `ma` or `auto` (section L).
- Why kept: `lumadesk-layout2` compatibility and DOM parity.
- Pinned by: `tests/unit/ui/layouts/layoutPrefsParity.test.ts`: "keeps an unknown saved layout name ... (quirk)"
  and "reads saved names that are not text ... (accepted change)". `tests/e2e/layoutRestore.spec.ts` covers
  `LayoutManager.restore` with a saved known layout at boot.
- Future fix: accept only the three known names and fall back to `ma`.

## E. Auto Show and audio

### E1. BPM is rounded, but the beat offset uses the unrounded value

- Source: `index.html:2652-2657`
- Code:
  ```js
  for (let b = 70; b <= 180; b += .5) { ... if (sum > best) { best = sum; bb = b; } }
  const per = fps * 60 / bb; ...
  return { bpm: Math.round(bb), off: (start / sr + bo / fps) % (60 / bb) };
  ```
- What it does: the search runs in 0.5 BPM steps. The offset is computed with, for example, 127.5 BPM; the returned
  BPM is 128. `songSync` (2679) then uses 128 with that offset, so the lights drift slowly against the music on a
  half-step tempo.
- Why kept: the plan has a seedable `BpmDetector` with a golden result. It must return the same numbers.
- Future fix: return the unrounded tempo for sync and round only for display.

### E2. The song length is shown with rounded minutes

- Source: `index.html:2668`
- Code:
  ```js
  `${Math.round(ab.duration / 60)}:${String(Math.round(ab.duration % 60)).padStart(2, '0')}`;
  ```
- What it does: a 2:40 song (160 s) shows as `3:40`; a 59.6 s remainder shows as `:60`.
- Why kept: DOM parity of the status line.
- Future fix: `Math.floor` for minutes and seconds (as the REC timer does at 2908).

### E3. While a song plays, TAP has no lasting effect

- Source: `index.html:2679`, called every frame at `2531`
- What it does: `songSync` sets `bpm` and `beatOrigin` from the song on every frame, so a TAP is overwritten at
  once.
- Why kept: behavior parity.
- Future fix: disable or relabel TAP while a song plays.

### E4. Auto Show uses `Math.random` directly

- Source: `index.html:2555`, `2577-2612`
- What it does: looks are not reproducible. Phase 1 seeds `Math.random` under `?test` for this reason.
- Why kept: the refactor adds a seedable `LookGenerator`, but in normal runs it must still use `Math.random`, and in
  the same call order, so that seeded golden looks match.
- Future fix: none; the injected RNG is the fix.

### E5. Section `intro` has a name but no style uses it

- Source: `index.html:2557`, `2575`, style `sections` at `2559-2567`
- What it does: `SEC_NAMES.intro` exists; no style lists `intro`, and `secE` has no `intro` entry (it would fall back
  to 0.8).
- Why kept: harmless data.
- Future fix: remove it or add it to a style on purpose.

### E6. "Build 8-cue list" never uses executor 1

- Source: `index.html:2720`
- Code:
  ```js
  let ei = execs.findIndex((e, i) => i > 0 && !e.cues.length);
  ```
- What it does: an empty executor 1 is skipped. The new cues are written without `invalidate()` and with the extra
  `sec` field removed; the executor is not turned off first (it is empty, so it is off unless a flash is held).
- Why kept: behavior parity.
- Future fix: none required; document that executor 1 is reserved for the main show.

### E7. The generated look carries an extra `sec` field

- Source: `index.html:2614`, `2715`, `2721`
- What it does: `genLook` returns `{ ..., sec }`. The AUTO executor keeps it; the save paths delete it before a cue
  goes into a real executor. The `Cue` type must allow it on AUTO cues only, or `LookGenerator` returns it beside the
  cue.
- Why kept: saved show JSON must not gain `sec`.
- Future fix: return `{ cue, section }`.

### E8. TAP tempo clamps to 40 BPM at the low end

- Source: `index.html:2249` (`clamp(Math.round(60000 / iv), 40, 220)`)
- Lives in: `src/engine/Tempo.ts` (`MIN_BPM = 40`)
- What it does: taps older than 2.5 s are dropped, so the slowest real tap interval is just under 2.5 s (24 BPM).
  Slow taps therefore reach the 40 BPM floor, and the tempo shows 40, not the tapped speed.
- Why kept: tempo parity (see also Q16).
- Pinned by: `tests/unit/engine/state/Tempo.test.ts` (400 random tap runs against the original handler).
- Future fix: none needed; 40 BPM is a sane floor for a lighting desk.

## F. Rendering

### F1. The Old City wall floodlight is always off

- Source: `index.html:1000`, `1783`
- Code:
  ```js
  const wl = new THREE.PointLight(0xffb060, 0, 140, 1.4); ...; WALL_LIGHT.l = wl;   // 1000
  if (WALL_LIGHT.l) WALL_LIGHT.l.intensity = 0;                                     // 1783, every frame
  ```
- What it does: the light is created at intensity 0 and set to 0 again on every frame. It still counts as a light in
  the Three.js shader programs.
- Why kept: removing a light changes the compiled shaders and can change pixels; screenshot parity.
- Future fix: remove the light, or connect it to a level.

### F2. Two identical "up" vectors

- Source: `index.html:761` (`UP3`), `1311` (`UP`)
- What it does: both are `new V3(0, 1, 0)`. `UP3` is used by instanced rotations (989, 1183), `UP` by surface hits
  (1704, 1706, 1761, 1765). `hitSurface` returns `UP` and the caller compares by identity (`n === UP`, 1761, 1765),
  so `UP3` must not be used in its place.
- Why kept: the identity check makes merging them a behavior risk.
- Future fix: one shared constant, and compare surfaces by a tag instead of by object identity.
- Status: no longer in the code — one shared `UP` (`src/domain/venue.ts`) serves the rotations and the surface hits,
  and the hit code still compares by identity with that one object.

### F3. Redundant checks in the beam hit and pool code

- Source: `index.html:1705-1706`, `1761`
- Code:
  ```js
  if (!best) { ...; if (t > 0 && (!best || t < best.t) && ...) best = { t, n: UP }; }      // 1705-1706
  if (n === UP && L < 40 && hit && T.shape !== 'blinder') keyCand.push(...);             // 1761, inside if (hit)
  ```
- What it does: `!best` is always true inside `if (!best)`; `hit` is always truthy inside `if (hit)`. No effect.
- Why kept: no effect; keep the code shape so a reviewer can compare it line by line.
- Future fix: delete the dead terms.
- Status: no longer in the code — `src/render/surface/hitSurface.ts` and
  `src/render/fixtures/sync/poolContributions.ts` leave the two terms out; they had no effect.

### F4. Comment says 3 shadow lights; the code has 4

- Source: `index.html:1306-1308`
- Code:
  ```js
  /* real spot lights: the brightest fixtures hitting the stage light performers & scenery (3 with soft shadows) */
  const KEY_N = 12,
    KEY_SH = 4,
    keyLights = [];
  ```
- Why kept: the value (4) is the behavior; the comment is wrong.
- Future fix: correct the comment when the code moves (this is a comment fix, not a behavior change, so it may be
  done in the refactor).
- Status: no longer in the code — `src/render/lights/KeyLights.ts` keeps `SHADOW_COUNT = 4` under a comment that
  no longer gives a count.

### F5. Turning off "Real light" switches the shadow map at runtime

- Source: `index.html:2253`
- What it does: `renderer.shadowMap.enabled` is toggled without marking materials for update. Not verified: Three.js r160 may keep
  shadow code in already compiled materials until they recompile.
- Why kept: render parity.
- Future fix: set `material.needsUpdate` on affected materials after the toggle, or only zero the key lights.

### F6. `matStone` and `matPerson` are created and never used

- Source: `index.html:925`, `926`
- Lives in: `src/render/venue/materials.ts` (`createVenueMaterials`)
- What it does: the two materials are created and dropped. No mesh uses them.
- Why kept: three.js gives every material a uuid from `Math.random`, which the suite seeds. Removing the two
  materials shifts every later uuid and every later random value, so venue parity breaks (decision 24 in
  `docs/plan/extraction/00-decisions.md`).
- Pinned by: `tests/unit/render/venue/venueParity.test.ts` (golden `tests/golden/venue-scene.json`).
- Future fix: delete both in one commit that re-records the venue golden and the screenshot baselines.

### F7. Nosing, FOH desk and roof slab create their material before their geometry

- Source: `index.html:931` (nosing), `1009` (FOH desk), `1032` (roof slab)
- Lives in: `src/render/stage/DeckBuilder.ts` (nosing), `src/render/venue/FohRiser.ts` (FOH desk),
  `src/render/stage/goalpostAndRoof.ts` (roof slab)
- What it does: the original passed `new THREE.MeshStandardMaterial(...)` as an argument to `box()`, so the
  material was created before the box geometry. The new code creates the material first in a local variable.
- Why kept: the creation order sets the uuid order (decision 24); the other order changes the venue golden.
- Pinned by: `tests/unit/render/venue/venueParity.test.ts`.
- Future fix: none needed; the order costs nothing.

### F8. The orchestra has 30 players, not 20

- Source: `index.html:1148` (comment `orchestra (20)`)
- Lives in: `src/render/venue/Orchestra.ts`, rows in `src/render/venue/orchestraRows.ts`
- What it does: the code builds 30 players, 3 rows of 5 on each side; 27 sit, and the 2 double basses and the
  timpani player stand. With the 8 band members the stage holds 38 performers. The comment and the extraction map
  said 20.
- Why kept: the scene is the behavior; the comment was wrong. The README already says 30.
- Pinned by: `tests/unit/render/venue/venueParity.test.ts`.
- Future fix: none; the new code does not repeat the wrong count.
- Status: no longer in the code — the wrong count was only in a comment, and `src/render/venue/Orchestra.ts` does
  not repeat it.

### F9. A later setView stops a running view tween

- Source: `index.html@48a3b63:888-890`; reachable through the layout switch at `2979`
- Lives in: `src/render/camera/tweenCamera.ts`, `src/render/camera/CameraViews.ts:66`
- What it did: an animated view change ran a 700 ms tween that nothing could stop. An instant view set within those
  700 ms (for example: click FOH, then switch to the MA layout) was overwritten by the old tween, so the camera
  ended on the desk FOH pose with the MA lens. An animated view set after an animated one already won, because the
  newer tween wrote last in each frame.
- Why changed: the Stage Builder refits the camera with an animated `setView` after every stage rebuild, so the
  overwrite became easy to reach. Every `setView` now stops the running tween first.
- Pinned by: `tests/unit/render/core/CameraViews.test.ts` ("stops a running tween…"). Screenshots use only instant
  views at boot, so they do not change.
- Future fix: none.

## G. UI

### G1. The fixture sheet shows output dimmer but programmer-level everything else

- Source: `index.html:2222`, `2225`, `2229`
- What it does: the Dim column uses `f.out.dim` (after phasers, Highlight, Blackout and Grand Master). Pan, Tilt,
  Gobo, Zoom and the color swatch use `f.base` (before phasers and masters).
- Why kept: DOM parity.
- Future fix: pick one, or label the column.

### G2. CSS colors are built with unrounded `* 2.55`

- Source: `index.html:1974`, `2117`, `2229`, `2683`, `3027`; `* 255` in `2083`
- What it does: strings like `rgb(255,147.9,0)`. Browsers accept fractions, so the color is right. The refactor
  replaces the 15 copies with one `cssRgb()`; it must produce the same string (no rounding), or the sheet's
  change-detection (`put`, 2223) and screenshots may differ.
- Why kept: DOM parity.
- Future fix: round in `cssRgb()` after the refactor.

### G3. FAN key and the Fan button update the key's light in different ways

- Source: `index.html:2101`, `2238`, `2539`
- What it does: the Fan button in the Position tab toggles `#kFan` at once; the FAN key leaves it to the 50 ms UI
  tick (2539). The result is the same within one tick.
- Why kept: no visible effect; keep the paths separate until `StoreModeGuard`/key handling is merged.
- Future fix: one `toggleFan()`.

### G4. Keypad ENTER does not reset the history index

- Source: `index.html:2933` versus `2260`
- What it does: Enter in the text field sets `hi = -1`; ENTER on the on-screen keypad does not. After a keypad
  command, the next ArrowUp starts from the old history position.
- Why kept: interaction parity.
- Future fix: share one `submit()` in `CommandLine`.

### G5. Box select and click have a 5 px dead zone at exactly 5 px

- Source: `index.html:2466`, `2470`
- Code:
  ```js
  if (down.box && moved > 5) { ... } else if (moved < 5 && ev.target === canvas) { ... }
  ```
- Lives in: `src/ui/panels/viewport/ViewportPicking.ts` (`CLICK_SLOP_PX = 5`: box select on `moved > 5`, click pick
  on `moved < 5`)
- What it does: a pointer move of exactly 5 px does nothing. Box select also includes the LED screen (2001) when its
  center is inside the box.
- Why kept: interaction parity.
- Future fix: use `>=` in one branch; decide if box select should skip the screen like `All` does (1906).

### G6. `showTour` shadows the global `sel`

- Source: `index.html:2870`
- Code:
  ```js
  const [sel, title, txt, before] = TOUR[tIdx], ...
  ```
- What it does: inside the tour, `sel` is a CSS selector, not the fixture selection. No bug today, but a lint rule
  (`no-shadow`) will flag it.
- Why kept: no effect; the name changes when the code moves, which is not a behavior change.
- Future fix: rename to `target`.
- Status: no longer in the code — the tour code in `src/ui/guide/` has no variable that shadows the selection.

### G7. `buildExecs` slices a list that always has 10 items

- Source: `index.html:2150`
- Code: `execs.slice(0, 10).forEach(...)`
- Why kept: no effect.
- Future fix: iterate `execs`.
- Status: no longer in the code — no executor loop in `src/` slices the list.

### G8. The MA colour marker computes its hue inline

- Source: `index.html:3025-3026` (`updateMaUI`)
- Lives in: `src/ui/layouts/ma/colorMarker.ts` (`hueSixths`)
- What it does: the marker position uses `((g - b) / dl + 6) % 6` instead of `core` `rgb2hsv`. The two are equal in
  exact arithmetic, but in floating point they differ in the last digits of `style.left` for about 177,000 of
  1.03 million tested inputs (about 17%).
- Why kept: `style.left` is DOM output, and the screenshots would show the difference.
- Pinned by: `tests/unit/ui/layouts/ma/maPure.test.ts`.
- Future fix: switch to `rgb2hsv` in a commit that accepts the new screenshots.

### G9. The guided tour has 17 steps

- Source: `index.html:2846` (`TOUR`)
- Lives in: `src/i18n/he/tourSteps.ts` (text), `src/ui/guide/tourTargets.ts` (targets)
- What it does: the tour has 17 steps. The Phase 5 extraction map (`03-ui.md` section 9.4) said 18; the code is the
  reference.
- Why kept: the original is the behavior.
- Pinned by: `tests/unit/i18n/he.test.ts` (`toHaveLength(17)`).
- Future fix: none.

### G10. The top bar scrolls sideways; the legacy bar clipped its controls at 1280 px

- Source: `index.html` `#top` (`overflow: hidden`)
- Lives in: `src/styles/desk/_top-bar-layout.scss` (`#top`), `src/ui/panels/top/topBarMarkup.ts`
  (`buildStageButton`)
- What it did: at 1280 px the legacy bar ended after "Real light". The layout selects, REC, fullscreen, MIDI, Show
  File, Guide and the clock were cut off and could not be reached.
- What it does now: the bar scrolls sideways with a hidden scrollbar (trackpad, Shift+wheel, or Tab to a control), so
  every control is reachable. The scroll position is 0 at boot. The Stage Builder's "Build Stage" button opens the
  Glow group, so it shows at 1280 px in all three layouts; it pushes Fixture IDs and Real light to the scrolled part.
- Why changed: a new control must be visible, and the clipped controls were a defect, not a behavior to keep.
- Pinned by: `tests/e2e/screenshots.spec.ts` (the 9 baselines differ from the legacy bar only in the top bar).
- Future fix: a bar that wraps or folds its groups at narrow widths.

## H. Dead code and unused names

All of these have no effect. They are listed so that the refactor can delete or keep them on purpose and the
auditor does not count a deletion as a missed parity risk. Deleting an unused name does not change behavior, but
it must not change the call order of `Math.random` (none of these call it).

| Name                          | Line       | Note                                                                                                                                                                                                     |
| ----------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rgb2hsv`                     | 692        | Never called in the original. `updateMaUI` repeats the math inline at 3025-3026. `core/color.ts` keeps one `rgb2hsv`, but the MA marker stays inline because the results differ in the last digits (G8). |
| `def` in `fxEval`             | 1588       | Assigned, never read.                                                                                                                                                                                    |
| `matStone`, `matPerson`       | 925, 926   | Materials created, never used. Kept: removing them shifts every later three.js uuid (F6, decision 24).                                                                                                   |
| `tmpQ`                        | 1697       | Never used.                                                                                                                                                                                              |
| `audAcc`                      | 1714       | Never used (`aud` at 1717 does the job).                                                                                                                                                                 |
| `f0` in `updateEncUI`         | 2028       | Never used.                                                                                                                                                                                              |
| `M`, `P` in `buildDemo`       | 2331, 2332 | Helpers defined, never called.                                                                                                                                                                           |
| `POS.home` and `POS.straight` | 838, 839   | Two presets with the same function. Both names are referenced by presets and styles (1558-1559, 2560, 2563), so both must stay.                                                                          |
| `n` in `POS.band`, `POS.orch` | 851, 852   | Unused parameter.                                                                                                                                                                                        |

Two engine events have no subscriber today. `src/engine/Selection.ts` emits `selectionChanged` and
`src/engine/programmerActions/storeCue.ts` emits `cueStored`, but no `bus.on` listens to them: the UI polls the
selection on its tick (the original `uiDirty.sel` was never read either, Q2), and saving runs on `showChanged`. They
stay because ADR 0002 and decision 3 list them, and a panel can subscribe without an engine change.

## I. Service worker (`sw.js`)

The refactor keeps this logic (see ADR 0003). Only the shell list and the cache name become generated.

### I1. The cache name is a hand-edited version string

- Source: `sw.js:2`
- Code: `const CACHE = 'luma-desk-v13';`
- What it does: a new cache is used only when someone edits this line. The plan text says `luma-desk-v12`; the
  current value is `v13`.
- Status: fixed by design in Phase 7 (ADR 0003). `build/cacheName.ts` makes the name `luma-desk-` + a hash of the
  shipped files.

### I2. Every navigation is cached as `./index.html`, whatever the status

- Source: `sw.js:17-18`
- Code:
  ```js
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const c2 = r.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', c2));
        return r;
      })
      .catch(() => caches.match('./index.html')),
  );
  ```
- What it does: any page response is stored as the app shell, including a 404 page or a redirect for a wrong path
  under the scope. Offline, every navigation gets that stored page.
- Why kept: behavior parity of the worker.
- Future fix: cache only `r.ok` responses for the start URL.

### I3. Cache writes are not awaited

- Source: `sw.js:18`, `23`
- What it does: `cache.put` runs after the response is returned, without `e.waitUntil`. The browser may stop the
  worker before the write ends, so a write can be lost.
- Why kept: parity.
- Future fix: wrap the write in `e.waitUntil`.

### I4. Reads ignore the query string; writes keep it

- Source: `sw.js:22-23`
- Code:
  ```js
  const hit = await c.match(e.request, { ignoreSearch: true });
  ... c.put(e.request, r.clone()) ...
  ```
- What it does: `a.js?x=1` and `a.js?x=2` share one cache entry for reads, but each write adds a new entry. Hashed
  file names from Vite make this less important.
- Why kept: parity.
- Future fix: normalize the key before `put`, or drop `ignoreSearch`.

### I5. Offline with no cache entry returns no response

- Source: `sw.js:23-24`
- What it does: `.catch(() => hit)` gives `undefined` when there is no hit, so `respondWith` gets `undefined` and the
  request fails with a network error.
- Why kept: the result (a failed request) is the same as without the worker.
- Future fix: return `Response.error()` explicitly.

### I6. Opaque cross-origin responses are cached

- Source: `sw.js:23`, fonts at `index.html:16-17`
- What it does: Google Fonts responses are cached so the app looks right offline. Opaque responses have unknown size
  and status, and can fill the storage quota.
- Why kept: offline fonts.
- Future fix: self-host the two fonts with the build.

### I7. Activate deletes every other cache on the origin

- Source: `sw.js:14`
- Code:
  ```js
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))));
  ```
- What it does: on GitHub Pages, all project sites of one user share one origin (`https://gilad1987.github.io`).
  This deletes the Cache Storage of any other app on that origin, not only old LUMA DESK caches.
- Why kept: parity; Phase 7 keeps the hand-written logic.
- Future fix: delete only keys that start with `luma-desk-`. This is a small, safe change and a good first fix after
  the refactor.

### I8. A new worker takes control at once

- Source: `sw.js:13-14`
- What it does: `skipWaiting()` and `clients.claim()` activate a new worker under an open page. The page keeps the
  old code in memory, but later requests come from the new cache. With one HTML file and vendored
  modules this was safe. Inference, not yet tested: with Vite chunks, an old page can request an old chunk hash that the new cache does not
  hold; it then goes to the network, which also no longer has it after a deploy.
- Why kept: parity.
- Future fix: keep the old cache until all clients reload, or show "update ready, reload".

### I9. `addAll` fails the whole install on one missing file

- Source: `sw.js:13`
- What it does: if any file in `SHELL` returns an error, the new worker does not install and the old one stays. A
  hand-edited list can drift from the real files.
- Why kept: parity; Phase 7 generates the list from the build output, which removes the drift.
- Future fix: covered by the generated list.

### I10. The worker registers only on http(s) and ignores errors

- Source: `index.html:2916`
- Code:
  ```js
  if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
    navigator.serviceWorker.register('sw.js').catch(() => {});
  ```
- What it does: on `file://` there is no worker; a failed registration is silent. The relative URL gives a scope of
  the app folder.
- Why kept: parity. `playwright.config.ts` blocks service workers (`serviceWorkers: 'block'`); the worker specs
  `tests/e2e/swOffline.spec.ts` and `tests/e2e/swCaching.spec.ts` allow them with `test.use`.
- Lives in: `src/io/serviceWorkerRegistration.ts` (`registerServiceWorker`, called from
  `src/app/io/wireAppFeatures.ts`).
- Future fix: log the failure in dev builds.

### I11. Shell URLs are not passed through `encodeURI`

- Lives in: `build/shellUrls.ts`
- What it does: the build writes each shipped file name into `SHELL` as `./<name>`, with no `encodeURI`. A name with
  a space or `%` would give a wrong URL, and `addAll` would fail the install (I9).
- Why kept: every name that ships today is plain ASCII (Vite hashes, `icons/`, `manifest.webmanifest`), so encoding
  would change nothing and only add a step the old hand-written list did not have.
- Pinned by: `tests/unit/swManifest.test.ts` ("starts with the folder URL and lists every file relative to the
  worker, sorted").
- Future fix: encode each name if `public/` ever holds a file with such characters.

## J. Refactor departures on paths that only crash

Strict types (`noUncheckedIndexedAccess`) make every indexed read handle the missing case. Where the original read
`undefined` and then crashed with a `TypeError` somewhere else, the new code throws a `RangeError` at the read, with
a message that names the bad value. J4 to J6 change other details of a path that fails: J5 removes a data loss on
a failed import, J6 changes an error text. These are the only behavior changes the refactor accepts (see also
section L): each path is either unreachable from the UI or crashed in the original too.

### J1. `hsv` throws a `RangeError` for a hue that is not finite

- Source: `index.html:691`
- Lives in: `src/core/color.ts` (`hsv`)
- What it does: the original returned `undefined` when `h * 6` was not finite (`NaN`, infinite, or above
  `Number.MAX_VALUE / 6`), and every caller crashed at once on the destructure. The new code throws
  `RangeError: hsv: hue * 6 must be finite, got hue ...` (decision 22).
- Why kept: the failure was already a crash; now it names the cause.
- Pinned by: `tests/unit/core/color.test.ts`.

### J2. `cueAt` and `storeCue` throw a `RangeError` for an index out of range

- Source: `index.html:1628` (`e.cues[i].fade`), `1847-1850` (`storeCue` reads `execs[ei].cues`)
- Lives in: `src/engine/CueList.ts` (`cueAt`), `src/engine/programmerActions/storeCue.ts`
- What it does: callers pass an index they have already checked, so a miss is a programming error. The original
  threw a `TypeError` on `undefined`; the new code throws `RangeError: No cue at index ...` or
  `RangeError: No executor at index ...`. The command line checks the executor first ("No such executor", 1918),
  so no operator input reaches these throws. C7 is the exception: there the original text is user-visible and kept.
- Why kept: unreachable from the UI.
- Pinned by: `tests/unit/engine/playback/cueListAndFx.test.ts` (`cueAt`). The `storeCue` throw has no test.

### J3. The `band` and `crowd` position presets throw a `RangeError` for a negative index

- Source: `index.html:846` (`crowd`), `851` (`band`)
- Lives in: `src/engine/positionPresets.ts` (`cycle`)
- What it does: `k` is the fixture's index in the selection, so it is never negative. With a negative `k` the
  original read `undefined` from its list (a `TypeError` in `band`; a `NaN` target in `crowd`, from reading the
  code). The new code throws `RangeError: preset index ... is not a selection index`.
- Why kept: unreachable; the preset loop passes indexes from 0.
- Pinned by: `tests/unit/engine/state/positionPresets.test.ts`.

### J4. A MIDI message with no data is ignored

- Source: `index.html:2492` (`const [st, d1, d2] = m.data`)
- Lives in: `src/io/Midi.ts` (`event.data ? decodeMidiMessage(event.data) : undefined`)
- What it does: `MIDIMessageEvent.data` can be `null` in the DOM types. The original destructured it and threw a
  `TypeError` in the event handler; the message had no effect. The new code skips the message. A short message
  (fewer than 3 bytes) still reads the missing bytes as `NaN`, as before (`src/io/midiMessage.ts`).
- Why kept: the original only crashed on this path; a real device always sends data.
- Pinned by: `tests/unit/io/Midi.test.ts` ("ignores a message whose data is null and does not throw (quirk)").

### J5. A failed import no longer drops the user's presets

- Source: `index.html:2301` (`presets = defaultPresets()`), `2304` (the copy loop that throws), caught at `2320`
  and `2321` (`toast('Invalid JSON')`, `toast('Invalid file')`)
- Code:
  <!-- prettier-ignore -->
  ```js
  groups = d.groups || defaultGroups(); presets = defaultPresets(); // 2301
  for (const t in d.presets || {}) for (const s in d.presets[t]) presets[t][s] = d.presets[t][s]; // 2304
  ```
- Lives in: `src/show/ShowSerializer.ts:62` (`load`: `presets.replace(withSavedPresets(defaultPresets(), d.presets))`),
  `src/show/savedPresets.ts` (`withSavedPresets` throws `Unknown preset pool ...`)
- What it does: a show whose `presets` has a slot in a pool number the desk does not have throws at 2304. The
  original had already reset the presets to the defaults at 2301, so the import failed and the user's own presets
  were gone too; the next save stored the loss. The new code builds the presets first and replaces them only when
  the build succeeds, so a failed import keeps the user's presets. The groups are still replaced before the throw,
  as at 2301, and the executors stay as they were, as before.
- Accepted change: the import fails in both versions; only the data loss on that failure is gone. It is fixed on
  purpose, and no golden covers it.
- Pinned by: `tests/unit/show/showSerializer.test.ts` ("quirk J5: a preset pool the desk lacks throws, keeps the
  presets and executors, replaces the groups (accepted change)").

### J6. `Pause` on a fractional executor names `pause`, not `fade`, in its error

- Source: `index.html:1920` (`selExec = clamp(num() - 1, 0, 9)`, no rounding), `1924`
  (`execPause(execs[selExec])`), `1640` (`execPause` reads `e.fade` first)
- Lives in: `src/command/run/runPlayback.ts:30` (`runPause`: `executorAt(..., 'reading', 'pause')`)
- What it does: `Exec 2.5` selects index 1.5, which has no executor. A following `Pause` failed in the original
  with `Cannot read properties of undefined (reading 'fade')`, because `execPause` read `e.fade`. The new code
  logs `Cannot read properties of undefined (reading 'pause')`, the call it makes on the missing executor.
- Accepted change: the error text differs. Both versions fail the command, change no state and show a red line in
  the command feedback. The change is accepted because this path only crashes, on an executor index that is not
  valid. C7 keeps the original text for every other command that reaches `executorAt`; this `Pause` text is the
  one case that C7 does not cover.
- Pinned by: `tests/unit/command/CommandRunner.test.ts` ("quirk J6: Pause on a fractional executor logs (reading
  'pause') (accepted change)").
- Future fix: goes with C2 (validate the executor number, and round or reject a fraction, in the parser).

## K. Test mode (`?test`)

### K1. Test mode freezes the clock and frames, but not timers

- Source: none. The `?test` block was added in the refactor (`index.html@48a3b63` has no test mode), so K1 records
  test infrastructure, not kept behavior.
- Lives in: the `?test` block in the `<head>` of `index.html`
- What it does: with `?test`, `performance.now()` and `Date` return a frozen time that moves only on
  `__desk.test.advance(ms)`, `requestAnimationFrame` callbacks run only on `frames(n)`, and `Math.random` is
  seeded. `setTimeout` and `setInterval` are not patched: they run on real time. Code that waits on a timer (the
  show save debounce in `src/show/ShowStorage.ts`, toast timers in `src/ui/components/Toast.ts`, the console-info
  clock in `src/ui/layouts/startConsoleInfo.ts`, the guide opening 600 ms after boot) runs when real time passes,
  and reads the frozen clock when it does.
- Why kept: the goldens and screenshots need only the frame clock frozen. Specs that need a timer poll for its
  result (`tests/shared/timerPolling.ts`).
- Future fix: none planned; a fake timer queue would change when the save and the toasts happen in every spec.

## L. Corrupt-save-only changes

The show and layout readers now check the type of each field they read (`src/show/readShowFile.ts`,
`src/show/LayoutPrefs.ts`). A field of the wrong type counts as missing, so the default applies. This changes the
result only for a save with wrong types. No save written by any desk version is affected: every writer stores the
right types, and `JSON.stringify` turns `NaN` into `null`, which gives the same default as before (`null || 120`,
`null ?? 0.62`, `null ?? 0`). Pinned by: `tests/unit/show/showFileInput.test.ts` (show rows) and
`tests/unit/ui/layouts/layoutPrefsParity.test.ts` (layout row).

| Saved value                                                | Original (`index.html@48a3b63`)                                                                                                                                                                                                                                                                             | Now                                                                                                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `bpm` or `haze` not a number                               | used as it was (`d.bpm \|\| 120`, `d.haze ?? .62`, line 2306)                                                                                                                                                                                                                                               | default (120, 0.62)                                                                                                                  |
| executor `name`, `level` or `cues` of the wrong type       | used as it was (line 2305)                                                                                                                                                                                                                                                                                  | default (`''`, 0, `[]`)                                                                                                              |
| `groups` a truthy primitive, or `presets` a non-empty text | threw part-way in strict mode, e.g. `{ groups: 7 }` (lines 2301-2304)                                                                                                                                                                                                                                       | ignored                                                                                                                              |
| `execs` an object with number keys                         | read by index (`(d.execs \|\| [])[i]`)                                                                                                                                                                                                                                                                      | ignored                                                                                                                              |
| `deskMode` or `deskZoom` in the layout not text            | used as it was (`L.deskMode \|\| 'ma'`, line 3080)                                                                                                                                                                                                                                                          | `ma` / `auto`                                                                                                                        |
| group `ids` saved as text (`"101"`)                        | kept as text in the selection (`FX[id]` matched, line 1796); later `sel.includes(101)` missed it, so add and toggle (lines 1798, 1800), applying a phaser (line 1827), the phaser encoders such as spread (line 1834), Remove Phasers (line 2129) and Store Group treated `"101"` and `101` as two fixtures | read as numbers (`Number(id)`); text that `Number` reads but an object key did not (`" 101"`, `"0x65"`, `"1.01e2"`) now also matches |

Notes:

- `groups` or `presets` given as a non-empty string: the earlier port spread the string into one entry per
  character. The original module ran in strict mode and threw a `TypeError` part-way through `loadShow`, after
  `groups` and the presets were already replaced. Now a truthy `groups` that is not an object gives an empty pool
  that only the newer default groups fill, and a `presets` that is not an object is skipped.
- A saved show of JSON `null` still throws before anything changes, as reading a field of it always did.
- Group `ids` saved as text: the show reader does not check them; `Selection.set` (`src/engine/Selection.ts`) reads
  each id with `Number` before the rig lookup. Pinned by: `tests/unit/engine/state/Selection.test.ts`.

## Q. UI quirks from the Phase 5 extraction map

These came from the Phase 5 map (`docs/plan/extraction/03-ui.md`, section 10) and keep their numbers, because the
UI code cites them (for example `quirk Q11` in `src/ui/panels/command/CommandLine.ts`). "Line" is the line in
`index.html@48a3b63`. Some repeat an entry above (Q3 = B1, Q6 = G4, Q8 = A12, Q10 = G3, Q11 = C6, Q16 = E8,
Q18 = B8, Q33 = D7). All are kept for DOM and interaction parity; the panel markup tests
(`tests/unit/ui/panels/`) and the screenshot suite (`tests/e2e/screenshots.spec.ts`) pin the visible ones.

| #   | Line                   | Quirk                                                                                                                                                                                                                                 |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | 267, 2151, 2157        | `.ex-sel{display:none}` is global: the SEL button is built and wired but hidden in **all** layouts.                                                                                                                                   |
| Q2  | 1802                   | `uiDirty.sel` is set but never read. Removing the flag changes nothing; keep `setSel` side effects otherwise.                                                                                                                         |
| Q3  | 2133, 2122             | `applyPresetTo(t,n)` only calls `applyPreset` (also in plan). Status: no longer in the code — see B1.                                                                                                                                 |
| Q4  | 82, 576, 1959          | `.slot.active` style is never applied; `#grpHint` is never written; pools do not re-render on selection change.                                                                                                                       |
| Q5  | 2911                   | `F` toggles fullscreen even when a SELECT is focused, the modal is open or the tour runs (only guide and INPUT/TEXTAREA block it).                                                                                                    |
| Q6  | 2933                   | Keypad ENTER pushes history but does not reset `hi`; it pushes before the `store` check (same as 2260). Empty ENTER only clears.                                                                                                      |
| Q7  | 2887 + 2271            | Escape during the tour ends the tour **and** cancels STORE (capture then bubble).                                                                                                                                                     |
| Q8  | 2159                   | Exec off button: `e.level = i === 0 ? e.level : 0` — exec 1 keeps its fader level, others go to 0.                                                                                                                                    |
| Q9  | 2105, 2101, 2238       | `#encExtra` is not re-rendered when the selection changes: the gobo tab keeps "LED screen content" vs "Gobo wheel" from the last render; `Fan ON/off` button text refreshes only via its own button or `#kFan` when `feat === 'pos'`. |
| Q10 | 2238, 2101, 2539       | `#kFan` click does not toggle its `.on` class itself; the 50 ms tick does (2539). The encExtra Fan button toggles it at once (2101).                                                                                                  |
| Q11 | 1888, 2182, 2184, 2197 | `log` and `#hudCue` use `innerHTML` with user names (cue/group names are not escaped). Rename input escapes only `"` (2280).                                                                                                          |
| Q12 | 2201                   | Sequence row click ignores `ev.detail > 1`, so a double-click on a row does not re-goto; a click on a stopped exec at level 0 sets level 1.                                                                                           |
| Q13 | 2157, 2160             | STORE + exec name stores and also selects the exec; STORE + GO+ stores, selects, does **not** GO.                                                                                                                                     |
| Q14 | 2163–2165              | FLASH: `pointerleave` also releases; a flash on an off exec sets `flashOnly` and goes to the cue with fade 0; release turns it off only if `level === 0`. A fader drag clears `flashOnly` (2166).                                     |
| Q15 | 2260–2261              | Bare `store` (any case, spaces) in `#cmd` enters store mode instead of running; Escape in `#cmd` clears, blurs and cancels STORE.                                                                                                     |
| Q16 | 2249                   | TAP: every tap moves `beatOrigin`; taps older than 2.5 s drop; bpm = round(60000 / mean interval), clamp 40–220, needs ≥ 2 taps.                                                                                                      |
| Q17 | 2543–2546              | A dirty flag forces the slow tick early, and fps is computed over that shorter window.                                                                                                                                                |
| Q18 | 3068                   | CLEAR first clears a half-typed command line, else `doClear` (double press < 400 ms = Clear All, 1837–1843).                                                                                                                          |
| Q19 | 2845, 2963, 2977       | `sideTo` clicks the tab button (synthetic click → `uiDirty`); in MA `sideTo('pools')` does nothing. Entering MA on the Pools tab forces Sheet and gives Pools back on leaving.                                                        |
| Q20 | 1996                   | In MA the encoder row is padded to ≥ 5 encoders with `ENC_FILL`; other layouts show only the feature's encoders.                                                                                                                      |
| Q21 | 2083                   | Color pad paints with one `fillRect` per pixel (204×124 at load, 3016).                                                                                                                                                               |
| Q22 | 2281, 2286             | Rename keeps the old name if the input is blank; number dialog closes on NaN without calling back; both set `uiDirty.all`.                                                                                                            |
| Q23 | 2184                   | When Auto is on, the HUD shows the auto status and `return`s before the `#pauseBtn` state update (2186).                                                                                                                              |
| Q24 | 2491–2497              | MIDI ignores the channel; each button click requests access again and rebinds; `onstatechange` rebinds all inputs.                                                                                                                    |
| Q25 | 2143–2147              | `setLevel`: level > 0 on a stopped exec with cues starts `max(0,cur)`; level to 0 from > 0 turns it off unless flashing.                                                                                                              |
| Q26 | 2290                   | `#hClose` is handled by a document-level click listener, not on the button.                                                                                                                                                           |
| Q27 | 3059–3066              | The `#maBody` wheel handler is registered in all layouts; it scrolls panes in 20 px steps (`deltaMode` lines ×20) and hands off from `#groupPool` to its pane at the ends.                                                            |
| Q28 | 2239, 1906             | `ALL` key and `All` command use the same "not screen" filter (→ `rig.lightIds()` per plan).                                                                                                                                           |
| Q29 | 2242                   | REVERSE mutates `sel` in place, then calls `setSel([...sel])`. Status: no longer in the code — `Selection.reverse` sets a reversed copy; the selection is the same.                                                                   |
| Q30 | 3010–3014              | MA special faders dispatch `input` on every move and `change` only when the value changed between pointer-down and `lostpointercapture` (or on dblclick if changed since last send).                                                  |
| Q31 | 2183                   | `Next:` text has two spaces before `(fade …)`.                                                                                                                                                                                        |
| Q32 | 2537                   | Selection chip: ids joined with spaces when < 6, else `first…last`.                                                                                                                                                                   |
| Q33 | 3082                   | A stored `maSize` equal to `MA_SIZE` (.47) is read as "no grip size" (adaptive).                                                                                                                                                      |
