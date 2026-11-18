# Extraction map 02 — Phase 3c (command, show, autoshow, audio) and Phase 4 (render)

Source: `scratchpad/index.base.html` (3096 lines, = `index.html` at 48a3b63). **All line numbers below are from that file.**
Plan line numbers (plan-desk.md) are from an older 2884-line file and are off by ~+200 in this region.
Script block: `<script type="module">` ends at 3094. `window.__desk` debug handle: 3093.

Legend: R = reads, W = writes, "bus" = planned EventBus event (`message`, `cueStored`, `poolsChanged`, `selectionChanged`, `stateDirty`).

---

## 0. Shared facts used by several sections (verified)

| Name | Line | Note |
|---|---|---|
| `log(msg, cls)` | 1888 | DOM: appends to `#cmdFb`, keeps last 2 lines. Uses `innerHTML` (msg is HTML). → bus `message {text, cls}` |
| `toast(m)` | 694 | DOM `#toast`, 1800 ms. → bus `message {text, kind:'toast'}` |
| `uiDirty` | 1949 (declared AFTER `runCmd` 1889 and `storeCue` 1847; only used at call time → no TDZ at runtime) | → bus `stateDirty` |
| `persist()` | 2309 | 500 ms debounce, `localStorage.setItem(LS, JSON.stringify(serialize()))`, errors swallowed |
| `nowS()` | 1623 | `performance.now()/1000` |
| `range(a,b)` | 805 | ids of fixtures with a<=id<=b (rig order, not sorted) |
| `has(f,a)` | 1574 | `f.T.attrs.includes(a)` |
| `deep(o)` | 689 | JSON clone |
| `COLORS` | 1553–1554 | 16 named colours (0–100 scale) |
| `defaultGroups()` / `defaultPresets()` | 1538–1552 / 1555–1567 | engine libraries (3b); used by show + demo |
| `PFN` / `presetVals` | 1568 / 1569–1573 | engine positionPresets (3b) |
| `"all fixtures except screen"` filter `fixtures.filter(f => f.type !== 'screen').map(f => f.id)` | 1547, 1906, 2341, 2579 | → `rig.lightIds()` (this map covers 1906, 2341, 2579) |
| COLOR lookup `{r:c[1],g:c[2],b:c[3]}` by name | 2333 (`C` in buildDemo), 2556 (`COL`) | identical bodies → one `colorByName(n)` in core/domain |

---

## 1. Phase 3c — `src/command/`

### 1.1 Source ranges

| Target | Source lines | Names |
|---|---|---|
| `command/aliases.ts` (or inside Lexer) | 1884–1887 | `ALIAS` table |
| `command/Lexer.ts` | 1890–1892, 1894 | normalisation regex chain (1891), split + lowercase (1892), `word()` classifier (1894: alias → keyword, number → `'#'`, else raw lowercased word) |
| `command/Parser.ts` (→ AST) | 1893–1897, 1899–1939 (parse half) | cursor `i`, `num()` 1895, `ids()` 1896 (`a Thru b`), select-mode state `mode`/`selected` 1893, the `switch` 1903–1939 |
| `command/CommandRunner.ts` | 1897 (`selectIds` side effect), 1904–1941 (execute half), 1942–1943 | engine calls listed in 1.4; final "N fixtures selected" message 1941; catch → error message 1942; `uiDirty.all = true` 1943 |
| NOT command/ (stays UI, Phase 5 `CommandLine` panel) | 2257–2264 (input, history `hist`/`hi`, bare `store` → `setStore(true)` 2260), 2931–2938 keypad ENTER (2933 repeats the bare-store regex) | |
| NOT command/ (engine 3b) | `setStore` 1879, `storeCue` 1847, `storeGroup` 1865, `storePreset` 1870 | already engine; runner calls them |

### 1.2 Lexer normalisation (1891) — keep order exactly

1. `trim`; empty → return (no `uiDirty` set, 1890).
2. `/go\s*\+/ig` → `'goplus '`  3. `/go\s*-/ig` → `'gominus '`  4. `/@/g` → `' at '`
5. `/\+/g` → `' + '`  6. `/\s-\s?/g` → `' - '`  7. `/^-/` → `' - '`
8. split on whitespace; `orig` keeps case (used for labels 1930 and error text 1938), `T` lowercased.

Quirk (keep): step 2/3 run on the raw text, so `"Ego+"`-like substrings inside a label also get rewritten. Step 6 means `"1 -2"` → `1 - 2`; `"-5"` at start → sub-mode. Negative numbers are never lexed as negative.
Quirk (keep): `word()` returns `'#'` for any token where `parseFloat` is not NaN, e.g. `"4.12"`, `"5abc"` (parseFloat → 5).

### 1.3 Full grammar accepted by `runCmd` (1899–1939)

`ALIAS` (1884–1887) maps: f/fi/fix/fixture/ch/channel→fixture; g/gr/group→group; t/thru/through→thru; at; full; zero; st/store→store; q/cue→cue; seq/sequence/exec/executor/ex/e→exec; c/clear→clear; ca/clearall→clearall; del/delete→delete; p/pr/preset→preset; hl/highlight→highlight; bo/blackout→blackout; go/goplus→go; gominus/goback→goback; goto; pause; label; fade; off; `+`; `-`; all.

A command line is a sequence of statements, run left to right until tokens end (loop 1899). Each statement:

| Statement (EBNF-ish) | Line | Engine effect |
|---|---|---|
| `NUM [Thru NUM]` (bare number) | 1901 | select ids (`ids()` 1896: `range(min,max)`; single → `[a]` even if fixture does not exist, filtered later in `setSel` 1796) |
| `Fixture NUM [Thru NUM]` | 1904 | select |
| `Group NUM` | 1905 | throw `Group n is empty` if missing; select copy of ids |
| `All` | 1906 | select all non-screen |
| `+` / `-` | 1907/1908 | set `mode` add/sub for NEXT select, `selected = true` |
| `At NUM` \| `At Full` \| `At Zero` \| `Full` \| `Zero` | 1909–1911 | needs selection (`No selection`), `progSet(id,'dim',v)` for every selected id; log `N fixtures At v` |
| `Store Group NUM` | 1914 | `storeGroup(n)` |
| `Store Preset T.S` | 1915 | token split on `.`; error `Use Store Preset 4.12` if `!presets[a] || !b` |
| `Store [Cue] [NUM] {Fade NUM \| Exec NUM}` | 1916–1918 | default exec = `selExec`; `storeCue(ex, n, {fade})`; `No such executor` |
| (after any Store) | 1919 | `setStore(false)` |
| `Exec NUM` | 1920 | `selExec = clamp(n-1,0,9)`; log |
| `Go [Exec NUM]` (incl. `Go+`) | 1921 | `execGo(execs[ex], 1)` |
| `GoBack [Exec NUM]` (incl. `Go-`) | 1922 | `execGo(execs[ex], -1)` |
| `Goto [Cue] NUM` | 1923 | selExec only; `Cue n not found`; if off & level 0 → level=1; `gotoCue` |
| `Pause` | 1924 | `execPause(execs[selExec])` |
| `Off [Exec NUM]` | 1925 | `execOff`; log |
| `Clear` | 1926 | `doClear()` (double-tap timing 400 ms, 1837–1843) |
| `ClearAll` | 1927 | `setSel([])`, `clearProg()`, `highlight=false` |
| `Preset T.S` | 1928 | `Preset not found`; `applyPreset(a,b)` |
| `Delete [Cue] NUM` | 1929 | selExec cue splice, `invalidate`, clamp `cur`, log, `persist()` |
| `Label (Cue\|Group\|Exec) NUM REST…` | 1930–1934 | name = rest of ORIGINAL tokens joined by one space, strip one leading/trailing `"`; consumes all tokens; group → `renderPools()`; `persist()` |
| `Highlight` / `Blackout` | 1935/1936 | toggle flags |
| `Fade NUM` | 1937 | sets current cue fade of selExec if `cur>=0` (no persist!) |
| other | 1938 | throw `Unknown keyword "<orig>"` |

Selection merge rule (1897): first select in a line replaces; later selects add (`'add'`), unless `-` → `'sub'`. After each select `mode` resets to replace but `selected` stays true → next select adds. Empty list → `No fixtures match`.
Final message (1941): if anything was selected and no `at/full/zero` token appears anywhere in the line → `N fixtures selected`.
Errors are thrown as **strings** (not Error) and logged with class `er` (1942). Statements before the error stay applied (no rollback). Keep.

### 1.4 Parser duplication (fix with `optExec()` / `findCue()` in the Parser)

| Pattern | Lines | Shared abstraction |
|---|---|---|
| `let ex = selExec; if (word() === 'exec') { i++; ex = num() - 1; }` | 1921, 1922, 1925 (and the loop form in 1917) | `optExec(): number \| undefined` → AST `exec?: number` (runner defaults to `selExec`) |
| `if (word() === 'cue') i++; const n = num(); … e.cues.findIndex(c => c.num === n); if (idx < 0) throw \`Cue ${n} not found\`` | 1923, 1929 (and `find` variant 1931 with message `'Cue not found'`) | `optKeyword('cue')` in Parser + `findCue(e, n)` in runner. Keep the two different messages (1923/1929 vs 1931). |
| `String(T[i++]).split('.').map(Number)` | 1915, 1928 | `presetRef()` |
| `n === full ? 100 : zero ? 0` | 1910 (twice in one line) | `level()` |

### 1.5 Globals and coupling of `runCmd`

| R | `T`, `orig` (local), `groups` 1905/1932, `presets` 1915/1928, `fixtures` 1906, `sel` 1911/1941, `selExec`, `execs` |
| W | `selExec` 1920, `highlight` 1927/1935, `blackout` 1936, `e.cues`/`e.cur` 1929, cue/group/exec `.name` 1931–1933, cue `.fade` 1937, `uiDirty.all` 1920/1943 |
| Engine APIs needed | `Selection.set(ids, mode)`, `Programmer.set(id,'dim',v)`, `Programmer.clear()`, `doClear` (engine or UI? it reads `performance.now()` 1838 — put in engine `Programmer.clearTap(now)`), `CueStore.storeCue/storeGroup/storePreset`, `StoreMode.set(false)`, `Executor.go/goto/pause/off/invalidate`, `PresetLibrary.apply`, `GroupLibrary`, `AppState.selExec/highlight/blackout`, `rig.range`, `rig.lightIds()` |
| DOM/UI calls to remove | `log` (1911, 1920, 1923, 1925, 1927, 1929, 1934, 1937, 1941, 1942) → bus `message`; `renderPools()` 1932 → bus `poolsChanged`; `persist()` 1929, 1934 → bus `stateDirty {persist:true}`; `uiDirty.all` → `stateDirty` |
| Time / random | none directly; `doClear` uses `performance.now()` 1838 |

Plan target: `CommandRunner.run(raw): void` with `Parser.parse(tokens): Statement[]` returning a discriminated union. **Parity trap:** the current code is *interleaved* (parse + execute per statement). Parsing the whole line first changes behaviour when a later token errors: today earlier statements already ran. The runner must execute statements in order and, on a parse error at statement k, still run statements 0..k-1 — i.e. either parse lazily (iterator/generator of statements) or parse to `{statements, error?}` and run all statements before reporting the error. Also `Label` consumes the rest of the line — the parser must do the same. Also `Store …` reads `selExec` *at execution time* (after an earlier `Exec n` statement in the same line) — the AST must store "default exec" not a resolved number.

---

## 2. Phase 3c — `src/show/`

### 2.1 Source ranges

| Target | Source lines | Names |
|---|---|---|
| `show/ShowSerializer.ts` | 2296–2299 `serialize`, 2300–2308 `loadShow` (data half) | |
| `show/ShowStorage.ts` | 2295 `LS='lumadesk-show-v6'`, 2309 `persist`, 3088–3090 boot load, 2842 guide-seen write, 3091 guide-seen read | |
| `show/LayoutPrefs.ts` | 2941 `saveLayout` (`lumadesk-layout2` → `{deskMode, deskZoom, maSize}`), 3080–3082 restore | |
| `show/DemoShow.ts` | 2327–2446 `buildDemo` | |
| UI only (Phase 5) | 2310–2322 `#fileBtn` modal (download `luma-show-<stamp>.json` with `JSON.stringify(…, null, 1)`, copy, demo, new, import text/file); `stamp` 2892, `downloadBlob` 2893 | |

### 2.2 Serialize format v1 (2296–2298) — exact key order

```
{ "v": 1,
  "groups":  { "<n>": { "name": string, "ids": number[] }, … },          // live object, insertion order
  "presets": { "1": {slot: preset…}, "2": …, "3": …, "4": …, "5": … },  // every type key kept, presets with kind==='fn' removed
  "execs":   [ { "name": string, "cues": Cue[], "level": number } × 10 ], // NOT autoExec
  "bpm":     number,
  "haze":    number }                                                     // hazeU.value 0..1 (render uniform!)
```
- Preset object shapes (1557–1565, 1876): `{name, kind:'global', vals:{…}}` (gobo presets add `gobo:i`, 1561), `{name, kind:'fix', fix:{<id>:{attr:val}}}`. `kind:'fn'` (positions 2.1–2.23, beam 5.1–5.3) are dropped.
- Cue shape (1853, 2340…): `{num, name, fade, vals:{<id>:{attr:val}}, fx:[{type, rate, size, spread, ids}]}`. Auto-built cues (2715, 2721) have the same shape (`sec` deleted). Key order inside cues is creation order — `storeCue` 1853 creates `num,name,fade,vals,fx`; demo cues same order.
- Integer-like object keys (`groups`, `presets[t]`, `vals`) serialise in ascending numeric order (JS rule) — preserve by using plain objects, NOT `Map`.
- `serialize` returns live references (no clone). Storage stringifies immediately; keep it pure.
- Pretty download uses indent 1 (2316); localStorage + copy use compact (2309, 2317).

### 2.3 Deserialize / back-compat (2300–2308) — exact behaviour

| Step | Line | Behaviour |
|---|---|---|
| groups | 2301 | `d.groups || defaultGroups()` (saved object used by reference) |
| new-group migration | 2303 | only if `d.groups`: for each default group whose name is in `NEW_GROUPS` (1958: `LED Bars`, `Follow Spots`, `Profiles` = slots 35–37) and slot empty → add |
| presets | 2301, 2304 | start from `defaultPresets()`, then overwrite slot-by-slot from `d.presets` (so `fn` presets come back from defaults; saved globals/fix override) |
| execs | 2305 | for each of 10: `execOff(e)`; name `x.name || ''`; cues `x.cues || []`; level `x.level ?? 0`; `cache = {}`. Missing/extra entries ignored |
| bpm | 2306 | `d.bpm || 120` (0 → 120) |
| haze | 2306 | `d.haze ?? .62` → `hazeU.value`, and DOM `#haze.value = haze*100` |
| reset | 2307 | `clearProg(); setSel([]); renderPools(); uiDirty.all = true` |
| `v` | — | never read. No version check. Keep. |
| not reset | — | `selExec`, `blackout`, `highlight`, `gm`, `autoExec` |

Boot (3088–3090): read `LS`; `loaded = execs.some(e => e.cues.length)`; if exec 1 has cues → `gotoCue(execs[0],0,0)` and level→1 if 0; parse error swallowed; if not loaded → `buildDemo()` (which persists, 2445). Called after `applyLayout()` (3084) and `renderFeatTabs/renderEncoders/buildExecs/renderAuto` (3087).

Split proposal: `ShowSerializer.toJSON(state): ShowFileV1` (pure, needs `AppState` getters for groups/presets/execs/bpm and a `haze` value — haze must move to `AppState` or be passed in; today it lives in the render uniform `hazeU` 1256). `ShowSerializer.apply(state, d)` returns nothing and emits `poolsChanged`, `selectionChanged`, `stateDirty`; the `#haze` slider sync (2306) moves to UI on a `hazeChanged`/`stateDirty` event.

### 2.4 Globals / coupling of show/

| Piece | R | W | DOM | Engine APIs | Bus |
|---|---|---|---|---|---|
| serialize 2296 | groups, presets, execs, bpm, hazeU | — | — | AppState getters | — |
| loadShow 2300 | `NEW_GROUPS` (1958, UI section!) | groups, presets (reassigned with `=`), execs[*], bpm, hazeU | `#haze` 2306, `renderPools` 2307 | defaultGroups/Presets, execOff, clearProg, setSel | `poolsChanged`, `selectionChanged`, `stateDirty` |
| persist 2309 | serialize | localStorage | — | — | consume `stateDirty{persist}` |
| buildDemo 2327 | FX, fixtures, PFN, FXT, COLORS, groups | groups, presets, execs, bpm, hazeU, selExec | `#haze` 2443, `renderPools` 2444 | `has`, `clamp`, `range`, `execOff`, `gotoCue`, `clearProg`, `setSel` | same + `stateDirty{persist}` (2445) |
| LayoutPrefs 2941/3080 | deskMode, deskZoom, maSize, `MA_SIZE` 2939 | same | — | — | — |

Move `NEW_GROUPS` (1958) out of the UI block into `GroupLibrary` or `ShowSerializer` — it is data for migration.

### 2.5 DemoShow details

- Local helpers inside `buildDemo`: `V` 2329–2330 (vals builder with zoom clamp to `f.T.zr`), `M` 2331 (**unused** object merger; not the plan's mesh helper `M`; dropping it has no behaviour effect), `P` 2332 (unused), `C` 2333 (dup of `COL` 2556), `both` 2334, `G` 2335, `FXI` 2336, `addTo` 2389.
- `V` is the same algorithm as `set` in `genLook` 2573–2574 (per-id vals with `has()` filter and zoom clamp) → one shared `buildVals(ids, spec)` helper (domain or engine). Difference: `V` accepts a string (PFN name) as spec; `set` does not.
- Order of cue creation matters: cue 5.5 is spliced at index 5 (2422) AFTER the `addTo` calls; exec 7 ("Screen Sparkle", 2442) is assigned after exec 8/9. Executor 10 index 9 = Wings.
- `bpm = 124`, haze .62 (2443). `selExec = 0` AFTER `gotoCue` (2445).
- Fully deterministic (no random/time). Golden JSON = `serialize()` after `buildDemo()`.

### 2.6 API shape that meets the quality bar (proposal, not decision)

- `command/ast.ts`: `type Statement = { kind:'select'; target: SelectTarget; mode: 'auto'|'add'|'sub' } | { kind:'level'; value:number } | { kind:'storeCue'; num?:number; fade?:number; exec?:number } | { kind:'storeGroup'; slot:number } | { kind:'storePreset'; type:number; slot:number } | { kind:'go'; dir:1|-1; exec?:number } | { kind:'goto'; cue:number } | … | { kind:'label'; target:'cue'|'group'|'exec'; n:number; name:string }` — all `readonly`. `exec?` undefined = "selExec at run time".
- Errors: today plain strings are thrown. Model as `ParseError { message }` returned by the parser; the runner must emit the identical text (golden transcripts check `#cmdFb`).
- `ShowStorage` is a real boundary (localStorage vs. test fake) → one small `KeyValueStore` interface is justified; `ShowSerializer` needs no interface.

---

## 3. Phase 3c — `src/autoshow/` and `src/audio/`

### 3.1 Source ranges

| Target | Source lines | Names |
|---|---|---|
| `autoshow/styles.ts` | 2557 `SEC_NAMES`, 2558–2568 `STYLES` (9 styles; `he` = Hebrew text → later `i18n/he.ts` in Phase 5, but keep it in data for now or move now — decide once) | |
| `autoshow/autoGroups.ts` (or in styles) | 2569 `AG` (21 id lists built from `range()` at module load — needs the rig to exist) | |
| `autoshow/LookGenerator.ts` | 2571–2615 `genLook(S, sec)`; helpers `pickR` 2555, `COL` 2556 | |
| `autoshow/SongStructure.ts` | 2617 section pick `S.sections[auto.secIdx % len]`, 2623 `autoBars`, bar math 2632 + 2641, section energy table `secE` 2575 | |
| `autoshow/AutoShow.ts` | 2554 `autoPump`/`autoHitUntil`, 2570 `auto` state, 2616–2622 `autoNewLook`, 2624–2629 `autoStart`, 2630 `autoStop`, 2631–2642 `autoTick`; save look 2712–2718 and build list 2719–2724 (data half) | |
| `audio/BpmDetector.ts` | 2645–2658 `detectBpm(ab)` (pure; input = `AudioBuffer`-like `{getChannelData(0), sampleRate}`) | |
| `audio/SongPlayer.ts` | 2644 `song`, 2659–2671 `loadSong`, 2672–2678 `toggleSong`, 2679 `songSync`, analyser read 2635–2636 (move from autoTick) | |
| UI (Phase 5) | 2681–2687 `renderAuto` (contains a `*2.55` CSS conversion 2683 → `cssRgb`), 2688–2698 `updateAutoUI`, 2699–2711 handlers, toasts in 2712–2724, `#songStat`/`#songPlay`/`#aPulse` DOM in loadSong/toggleSong, HUD 2184 | |
| render (Phase 4) | 2725–2728 `animPerformers` (reads `beatOrigin`, `bpm`, `performers`) → venue `Band`/`Orchestra` animation or `Crowd`; it is NOT autoshow | |

### 3.2 Globals and coupling

| Piece | R | W | DOM/UI | Engine APIs | Bus |
|---|---|---|---|---|---|
| genLook 2571 | `auto.energy` 2576/2601, `auto.strobes` 2584/2611, `auto.screen` 2612, FX, fixtures, PFN, FXT, AG | none (returns cue) | none | `has`, `clamp`, `PFN`, `FXT`, `rig.lightIds()` 2579 | — |
| autoNewLook 2616 | STYLES, auto | `auto.secIdx`, `auto.sec`, `autoExec.cues/cache/level`, `autoHitUntil` | — | `gotoCue(autoExec,0,fade)`, `nowS` | — |
| autoStart 2624 | auto.take, prog | auto.on/secIdx/lastBar, **`beatOrigin`** 2628 | `toast` 2627, `renderAuto` 2628 | `execOff` all execs, `progHasContent` | `message`, `autoChanged` (new) or `stateDirty` |
| autoStop 2630 | — | auto.on | `renderAuto` | `execOff(autoExec)` | same |
| autoTick 2631 | beatOrigin, bpm, auto.pulse, `song.an`, `song.fd`, `song.peak` | `autoPump`, `song.peak`, `autoExec.level`, `auto.lastBar` | — | — | — |
| songSync 2679 | song.* | **`bpm`, `beatOrigin`** | — | Tempo setters | — |
| loadSong 2659 | file | song.el/src/bpm/off, `auto.pulse='audio'` 2669 | `#songStat`, `#songPlay`, `#aPulse` | — | `songLoaded {bpm, duration, name}` for UI |
| toggleSong 2672 | song, auto.on | song.ctx/an/fd | `#songPlay` text | `autoStart` 2676 | — |
| Recorder 2899 | `song.ctx`, `song.an`; W `song.recDest` | | | | SongPlayer must expose `audioContext`/`analyser` for io/Recorder |

**Engine reads autoshow state (must be inverted in 3b/3c):** `computeOutput` reads `autoPump` (1674, beams/spots of an `e.auto` executor) and `autoHitUntil` + `autoExec.on/level` (1678, blinders). Loop reads `auto.pulse`, `song.an`, `autoPump` for `crowdU.uJump` (2530). HUD reads `auto`, `STYLES`, `SEC_NAMES`, `autoBars` (2184). Proposal: `AutoShow` writes `pump` and `hitUntil` into an engine-owned `AutoModulation` value object that `OutputMerger` reads; `engine` never imports `autoshow`.

### 3.3 Randomness and time (determinism)

| Site | Line | Use |
|---|---|---|
| `pickR` | 2555 | `Math.random()` — every palette/position/gobo/rate/spread pick in genLook |
| genLook tower pos | 2582 | `Math.random() < .4` (evaluated **per fixture** inside the callback, unless `S.orch`) |
| genLook fx | 2607, 2608, 2609 | `Math.random()` gates per active group |
| `pickR` inside per-fixture callbacks | 2585, 2595 (`grot` picks), 2596 (pos + gobo + grot per fixture), 2597, 2598 | random **per fixture** — call order of the RNG = group order × fixture order; a seeded LookGenerator must consume randoms in exactly this order to match a seeded-`Math.random` baseline |
| autoNewLook | 2621 | `nowS()` |
| autoStart | 2628 | `nowS()` (beatOrigin) |
| songSync | 2679 | `nowS()`, `song.el.currentTime` |
| detectBpm | — | none (pure, deterministic) |

Seedable LookGenerator: inject `random: () => number` (default `Math.random`). Phase-1 baseline seeds the global `Math.random` under `?test`, so the default must stay `Math.random` (not a private RNG) or parity breaks. `rng(seed)` exists at 1229 (mulberry32) for tests. Order of evaluation inside the object spreads must be preserved: e.g. 2596 evaluates `PFN[pick]`, then `pickR(S.gobos…)`, then `pickR([-12,12,0])` left-to-right.

### 3.4 Quirks to keep (autoshow/audio)

| Quirk | Line |
|---|---|
| `autoExec` has no `flashOnly` field (execs have it) | 1530 vs 1529 |
| `secE` has no `intro` key → `?? .8`; `SEC_NAMES` has `intro` but no style uses it | 2575, 2557 |
| `auto.energy < .45` keeps only the first active group | 2601 |
| `S.calm` overrides `active` after the energy cut | 2602 |
| foh gobo: `S.calm ? (S.gobos ? gob : 0) : gob` | 2594 |
| bar wrap uses double modulo for negative bars | 2641, 2693 |
| `autoTick` updates `autoPump` even when auto is off | 2634–2638 |
| `aSave` sets `c.name` from first word of style name; `aList` skips exec 1 (`i > 0`) | 2715, 2720 |
| `aSave` / `aList` do not set `selExec` vs do set it | 2714, 2722 |
| `detectBpm`: analysis window 60 s starting at min(20 s, len-60 s); BPM 70–180 step .5 with 120-bias `1-|log2(b/120)|*.35`; result rounded; offset uses unrounded `bb` | 2647, 2652–2657 |
| `OfflineAudioContext(1, 44100, 44100)` only used to decode (resamples to 44.1k mono) | 2665 |
| `toggleSong` starts Auto if off | 2676 |
| `songSync` overwrites tap tempo every frame while playing | 2679 |

---

## 4. Phase 4 — `src/render/`

Render code spans 859–1521 (scene build at module load), 1697–1790 (per-frame visuals), 2451–2452 (picking), 2505–2549 (overlay, resize, loop), 2725–2728 (`animPerformers`). Everything at 862–1521 runs **at module load** and must become explicit `build(scene, …)` calls from `main.ts` in the same order.

### 4.1 Render core

| Target | Source lines | Names / content |
|---|---|---|
| `render/StageRenderer.ts` | 861–869, 2505–2512, 2515–2524, 2532–2534 | `canvas #c`, overlay `#ov`/`ovx`, `WebGLRenderer` (antialias, pixelRatio ≤2, PCFSoft shadows, ACES, exposure 1.2), `scene` (bg 0x01020a, FogExp2 0x05060c .0022), `drawOverlay` (fixture-id labels, reads `showIds`, `f.sel`), `resize` (reads `maConH` → `camera.setViewOffset`, overlay DPR ≤1.5), `ResizeObserver` 2524 (side effect + immediate `resize()`), per-frame `controls.update(); glowOn ? composer.render() : renderer.render()` |
| `render/PostFx.ts` | 895–899 | `EffectComposer`, `RenderPass`, `UnrealBloomPass(512², .5, .45, .85)`, `OutputPass`; `bloom.setSize(w/2,h/2)` in resize 2517 |
| `render/CameraViews.ts` | 870–893 | `PerspectiveCamera(46,1,.1,1600)`, `OrbitControls` (damping .08, maxPolar .495π), `VIEWS` (15 views incl. `fohMa` fov 60), `curView`, `fohRig` registry, `setView(v, instant)` (700 ms smoothstep tween on its own rAF chain 888–890), boot call `setView('foh', true)` 893 |
| `render/MeshFactory.ts` | 927 `box`, 1070 `add`, 1470 `mk` (+ `BX`/`CY` 1071) | see 4.5 |
| `render/CanvasTexture.ts` | 1338 `canvasTex` (already the shared form) | see 4.5 |
| `render/SceneLights.ts` (**not in plan — decision needed**) | 903–904 hemi + moon, 1220–1226 `stageLight`, `audLight`, `audZones`, `houseLights`, `houseLevel`, `scrLight`, 1307–1310 `keyLights` (12, 4 with 1024² shadows); per-frame aggregate 1778–1789 | today these are module globals written by `updateVisuals`; they need an owner. Options: (a) own file in render core, consumed by FixtureVisualSync; (b) fold into FixtureVisualSync (exceeds 250 lines) |
| `render/FixturePicker.ts` (pure render half of picking) | 1271 `pickables`, 2451–2452 `ray`, `ndc`, `pickAt` | DOM pointer handlers 2453–2490 stay UI (Phase 5); box-select uses `camera` + `tmpP.project` 2468 — expose `projectToScreen(pos, rect)` |
| loop → `main.ts` (Phase 6) | 2526–2549 | order per frame (keep exactly): crowd uniforms 2530 → `songSync` → `autoTick` → `stepFades` → `computeOutput` → `updateVisuals` → `updateProps` → `animPerformers` → `controls.update` → render → `drawOverlay` → 50 ms UI tick → 400 ms slow tick |

Globals read by render core: `glowOn`, `lightsOn` (900; written by UI 2252–2253, `lightsOn` also toggles `renderer.shadowMap.enabled`), `showIds` (2254), `maConH` (2514, written by `fitDesk` 2986/3000), `document.body.classList.contains('ma')` inside `setView` 882 (DOM read → pass `isMaLayout` in), `$$('[data-view]')` button state 891 (DOM write → UI listens to a `viewChanged` callback/event).

### 4.2 `render/venue/`

| Target | Source lines | Content |
|---|---|---|
| `venue/materials.ts` | 917–926 | `matDark`, `deckTex`(918–921), `matDeck`, `matTruss`, `matBlack`, `matStone` (**unused**), `matPerson` (**unused**) |
| `venue/Sky.ts` | 905–916 | sky sphere r500 (ShaderMaterial BackSide, no fog), 2200 stars Points (r480) |
| `venue/Stage.ts` | 928–932, 1008–1011 | deck (receiveShadow), skirt, nosing, back wall; FOH riser + desk → `fohRig` (1009, **assignment replaces the array**), barricade 1010–1011 |
| `venue/Terrain.ts` | 934–962, 1001–1007 | `floorTex`, pool floor, `stoneTex(lit)` ×2 (946), `stoneMat` (clone per use, repeat w/8,h/8), retaining walls 949–951, 30 terrace steps 952–955, terrain plane 460² 150 segs with vertex colours 956–962, city lights 2600 Points 1001–1007 |
| `venue/OldCityWalls.ts` | 963–1000 | `WALLS` polylines, segment walls + towers + crenellation `InstancedMesh` 988–989, Jaffa-gate 975–979, Mount Zion 980–987, Tower of David 990–998, floodlight `WALL_LIGHT.l` 1000 (intensity forced to 0 each frame 1783) |
| `venue/Trusses.ts` | 1013–1057 | `truss(a,b,s)` 1015–1025, `ringTruss` 1033–1043, roof 1032, delays 1045, towers 1046–1048, angled 1049–1050, chains 1051, PA + subs 1052–1056 |
| `venue/Band.ts` | 1058–1147 | band materials 1060–1069, `add` 1070, risers 1073–1076 (`userData.riser`), drum kit 1078–1099 (logo canvas 1080–1082), riser LED edge 1101, amps 1103, wedges 1104, `person()` 1106–1138, 8 band members 1140–1147 |
| `venue/Performer.ts` (shared by Band + Orchestra; **not in plan**) | 1106–1138 | `person(x,y,z,ry,o)` pushes into `performers` 1136 |
| `venue/Orchestra.ts` | 1148–1157 | `XS`, `L`, `R`, `POSE`, 20 seated players |
| (Band+Orchestra post-pass) | 1158–1160 | **every `scene.children` added since `__n0` (1059)** gets `position.x *= SXZ[0]`, `.z *= SXZ[1]`; risers also scale x/z + receiveShadow; then castShadow on performers |
| `venue/Crowd.ts` | 1161–1191, 2530 (uniform update), 860 `crowdU` | chairs (3 InstancedMesh), crowd body/head/arm InstancedMesh with `onBeforeCompile` injection, per-instance `aPh`/`aAmp` |
| `venue/LedWall.ts` | 1194–1217 | `screenU`, `screenMesh` (also the pick target + `f.vo` for fixture 2001, 1461), 2 side screens sharing the material 1214–1215, `ledStrip` 1216 (colour set per frame 1724), frame 1217 |
| `venue/Props.ts` (**not in plan**) | 1487–1521 | `puffs`, hazers ×4 (uses fixture geometry helpers `merge`/`Bx`/`part`/`sphG`, `aluMat` 1347, `canvasTex`), `updateProps(now)` 1503–1509 (reads `hazeU`), RoboSpot station 1510–1521 (pushes into `fohRig`, reads `fohRig[0].visible`) |
| `venue/performersAnimation` | 2725–2728 `animPerformers(now)` | reads `beatOrigin`, `bpm` |

Engine/domain data needed by venue (from 3a): `DECK`, `STAGE`, `SCREEN` 699–701, `TR`, `ROOF`, `TOWX`, `TOWZ` 746–747, `VEN`, `UP3`, `WALL_LIGHT` 761, `TIER_N` 762, `terrH` 763–769, `RING` 770, `DELAYS` 780, `TOWERS` 782, `ANG` 788, `SXZ` 827. `UP3` (761), `UP` (1311) and `new V3(0,1,0)` (1017) are the same vector three times → one `core` constant.

### 4.3 `render/fixtures/`

| Target | Source lines | Content |
|---|---|---|
| `fixtures/GoboAtlas.ts` | 1229–1253 | `rng(seed)` 1229 (mulberry32 → `core/rng`), `drawGobo(S,i,soft)` (8 gobo masks, `rng(i*99+7)` → deterministic), `goboCanvas` (128 px), `goboIcons` (48 px dataURLs, used by UI 1975, 2109), `goboTex` (CanvasTexture, `center(.5,.5)`, **no sRGB**), `glowTex` (64 px radial, **no sRGB**) |
| `fixtures/BeamMaterial.ts` | 1256–1268, 1476–1477 | `hazeU`, `timeU` (shared uniform objects — every beam references the same `{value}`), `beamGeo` (open cone, translated −.5), `BEAM_VS`, `BEAM_FS`, per-fixture uniforms `bu` + material (transparent, additive, DoubleSide, depthWrite false, fog false) |
| `fixtures/LensTextures.ts` | 1272–1305 | `darkTrim` 1272, `LENS_TEX` (forte, megapointe, spiider, parfect, strike4, wtf 256×128, tetra2 256×32, s4; `forteFS` alias) |
| `fixtures/modelGeometry.ts` | 1311–1349 | `UP`, `DOWN`, shared geos 1312, scratch 1318, `part`, `merge`, `Bx`, `Cy`, `CyX`, `lathe`, `sphG`, `torG`, `canvasTex` (→ render/CanvasTexture), `ventSlots`, `panelMat`, `ventMat`, `aluMat`, `MODEL_GEO` cache + `geoOf` |
| `fixtures/FixtureModels.ts` | 1350–1458 | `robeBase`, `robeYoke`, `ROBE_HEADS` (+ `forteFS` copy 1378), `robePanel`, `robeMover`, `flatLens`, `BUILD` table (wtf, strike4, parfect, s4, tetra2) |
| `fixtures/FixtureVisual.ts` | 1459–1485 | `buildVis(f)`: screen branch 1461; group at `f.pos` scaled `T.size`; floor movers flipped; `bodyMat`/`lensMat` per fixture; static `aim`/`st` groups; model build; pickables; optional pixel bar `f.pix` 1474–1475; beam, pool (additive, polygonOffset −2), glow sprite; writes `f.vo` 1483. Boot: `fixtures.forEach(buildVis)` 1485 |
| `fixtures/SurfaceHit.ts` (helper of the sync) | 1697–1713 | scratch vectors, `hitSurface(o,d)`: tier plane, deck, pool floor, screen plane |
| `fixtures/FixtureVisualSync.ts` (replaces `updateVisuals`) | 1714–1790 | per fixture: strobe gate, screen uniforms branch, pan/tilt smoothing (movers `1-exp(-9dt)`), gobo rotation accumulate, aim, selection emissive, lens/pixel colour, beam, pool (lazy clone of gobo texture per fixture per gobo 1757), key-light candidates, audience-zone and stage accumulation, glow sprite; then aggregate lights 1778–1789 |

`updateVisuals` R: `f.out` (engine output), `f.T`, `f.pos`, `f.mount`, `f.sel` 1732 (→ `Selection.has(id)`), `f.vis` (W; visual smoothing state — move into `FixtureVisual`, init from `f.fixed` like 738/802), `f.vo` (→ FixtureVisual), `f.pix`, `f.id` 1755, `camera.position`, `houseLevel`, `lightsOn`, `KEY_N`. W: all uniforms, `screenU`, `timeU` (**only inside the screen branch 1723**), `scrLight`, `ledStrip`, `stageLight`, `audLight`, `audZones`, `houseLights`, `WALL_LIGHT.l`, `keyLights`. Domain APIs: `dirFrom` 811, `has` 1574, `clamp`, `D2R`.

### 4.4 Shaders → `render/shaders/*.glsl` (import with `?raw`)

| # | Line(s) | Current name | Uniforms / attributes | Target file |
|---|---|---|---|---|
| 1 | 908 | sky vertexShader (inline) | varying `vP` | `sky.vert.glsl` |
| 2 | 909 | sky fragmentShader (inline) | — | `sky.frag.glsl` |
| 3 | 1178 (string 1) | crowd vertex header | `attribute float aPh, aAmp; uniform float uBeat, uJump` | `crowdBounce.pars.glsl` |
| 3b | 1178 (string 2) | crowd `begin_vertex` replacement | `transformed.y += abs(sin(uBeat + aPh)) * aAmp * uJump;` | `crowdBounce.vertex.glsl` |
| 4 | 1198 | LED screen vertexShader | varying `vUv` | `ledWall.vert.glsl` |
| 5 | 1199–1211 | LED screen fragmentShader | `uT, uDim, uMode, uSpd` (float), `uCol` (vec3); 8 modes = `SCREEN_MODES` 732 | `ledWall.frag.glsl` |
| 6 | 1258–1259 | `BEAM_VS` | varyings `vT vN vV vL vW` | `beam.vert.glsl` |
| 7 | 1260–1268 | `BEAM_FS` | `uColor` vec3; `uInt, uHaze, uGobo, uGRot, uLen, uEnd, uSoft, uTime` float | `beam.frag.glsl` |

Notes: the crowd injection is `onBeforeCompile` string surgery (1177–1178) — the `.glsl` chunks must be concatenated exactly as today (`header + '\n' + vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + chunk)`). `inject` is applied to 3 materials (body `cm`, head `skinM`, arm `skinM.clone()`); all share `crowdU` objects. `?raw` needs `vite/client` types (`declare module '*.glsl?raw'`). Trailing newlines in files are harmless for GLSL.

### 4.5 Duplication hotspots in render (each → one abstraction)

**Mesh helpers → `MeshFactory`**

| Occurrence | Line | Signature / behaviour |
|---|---|---|
| `box(w,h,d,mat,x,y,z)` | 927 | new `BoxGeometry` each call, position, **adds to `scene`**, returns mesh. Callers: 929–932, 1009, 1011, 1032, 1045, 1047–1048, 1056, 1073–1076, 1103–1104, 1215, 1217 |
| `add(geo,m,x,y,z,par,rx,ry,rz)` | 1070 | position + rotation, adds to `par || scene` |
| `mk(geo,mat,par)` | 1470 (passed as `c.mk`) | adds to `par`, no transform |
| `BX`, `CY` geometry shorthands | 1071 | `BoxGeometry`, `CylinderGeometry(r1,r2,h,s=12)` |
| inline `new THREE.Mesh(...); m.position.set(...); scene.add(m)` | 937–938, 950–951, 955, 970, 972, 976–987, 992–998, 1034, 1042, 1050–1051, 1213–1214, 1216 | same pattern |

One abstraction: `addMesh(parent, geo, mat, { position?, rotation? })` (or a small `MeshFactory` bound to a parent). Parity: keep `box` creating **a new BoxGeometry per call** and keep insertion order into `scene.children` (the SXZ post-pass at 1158 indexes `scene.children`).

**Canvas textures → `createCanvasTexture(w, h, draw, opts)`** — settings differ per site; defaults must not change any of them.

| Occurrence | Line | Size | Texture options today |
|---|---|---|---|
| `deckTex` | 918–921 | 512² | Repeat wrap, repeat(12,6), sRGB, anisotropy 8 |
| `floorTex` | 934–936 | 512² | Repeat wrap, repeat(14,14), sRGB |
| `stoneTex(lit)` ×2 | 940–945 | 256² | Repeat wrap, sRGB (repeat set per clone in `stoneMat` 947) |
| drum `logo` | 1080–1082 | 256² | sRGB |
| `drawGobo` (2 canvases, no texture) | 1231–1232 | S² | — (canvas only; also `.toDataURL()` 1249) |
| `goboTex` | 1250 | wraps `goboCanvas` | `center(.5,.5)`, **linear** (no colorSpace) |
| `glowTex` | 1251–1253 | 64² | **linear** |
| `LENS_TEX.mk` | 1275 | 128² default | black prefill, sRGB |
| `canvasTex` | 1338 | any | sRGB — used by `panelMat` 1341, `ventMat` 1346, `puffTex` 1495, RoboSpot `scr` 1515 |

Recommended API: `createCanvas(w,h)` + `createCanvasTexture(canvas, { colorSpace?: 'srgb', wrap?: 'repeat', repeat?, anisotropy?, center? })`, with no colour-space default (explicit at each call), so `goboTex`/`glowTex` stay linear.

**Other render duplicates**: chain/tube mesh `new THREE.Mesh(tubeG, chainM); c.scale.set(.7, ROOF - y, .7)` at 1042, 1050, 1051 → `chain(x, z, yBottom)`; `rgb .../100` triplets 1723–1724, 1731 → `rgbFromOut(o)`; per-fixture colour scale `setRGB(a + col*I*k)` 1733–1734.

### 4.6 Random and time usage in render (determinism for screenshots)

Module-load `Math.random()` consumers, **in call order** (a seeded `Math.random` baseline needs this exact order after the extraction):
1. stars 912 (2×2200) → 2. `deckTex` 919 (3×4000) → 3. `floorTex` 935 (5×9000) → 4. `stoneTex(true)` 942 (96) → 5. `stoneTex(false)` 942 (96) → 6. terrain vertex colours 960 (2 per vertex, 151²) → 7. city lights 1003–1005 (variable count, rejection loop) → 8. `person()` cloth 1107 (only if `o.c` missing) + phase 1136, band then orchestra → 9. crowd 1168, 1169, 1180, 1183, 1185, 1186, 1187, 1188 → 10. `puffTex` 1495 (3×7).
`drawGobo` uses its own seeded `rng` (1233) — deterministic. Verified: no `Math.random()` exists before line 859 (23 lines use it: 18 in render, 5 in autoshow 2555–2609). Any call added before the scene build shifts the whole sequence; screenshot thresholds will hide small shifts in noise textures but not in crowd/city layouts.

Time: `setView` 888–889 (`performance.now()`, own rAF), strobe gate 1721 (`now`), screen `uT`/`timeU` 1723, mover smoothing `dt` 1726, gobo rotation 1728, `updateProps` 1506–1508, `animPerformers` 2726, crowd `uBeat` 2530, loop `t` 2527–2529, fps/clock 2546–2547 (`new Date()`).

### 4.7 Module-load side effects and load-order risks (render)

| Risk | Lines | Detail |
|---|---|---|
| WebGL context at import | 862 | needs `#c` in DOM; Vitest cannot import any render module that does this at top level → build in constructors only |
| `setView('foh', true)` before `fohRig` exists | 893 vs 1009, 1520 | first call hides nothing; MA hiding happens later via `applyLayout` → `setView('foh', true)` 2979. Keep both calls |
| `fohRig` reassigned with `=` | 1009 | then pushed to 1520; RoboSpot reads `fohRig[0].visible` → venue/Stage must run before Props |
| `screenMesh` before `buildVis` | 1196 vs 1461 | fixture 2001 uses the screen mesh as its visual/pick target |
| `hazeU`/`timeU` before `buildVis` | 1256 vs 1476 | all beams share these objects; `loadShow`/`buildDemo` write `hazeU.value` (2306, 2443) |
| rig must exist before `buildVis` | 1485 | `fixtures` from domain |
| SXZ post-pass relies on `scene.children` indices | 1059, 1158–1160 | if Band/Orchestra add to a Group, or anything else adds to `scene` in between, scaling changes. Keep "collect what this builder added, then scale". Crowd (1162+) and chairs are added **after** the pass → not scaled |
| `ResizeObserver` + `resize()` at load | 2524 | reads `maConH` (2514) and `#viewer` size; `fitDesk` later sets `maConH` |
| `goboIcons` used by UI | 1249 → 1975, 2109 | GoboAtlas must be created before pools/encoder UI render |
| shared material objects across modules | `matDark` (Stage, Trusses, Band, LedWall), `aluMat` (fixtures + hazers), `screenMesh.material` (side screens), `arch.material` 978, `rt.material` 982, `crenM` | one owner each; exported, never recreated |

### 4.8 Quirks to keep (render) — parity, do not fix

| Quirk | Line |
|---|---|
| wall floodlight created then forced to intensity 0 every frame | 1000, 1783 |
| `matStone`, `matPerson` never used | 925–926 |
| deck hit always wins over the tier hit even if the tier is closer (`best` overwritten without `t` compare) | 1700–1704 |
| `(!best || t < best.t)` inside `if (!best)` is redundant | 1705–1706 |
| `n === UP && L < 40 && hit` (`hit` already true) | 1761 |
| `timeU` (beam haze noise time) only updated in the screen-fixture branch | 1723 |
| static fixtures snap `vis` to output; movers smooth | 1726–1727 |
| pool texture cloned lazily per gobo per fixture (memory grows to 8 per fixture) | 1757 |
| pool offset `(f.id % 7) * .002` against z-fighting | 1755 |
| `ROBE_HEADS.forteFS` is a shallow copy of `forte`; FS camera chosen by `f.T.model === 'forteFS'` | 1378, 1381 |
| `LENS_TEX.forteFS = LENS_TEX.forte` | 1304 |
| `audLight` and every audience zone add blinder sum `aud` | 1780–1781 |
| `stoneMat` clones the texture per mesh (many textures) | 947 |
| `glowOn` false bypasses `OutputPass` (different tone/colour path) | 2533 |

---

## 5. Hotspots from the plan that touch these layers (status in this file)

| Plan hotspot | Real lines here | Layer / phase | Shared abstraction |
|---|---|---|---|
| 3 mesh helpers `box`/`add`/`M` (plan 908/1051/1281) | `box` 927, `add` 1070, `mk` 1470 | render (4) | `MeshFactory.addMesh` |
| canvas-texture setup ×6 (plan 899…1254) | 918, 934, 940, 1080, 1231–1232, 1250, 1251, 1275, 1338 (9 sites) | render (4) | `createCanvasTexture` |
| store-mode intercept ×5 | 1964, 1976, 2157, 2160, 2201 (+ bare-`store` regex 2260 and 2933) | UI (5) — **not** command/ | `StoreModeGuard`; command/ only calls `setStore(false)` 1919 |
| `optExec`/`findCue` in the parser | 1917, 1921, 1922, 1925 / 1923, 1929, 1931 | command (3c) | see 1.4 |
| "all fixtures except the screen" | 1906, 2341, 2579 (+ 1547 engine) | command, show, autoshow | `rig.lightIds()` |
| `*2.55` RGB→CSS | 2683 (renderAuto) | UI (5) | `cssRgb` |
| colour-by-name | 2333, 2556 | show, autoshow | `colorByName` (domain) |
| vals builder with zoom clamp | 2329–2330, 2573–2574 | show, autoshow | `buildCueVals(ids, spec)` (engine) |
| new-cue number `floor(last.num)+1` | 1850, 2714 | engine, autoshow | `CueList.nextNumber()` (engine 3b) |

## 6. Suggested parallel implementers (no shared files)

### Phase 3c

| Implementer | Owns (files) | Needs from engine (3b) | Must not touch |
|---|---|---|---|
| **3c-A command/** | `command/aliases.ts`, `Lexer.ts`, `ast.ts`, `Parser.ts`, `CommandRunner.ts` + tests | `Selection.set(ids, mode)`, `Programmer.set`, `Programmer.clear`, `doClear` equivalent, `storeCue/storeGroup/storePreset`, `StoreMode.set`, `Executor.go/goto/pause/off/invalidate`, `PresetLibrary.apply`, `GroupLibrary.get/rename`, `AppState.selExec/highlight/blackout`, `rig.range`, `rig.lightIds()`, `EventBus` (`message`, `poolsChanged`, `stateDirty`) | show/, autoshow/, UI command-line input |
| **3c-B show/** | `show/ShowSerializer.ts`, `ShowStorage.ts` (+ `KeyValueStore` boundary), `DemoShow.ts`, `LayoutPrefs.ts`, `engine/cueValues.ts` (`buildCueVals`, if not done in 3b) + tests incl. "old saved show loads" fixture | `AppState` groups/presets setters (no `=` on module globals), `defaultGroups/defaultPresets`, `NEW_GROUPS` moved to GroupLibrary, executors list (10), `Tempo.bpm`, **haze value in AppState** (today `hazeU.value`, render), `execOff`, `gotoCue`, `Programmer.clear`, `Selection.set` | command/, autoshow/ |
| **3c-C autoshow/ + audio/** | `autoshow/styles.ts`, `autoGroups.ts`, `LookGenerator.ts`, `SongStructure.ts`, `AutoShow.ts`; `audio/BpmDetector.ts`, `SongPlayer.ts` + tests (seeded look golden, BPM on a synthetic click track) | `autoExec`, `gotoCue`, `execOff`, `Programmer.hasContent`, `Tempo` (bpm, beatOrigin setters), `AutoModulation {pump, hitUntil}` read by `OutputMerger`, `PFN`, `FXT`, `has`, `colorByName`, `buildCueVals` (import from 3c-B's file → **sequencing**: create it first, or 3b creates it) | show/, command/ |

### Phase 4

| Implementer | Owns | Needs |
|---|---|---|
| **4-A venue/** | `venue/materials.ts`, `Sky.ts`, `Stage.ts`, `Terrain.ts`, `OldCityWalls.ts`, `Trusses.ts`, `Performer.ts`, `Band.ts`, `Orchestra.ts`, `Crowd.ts`, `LedWall.ts`, `performersAnimation` | domain venue constants + `terrH` (3a); `MeshFactory`, `CanvasTexture` (4-C); shaders sky/crowd/ledWall (from 4-B or own them — see below); `Tempo` for `animPerformers` and crowd `uBeat`; `fohRig` registry from CameraViews (4-C) |
| **4-B fixtures/ + shaders/** | `fixtures/GoboAtlas.ts`, `BeamMaterial.ts`, `LensTextures.ts`, `modelGeometry.ts`, `FixtureModels.ts`, `FixtureVisual.ts`, `SurfaceHit.ts`, `FixtureVisualSync.ts`; `venue/Props.ts` (uses model geometry + `aluMat`); all 7 `shaders/*.glsl` + `glsl.d.ts` | `Fixture` data (`id, T, pos, mount, fixed, pix`), engine output per fixture (`out`), `Selection.has`, `dirFrom`, `has`, `AppState.haze`, `lightsOn`/`houseLevel` (UI state), `SceneLights` (4-C), `screenMesh`/`screenU`/`ledStrip` handle from 4-A LedWall (**cross-folder read** → agree the interface first) |
| **4-C render core** | `StageRenderer.ts`, `PostFx.ts`, `CameraViews.ts`, `MeshFactory.ts`, `CanvasTexture.ts`, `SceneLights.ts`, `FixturePicker.ts` | DOM canvas ids, layout state (`isMa`, `maConH`), `glowOn`/`showIds`, `Selection` for overlay labels |

Sequencing inside Phase 4: 4-C must land `MeshFactory.ts` and `CanvasTexture.ts` (small) **before** 4-A/4-B start, or the three agree the signatures in the prompt. Shader ownership: either 4-B owns all `.glsl` and 4-A imports by agreed file names (one owner, as the plan says), or each owner keeps its own shader next to it (sky/crowd/ledWall to 4-A) — the second removes the cross-agent dependency but splits `shaders/`.

Main.ts wiring order (must match today): renderer/scene/camera/controls → `setView('foh', true)` → PostFx → SceneLights(hemi, moon) → Sky → materials → Stage+Terrain+Walls+city lights+FOH riser → Trusses → Band/Orchestra (+ SXZ pass) → Crowd → LedWall → SceneLights (stage, aud, zones, house, scr) → GoboAtlas → BeamMaterial → LensTextures → keyLights → model materials (`panelMat`, `ventMat`) → `buildVis` all → Props → … → ResizeObserver.

## 7. Risks (summary)

1. **Interleaved parse/execute in `runCmd`**: a parse-all-then-run AST changes behaviour when a later statement errors (earlier statements already applied today) and for `Exec n … Store` in one line. 1.5.
2. **Haze lives in a render uniform** (`hazeU`, 1256) but is part of the show file (2298, 2306, 2443) → must move to `AppState` before `show/` can be engine-level; render reads it per frame.
3. **Engine reads autoshow globals** (`autoPump` 1674, `autoHitUntil` 1678) and loop reads `song.an` (2530): needs an engine-owned modulation object, else `engine → autoshow` import.
4. **RNG call order** in `genLook` is per fixture inside callbacks (2582, 2585, 2595–2598); seeded golden looks break if evaluation order changes (e.g. hoisting a `pickR` out of the callback).
5. **Module-load `Math.random` order** in render (4.6) decides star/crowd/city layouts; reordering builders breaks screenshot parity.
6. **SXZ scale pass** depends on `scene.children` index ranges (1059, 1158).
7. **Canvas texture defaults**: a shared helper that defaults to sRGB changes `goboTex` and `glowTex` (linear today).
8. **`fohRig` reassignment + early `setView`** (893, 1009, 1520).
9. `NEW_GROUPS` (1958) is UI-section data used by `loadShow` back-compat.
10. Serialized key order: integer-like keys sort numerically; using `Map` or class instances in `AppState` would change JSON.

## 8. Not determined here

- Whether 3a/3b already moved `terrH`, venue constants, `COLORS`, `rng`, `buildCueVals`, `nextNumber` — check the current worktree `src/` before assigning 3c/4.
- Exact Hebrew `he` strings in `STYLES` (2559–2567): move to `i18n/he.ts` in 3c or 5 — a Fable decision.
- Homes not in the plan: `SceneLights`, `venue/Props`, `venue/Performer`, `FixturePicker`, `SurfaceHit`, `modelGeometry`, `FixtureModels`, `LensTextures` — need plan approval.
- Whether Playwright screenshot thresholds tolerate shader-file whitespace (should be zero effect) — verify in the Phase-4 parity run.
