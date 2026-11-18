# Extraction map 01: core + domain (Phase 3a) and engine (Phase 3b)

Source: `scratchpad/index.base.html` (index.html at 48a3b63, 3096 lines). **All line numbers are from that file.**
The plan line numbers are about +200 off (plan 1333 executor literal = real 1529; plan 1615 strip fx = real 1813).
Script block: 675-3094. Imports 676-681. Boot 3086-3093. `window.__desk` 3093.

Legend: R = reads, W = writes in place (mutation), **A = reassigned with `=`** (an ES import cannot be; needs an owner method).

## 0. Facts that change the plan's assumptions

| # | Fact | Evidence |
|---|---|---|
| F1 | The rig has **405** fixtures, not 377. The plan count is from before follow spots (4), LED bars (12) and profiles (12). | 748-802 (sum of all `row`/`addFix` calls) |
| F2 | `uiDirty.sel` is written once and **never read**. `selectionChanged` has no consumer in today's code. | only hit: 1802 |
| F3 | `fixtures` array order is **build order, not id order** (101.., 801.., 201.., ...). `range()` returns ids in that order. `computeOutput` and the test hook iterate it. Never rebuild it from `Object.values(FX)` (numeric order). | 735-739, 748-802, 805, 1668 |
| F4 | `aimAt` is called at 801 during rig build, before its text at 817 (works by function hoisting). So `aimAt` must live in `domain`, not in `engine`. | 801, 817 |
| F5 | `fixture.pos` is a `THREE.Vector3` and `aimAt` uses `.sub().normalize()`. The domain layer touches three unless a core vector type replaces it. | 737, 818 |
| F6 | The worktree `index.html` (uncommitted, Phase 1) has a `?test` hook that reads `sel, prog.vals, prog.fxList, selExec, highlight, blackout, deskMode, execs, serialize, stepFades, computeOutput, fixtures, runCmd` and records `#cmdFb` children (class + text) through a MutationObserver. The engine API must keep these reachable, and `message` events must reach `#cmdFb` **synchronously** inside `runCmd`. | `git diff index.html` in the worktree (not in the base file) |
| F7 | `window.__desk` exposes object identities: `prog`, `execs`, `FX`, `fixtures`, plus getters `sel: () => sel`, `groups: () => groups`. | 3093 |
| F8 | Two time sources feed the engine: rAF `t/1000` (loop 2529) passed to `stepFades/computeOutput`, and `nowS()` = `performance.now()/1000` (1623) inside `gotoCue/execGo/execPause/flash`. Keep both; do not unify. | 1623, 2529-2531 |

## 1. Phase 3a: `src/core/`

### 1.1 Source to target

| Target file | Moves (name : line) | Notes |
|---|---|---|
| `core/math.ts` | `clamp`, `lerp` : 687; `D2R` : 688; `deep` : 689 (rename `jsonClone`) | `jsonClone` must stay `JSON.parse(JSON.stringify(o))` (drops `undefined`, keeps key order). Engine uses it at 1629, 1641, 1648, 1854, 1858; autoshow 2715. |
| `core/color.ts` | `hsv` : 691; `rgb2hsv` : 692; new `cssRgb` | `rgb2hsv` has 0 callers today (grep). |
| `core/rng.ts` | `hash` : 693; `rng` : 1229 | `rng` (mulberry32) caller: `drawGobo` 1233 (render). `hash` caller: `fxEval` flash 1601. |
| `core/Clock.ts` | `nowS` : 1623; `performance.now()` at 1838 (doClear) and 2249 (tap) | Boundary interface (tests freeze it). |
| `core/EventBus.ts` | new | Generic, synchronous. |

Not moved to core: `$`, `$$`, `el` (686, 690) and `toast` (694) are DOM: they go to `ui/`. `V3 = THREE.Vector3` (688) is three: see 2.3.

### 1.2 Proposed API (core)

```ts
// math.ts
export function clamp(v: number, min: number, max: number): number;   // keep `v < a ? a : v > b ? b : v` (NaN passes through)
export function lerp(a: number, b: number, t: number): number;         // keep `a + (b - a) * t`
export const D2R: number;                                              // Math.PI / 180
export function jsonClone<T>(value: T): T;
// color.ts
export type Rgb01 = readonly [r: number, g: number, b: number];
export function hsv(h: number, s: number, v: number): Rgb01;
export function rgb2hsv(r: number, g: number, b: number): readonly [h: number, s: number, v: number];
export function cssRgb(r: number, g: number, b: number): string;      // percent 0-100 -> `rgb(${r*2.55},${g*2.55},${b*2.55})`, NO rounding
// rng.ts
export function hash(n: number): number;
export function rng(seed: number): () => number;
// Clock.ts
export interface Clock { nowMs(): number; nowSeconds(): number }      // boundary: frozen in ?test
export const performanceClock: Clock;
// EventBus.ts
export class EventBus<E extends Record<string, unknown>> {
  on<K extends keyof E>(type: K, listener: (payload: E[K]) => void): () => void;   // returns unsubscribe
  emit<K extends keyof E>(type: K, payload: E[K]): void;                          // synchronous, in subscribe order
}
```

`EventBus` must be synchronous. Reasons: (1) the test hook reads `#cmdFb` right after `runCmd` (F6); (2) `storeCue` emits a log then a toast (1862) and their DOM order must stay.
The event map type (`EngineEvents`) lives in `engine/events.ts`, not in core (core does not know engine payload types).

### 1.3 Hotspots covered by core

| Hotspot | Occurrences (line : context) | Shared abstraction |
|---|---|---|
| `*2.55` CSS colour (5 lines x 3 = 15 multiplies) | 1974 preset swatch; 2117 colour pad grid; 2229 sheet swatch (`o.r`); 2683 auto style chips; 3027 MA colour marker | `cssRgb(r, g, b)` in `core/color.ts`. Callers are UI (Phase 5) and autoshow (3c). 3a only adds the function + test; callers switch when their layer moves (or 3a may switch them inside `main.ts` if the 3a owner of `main.ts` does it). |
| `rgb2hsv` unused + inline copy | 692 (never called); inline copy 3025-3026 in `updateMaUI` | Call `rgb2hsv(r, g, b)` at 3025-3026 (Phase 5). **Parity note:** for the red branch with `g < b`, 692 computes `x/6 + 1`, 3026 computes `(x + 6) % 6 / 6`. They are equal in math but can differ by 1 ulp. The value only feeds a CSS `left: ...%` string, so the screenshot does not change; a string snapshot of `#tsColMk.style.left` could. Use `s = mx ? d/mx : 0` from 692, which equals 3027 `dl/mx`. |

### 1.4 Quirks to keep (core)

| Line | Quirk |
|---|---|
| 691 | `hsv` uses `((i % 6) + 6) % 6` so negative or >1 hue wraps. Keep. |
| 693 | `hash` is `fract(sin(n*127.1+311.7)*43758.5453)`. Float result depends on `Math.sin`; keep exact expression. |
| 1229 | `rng` mutates its closure `seed`; each call to `rng(seed)` gives a new stream. |
| 1974 etc. | `cssRgb` must not round (`100*2.55` = `254.99999999999997`); the browser rounds. |

(Verified with Node: `100*2.55 = 254.99999999999997`; hue forms `-0.3/6+1 !== ((-0.3+6)%6)/6`.)

## 2. Phase 3a: `src/domain/`

### 2.1 Source to target

| Target file | Moves (name : line) | Reads | Notes |
|---|---|---|---|
| `domain/attributes.ts` | `ATTR` 703-714; `FEATS` 715; `FEAT_ATTRS` 716; `SCREEN_MODES` 732; `GOBO_NAMES` 733 | - | `ATTR[a].feat` is the attribute->feature map used by tracking (1618), merger (1680). `FEATS` also used by UI 1986, 3071. |
| `domain/FixtureType.ts` | `MOVER` 717; `TYPES` 720-731 | `MOVER` | `TYPES.bar.size` is read during rig build (798). `model` names are keys of render `BUILD` (1391). |
| `domain/Fixture.ts` | object shape from `addFix` 737-738; `has` 1574 | `TYPES` | Data only. See 2.3 for `vis`, `vo`, `sel`, `pix`. |
| `domain/aim.ts` (**new, not in plan**) | `dirFrom` 811-816; `aimAt` 817-826 | `D2R`, `clamp`, `V3` | Reason: `aimAt` is needed by `rigDefinition` at 801 (F4) and by `engine/positionPresets`; `domain` cannot import `engine`. `dirFrom` caller is render only (1729). Alternative: put both in `Fixture.ts` (no new file, but `Fixture.ts` then imports three math). |
| `domain/venue.ts` (**new, not in plan**) | `DECK` 699; `STAGE` 700; `SCREEN` 701; `TR` 746; `ROOF/TOWX/TOWZ` 747; `RING` 770; `TOWERS` 782; `ANG` 788; `SXZ`, `BAND_PTS` 827-828 | `V3` (ANG) | Reason: these numbers are shared by the rig build, positions (831-853) and render (DECK 56 uses; STAGE 929-959, 1704; SCREEN 1196-1217, 1708; RING 1034-1044; TOWERS 1046; ANG 1049; SXZ 1158). Keeping them in `rigDefinition.ts` forces render to import the rig builder for a constant. |
| stays for render (Phase 4) | `VEN`, `UP3`, `WALL_LIGHT` 761; `TIER_N` 762; `terrH` 763-769; `DELAYS` 780 | | Used only by render and `hitSurface` (1700-1706). `WALL_LIGHT` is mutable render state (1000, 1783). They sit inside the rig block today; leave them in `main.ts` in 3a. |
| `domain/rigDefinition.ts` | `addFix` 736-740; `row` 741-745; all build calls 748-759, 771-776, 778-779, 783-786, 789-794, 796, 798, 800-802 | `TYPES`, venue consts, `lerp`, `aimAt` | Export `buildRig(): Rig`. Keep the **exact call order** (F3). `row` copies `fixed` per fixture (`{ ...fixed }` 743); keep distinct objects. |
| `domain/Rig.ts` | `fixtures`, `FX` 735; `range` 805; `idsOfType` 806 | | New `lightIds()` (2.4). |

### 2.2 Proposed API (domain)

```ts
// attributes.ts
export type AttrName = 'dim'|'pan'|'tilt'|'r'|'g'|'b'|'gobo'|'grot'|'zoom'|'strobe';
export type Feature = 'dim'|'pos'|'gobo'|'color'|'beam';            // 'fx' in FEATS is a UI tab, not an attribute feature
export interface AttrSpec { readonly label: string; readonly min: number; readonly max: number; readonly def: number; readonly unit: string; readonly feat: Feature; readonly step?: number }
export const ATTR: Readonly<Record<AttrName, AttrSpec>>;
export const FEAT_ATTRS: Readonly<Record<Feature, readonly AttrName[]>>;
export const FEATS: readonly (readonly [Feature | 'fx', string])[];
export const SCREEN_MODES: readonly string[]; export const GOBO_NAMES: readonly string[];
export type AttrValues = Partial<Record<AttrName, number>>;           // one fixture's values (cue, programmer, preset)
// FixtureType.ts
export type FixtureTypeId = 'spot'|'beam'|'wash'|'par'|'blinder'|'strobe'|'bar'|'follow'|'profile'|'screen';
export interface FixtureType { readonly name: string; readonly model?: string; readonly attrs: readonly AttrName[]; readonly zr: readonly [number, number]; readonly z0: number;
  readonly power: number; readonly moving: boolean; readonly shape: string; readonly size?: number; readonly beamK?: number; readonly soft?: number; readonly glowK?: number;
  readonly defColor?: readonly [number, number, number]; readonly tiltOnly?: boolean }
export const TYPES: Readonly<Record<FixtureTypeId, FixtureType>>;
// Fixture.ts
export type Mount = 'hang'|'floor'|'wall';
export interface PanTilt { pan: number; tilt: number }
export interface PixelStrip { readonly p: Vector3; readonly tan: Vector3; readonly len: number }
export class Fixture {
  readonly id: number; readonly type: FixtureTypeId; readonly T: FixtureType; readonly pos: Vector3; readonly mount: Mount;
  fixed: PanTilt | null; pix?: PixelStrip;
  readonly out: Record<AttrName, number>;  // written every frame by OutputMerger (1670); filled in place
  readonly base: AttrValues;               // output before phasers (1682); UI reads it (2019, 3019)
  has(attr: AttrName): boolean;            // replaces has(f, a) 1574
}
// aim.ts
export function aimAt(f: Fixture, tx: number, ty: number, tz: number): PanTilt;
export function dirFrom(f: Fixture, pan: number, tilt: number, out: Vector3): Vector3;
// Rig.ts
export class Rig {
  readonly fixtures: readonly Fixture[];                  // build order (F3)
  get(id: number): Fixture | undefined;
  range(from: number, to: number): number[];              // ids in build order, as 805
  idsOfType(type: FixtureTypeId): number[];
  lightIds(): number[];                                   // every fixture except type 'screen', build order
}
// rigDefinition.ts
export function buildRig(): Rig;
```

Keep the field names `T`, `out`, `base`, `fixed`, `pix`, `pos`, `mount` in 3a. About 40 UI/render reads still use them in `main.ts` under `@ts-nocheck`. Renaming is out of scope.

### 2.3 Mixed fixture fields (render / UI state on the fixture)

| Field | Written | Read | Owner after refactor | When |
|---|---|---|---|---|
| `f.vis` {pan,tilt,gang} | init 738; profiles 802; smoothed 1726-1728 | 1719-1747 | render `FixtureVisual` (init from `fixed`: same as 738 + 802, since 802 sets `vis` = `fixed`) | Phase 4. In 3a the domain `Fixture` has no `vis`; `main.ts` must create `f.vis` right after `buildRig()` with the 738 rule, or keep it in the builder until Phase 4 (see risk R4). |
| `f.vo` | 1461, 1483 (`buildVis`) | 1719-1777 | render `FixtureVisual` | Phase 4 |
| `f.sel` | 1801 (`setSel`) | 1689 (merger highlight), 1732 (body emissive), 2224 (sheet), 2511 (overlay ids) | engine `Selection.has(id)` | 3b: change the 4 readers to `selection.has(f.id)`; drop the mirror. |
| `f.pix` | 773, 776, 785, 793 | render 1474-1475 | domain (rig data: where the pixel strip sits) | 3a |
| `f.pos` (`THREE.Vector3`) | 737 | aim 818; render many | domain | 3a: see options below |

Options for `pos` and other vectors (`pix.p`, `pix.tan`, `ANG`):
- **A. Keep `THREE.Vector3` in domain** (import type + class from `three`). Exact float parity for `aimAt` (`sub`, `normalize`, `lerp`, `clone`) with no new code. Cost: `domain` depends on `three`; the dependency rule in the plan lists only `core <- domain`, so the lint boundary must allow `three` in `domain`.
- **B. Own `Vec3` in core.** Clean layer. Cost: `aimAt`, 788-794 (`clone().sub().normalize()`, `lerp`, `add`) must be re-coded with the same float steps as three r160 (`normalize` = `divideScalar(length() || 1)`), and render must convert on every use (`tmpP.copy(f.pos)` 1738, `pos` in buildVis). Higher parity risk for golden `computeOutput` (positions feed `aimAt` -> preset values -> cue values).

### 2.4 Hotspot covered by domain: "all fixtures except the screen"

| Line | Code | Layer of caller |
|---|---|---|
| 1547 | `G('Everything', fixtures.filter(f => f.type !== 'screen').map(f => f.id))` | engine `GroupLibrary` |
| 1906 | `case 'all': selectIds(fixtures.filter(...)...)` | command |
| 2239 | `$('#kAll').onclick = () => setSel(fixtures.filter(...)...)` | ui |
| 2341 | demo base look `[fixtures.filter(...)..., { dim: 0, ... }]` | show/DemoShow |
| 2579 | `genLook` reset `set(fixtures.filter(...)..., {...})` | autoshow |

Shared abstraction: `rig.lightIds()`. Must return a **new array** each call (callers spread or keep it).

### 2.5 Quirks to keep (domain)

| Line | Quirk |
|---|---|
| 730 | `screen` type has no `model`, no `size`; `zr: [0,0]`. |
| 743 | `row` with `n === 1` puts the fixture at the midpoint; otherwise `lerp(x0,x1,i/(n-1))`. |
| 755, 779, 800 | Ids by nested-loop counter (`id++`), so the order is `sx` then `z` then `y`. |
| 793 | Angled trusses: ids sorted by `a.x - b.x || b.z - a.z` before numbering. |
| 796 | Follow spots: x = `-20 + 40/19*(gap+.5)`. |
| 798 | Bar y uses `TYPES.bar.size` (type table must be loaded first). |
| 801-802 | Profiles: aimed after creation; `fixed` mutated in place. |
| 820, 824-825 | `aimAt` returns `+x.toFixed(1)` (rounded to 0.1); pan forced to 0 when |tilt| < 0.5; tilt-only bars clamp to ±95. |
| 805 | `range` keeps only ids that exist (1201-1299 gives 24 ids). |

## 3. Phase 3b: `src/engine/`

### 3.1 Source to target

| Target file | Moves (name : lines) |
|---|---|
| `engine/events.ts` (new) | `EngineEvents` type map (3.4). |
| `engine/AppState.ts` | flags `gm, blackout, highlight, fanMode, storeMode` 1536; `selExec` 1532; `autoPump, autoHitUntil` 2554 (see 3.5 option A); `setStore` state part 1879; `doClear` timing `lastClear` 1836. Holds references to the services below. |
| `engine/Selection.ts` | `sel` 1534; `setSel` 1795-1803. |
| `engine/Tempo.ts` | `bpm` 1536, `beatOrigin` 1535; tap logic 2249 (`taps` 2248, window 2500 ms, clamp 40-220). |
| `engine/Executor.ts` | literal 1529 + 1530; `gotoCue` 1624-1631; `execGo` 1632-1638; `execOff` 1639; `execPause` 1640; `invalidate` 1641; `setLevel` 2143-2147 (now in UI block); flash press/release logic 2163-2164 (now in UI). Pool: `execs` 1529, `autoExec` 1530, `allExecs` 1531. |
| `engine/CueList.ts` | cue helpers from `storeCue` 1850-1853 (next number, find, insert sorted) and from runCmd `goto`/`delete` 1923, 1929 (`findIndex(c => c.num === n)`). |
| `engine/Tracking.ts` | `tracked` 1612-1622; `stepFades` 1643-1662 (the blend per executor). |
| `engine/Phaser.ts` | `rebuildProgFx` 1606-1609 (becomes `indexFx`); `fxEval` phase part 1587-1592; `fxTmp` 1665. |
| `engine/phaserShapes.ts` | `FXT` 1582-1586; switch body 1593-1604. |
| `engine/OutputMerger.ts` | `computeOutput` 1666-1692. |
| `engine/Programmer.ts` | `prog` 1533; `progSet` 1804-1810; `progRemoveFeat` 1811-1815; `applyPreset` 1816-1823; `applyFx` 1824-1833; `selFxInsts` 1834; `clearProg` 1835; `doClear` 1837-1843; `progHasContent` 1844; `colorTargets` 1575-1579; `storeCue` 1847-1864. "Remove Phasers" logic from UI 2129. |
| `engine/GroupLibrary.ts` | `groups` 1526; `defaultGroups` 1538-1552; `storeGroup` 1865-1869; `NEW_GROUPS` merge rule 1958 + 2303 (used by show `loadShow`). |
| `engine/PresetLibrary.ts` | `presets` 1526; `PRESET_TYPES` 1527; `PT_FEAT` 1528; `COLORS` 1553-1554; `defaultPresets` 1555-1567; `presetVals` 1569-1573; `storePreset` 1870-1878. |
| `engine/positionPresets.ts` | `ringU` 829; `POS` 830-854; `PFN` 1568. |

Stays outside engine (other phases): `runCmd` + `ALIAS` 1884-1944 (3c command); `log` 1888 and `toast` 694 (ui); `serialize/loadShow/persist` 2295-2309 (3c show); `buildDemo` 2327-2446 (3c show); `genLook`/auto* 2554-2643 (3c autoshow); `FXP` 1992 (UI encoder ranges, but its min/max clamp phaser params in `encDelta` 2017; move with UI in Phase 5).

`COLORS` is shared by `defaultPresets` 1563, the colour pad 2117 and autoshow `COL` 2556. Option: keep it in `PresetLibrary.ts` as a second export, or a separate `domain/colorPalette.ts` (pure data, no engine dependency). Both keep one definition.

### 3.2 Globals per piece

| Piece | Reads | Writes in place (W) | Reassigns (A) -> owner method |
|---|---|---|---|
| `setSel` 1795 | `FX`, `fixtures` | `f.sel` 1801; `uiDirty.sel` 1802 | **`sel` 1797, 1799, 1800** -> `Selection.set(ids, mode)` |
| `kRev` 2242 (UI) | `sel` | **`sel.reverse()` in place** | then `setSel([...sel])` -> `Selection.reverse()` or `set([...ids].reverse())` (same result) |
| `progSet` 1804 | `FX`, `ATTR` | `prog.vals[id][attr]` | - |
| `progRemoveFeat` 1811 | `FEAT_ATTRS`, `FXT` | `prog.vals`, `inst.ids` | **`prog.fxList` 1814** (property, OK as Programmer field) |
| `applyPreset` 1816 | `presets`, `sel`, `FX` | via `progSet` | - |
| `applyFx` 1824 | `sel`, `FX`, `FXT` | `inst.ids`, `prog.fxList.push` | `prog.fxList` 1830 |
| `clearProg` 1835 | - | - | `prog.vals`, `prog.fxList` (fields) |
| `doClear` 1837 | `performance.now`, `sel`, `lastClear` | `uiDirty.all` | **`highlight` 1839, 1841; `lastClear` 1842** -> `AppState` |
| `storeCue` 1847 | `execs`, `prog` | `cue.*`, `e.cues`, `e.name` | - |
| `storeGroup` 1865 | `sel` | `groups[slot]` | - |
| `storePreset` 1870 | `sel`, `prog.vals`, `PT_FEAT` | `presets[type][slot]` | - |
| `setStore` 1879 | - | DOM `#kStore`, `body.storing` | **`storeMode`** -> `AppState.setStoreMode` |
| `fxEval` 1587 | **`bpm`, `beatOrigin`**, `FXT` | `out` param | - |
| `gotoCue/execGo/...` 1624-1641 | `nowS`, `execs` (indexOf 1637) | executor fields | - |
| `stepFades` 1643 | `allExecs` | `e.vals`, `e.fade` | - |
| `computeOutput` 1666 | `allExecs`, `fixtures`, `prog.vals/fx`, **`autoPump`, `autoHitUntil`, `autoExec`**, `highlight`, `f.sel`, `blackout`, `gm`, `ATTR` | `f.out`, `f.base`, `fxTmp` | - |
| loadShow 2301, buildDemo 2328 (3c) | | | **`groups`, `presets`** -> `GroupLibrary.replace(g)`, `PresetLibrary.replace(p)` |
| loadShow 2306, buildDemo 2443, tap 2249, songSync 2679 | | | **`bpm`** -> `Tempo.setBpm`; **`beatOrigin`** (2249, 2628, 2679) -> `Tempo.setBeatOrigin` |
| runCmd 1920, buildExecs 2156, seqSel 2206, demo 2445, auto 2722 | | | **`selExec`** -> `AppState.selectExec(i)` |
| gm fader 2189, MIDI 2495 | | | **`gm`** -> `AppState.setGrandMaster` |
| 1936, 2247 / 1927, 1935, 2237 / 2238 | | | **`blackout` / `highlight` / `fanMode`** -> `AppState` toggles |
| autoTick 2634-2637, autoNewLook 2621 | | | **`autoPump`, `autoHitUntil`** -> 3.5 |

### 3.3 Engine -> UI/DOM calls to remove

| Line | Function | Call today | Replacement event |
|---|---|---|---|
| 1576, 1578, 1579 | `colorTargets` | `toast(...)` (Hebrew) | `message {kind:'toast'}` |
| 1633 | `execGo` | `toast('Executor is empty ...')` | `message {kind:'toast'}` |
| 1637 | `execGo` | `log('Exec N: Cue ...', 'ok')` | `message {kind:'log', level:'ok'}` |
| 1802 | `setSel` | `uiDirty.sel = true` | `selectionChanged` (no subscriber today, F2) |
| 1819, 1825, 1829 | `applyPreset`, `applyFx` | `toast(...)` | `message toast` |
| 1822, 1832 | `applyPreset`, `applyFx` | `log(..., 'ok')` | `message log ok` |
| 1839-1842 | `doClear` | `log(...)` x3; `uiDirty.all = true` | `message log`; `stateDirty` |
| 1849 | `storeCue` | `log(..., 'er')` | `message log er` |
| 1862 | `storeCue` | `log(...,'ok')` **then** `toast(...)` | two `message` events, same order |
| 1863 | `storeCue` | `uiDirty.all = true; persist()` | `cueStored {exec, num}` (+ `stateDirty`, + `showChanged`, see below) |
| 1866, 1868 | `storeGroup` | `log`; `renderPools(); persist()` | `message`; `poolsChanged`; `showChanged` |
| 1875, 1877 | `storePreset` | `log`; `renderPools(); persist()` | `message`; `poolsChanged`; `showChanged` |
| 1879 | `setStore` | DOM class toggles; `log(...)` when on | **new `storeModeChanged {on}`** + `message log`. Reason: command `Store ...` (1919) must leave store mode, but the DOM reflection belongs to `ui/StoreModeGuard`. |
| 1674, 1678 | `computeOutput` | reads `autoPump`, `autoHitUntil`, `autoExec` | 3.5 (no event; data input) |
| 1689 | `computeOutput` | reads `f.sel` | `Selection.has(f.id)` |
| 2155, 2171 | `buildExecs`/`updateExecUI` (UI) | `e.dom = d` / `e.dom` | `ExecutorsPanel` keeps `HTMLElement[]` by index (Phase 5; in 3b remove the field from `Executor` and keep a `Map`/array in `main.ts`). |
| 2298, 2306, 2443 | `serialize/loadShow/buildDemo` (3c) | `hazeU.value`, `$('#haze').value` | 3c: `AppState.haze` number; render copies it to `hazeU` each frame (`updateProps` 1504 already reads per frame); slider sync on load via `stateDirty` or a new `hazeChanged`. Decide in 3c. |

**`persist()` needs its own event.** Proposal: new `showChanged` (no payload). Evidence that no planned event can stand in for it:
- `poolsChanged` cannot imply persist: `loadShow` 2307 and `buildDemo` 2444 call `renderPools()` without their own persist (the callers persist at 2319-2321, 2445).
- `stateDirty` cannot imply persist: `doClear` 1842, `setSel` and runCmd 1943 mark UI dirty but never save.
- `cueStored` covers only 1863; persist is also called at 1868, 1877, 1929, 1934, 1965, 1977, 2158, 2202, 2203, 2319-2321, 2445, 2716, 2722.
Alternative: `stateDirty {persist: boolean}`. One event fewer, but every subscriber must branch on the flag.

### 3.4 Event map (proposed)

```ts
export type LogLevel = '' | 'ok' | 'er';                   // CSS class used by log() 1888
export type EngineMessage = { readonly kind: 'log'; readonly text: string; readonly level: LogLevel }
                          | { readonly kind: 'toast'; readonly text: string };
export interface EngineEvents {
  message: EngineMessage;                                  // ui: log() -> #cmdFb (innerHTML), toast() -> #toast
  cueStored: { readonly exec: number; readonly num: number };
  poolsChanged: undefined;                                 // ui: renderPools()
  selectionChanged: undefined;
  stateDirty: undefined;                                   // ui: sets its own uiDirty.all; loop 2544 consumes it next frame (same as today)
  showChanged: undefined;                                  // NEW: show/ShowStorage.persist() (500 ms debounce, 2309)
  storeModeChanged: { readonly on: boolean };              // NEW: ui/StoreModeGuard toggles #kStore and body.storing
}
```

### 3.5 Auto-show inputs to `computeOutput` (decision needed)

`computeOutput` reads `autoPump` (1674; let at 2554; written by `autoTick` 2634-2637) and `autoHitUntil` (1678; written by `autoNewLook` 2621), plus `autoExec.on/level` (1678). Autoshow is above engine, so engine cannot import it.
- **A. Fields on `AppState`** (`autoPump = 1`, `autoHitUntil = 0`, written by autoshow through `setAutoPulse(pump)` / `triggerHit(until)`). `OutputMerger.compute(now)` keeps its one-argument signature, so the test hook `computeOutput(now)` and `outputAt` keep working unchanged. Cost: two autoshow-specific numbers live in engine state.
- **B. Parameter** `compute(now, auto: { pump: number; hitUntil: number })`. Engine state stays clean. Cost: the loop (2531) and the test hook (`outputAt`) must pass the current values; a wrong default changes golden output.

### 3.6 Proposed API (engine)

```ts
// Executor.ts — fields stay public and mutable: show (2305), autoshow (2618, 2722) and UI (2159, 2163) assign them today.
export interface Cue { num: number; name: string; fade: number; vals: Record<number, AttrValues>; fx: PhaserInstance[]; sec?: string }  // key order num,name,fade,vals,fx (1853)
export interface Fade { from: Record<number, AttrValues>; to: Record<number, AttrValues>; t0: number; dur: number; paused: boolean; pausedAt?: number }
export class Executor {
  name = ''; cues: Cue[] = []; cur = -1; level = 0; on = false; lastGo = 0;
  vals: Record<number, AttrValues> = {}; fx: FxIndex = {}; fade: Fade | null = null; flash = false; flashOnly = false;
  cache: Record<number, TrackedState> = {};
  constructor(readonly auto: boolean, private readonly clock: Clock) {}
  goto(i: number, fadeOverride?: number): void;            // gotoCue 1624
  off(): void; pause(): void; invalidate(): void;          // 1639, 1640, 1641
  resetTracking(): void;                                   // `e.cache = {}` only (2305, 2618, 2722) — NOT invalidate
  setLevel(v: number): void;                               // 2143-2147
  flashPress(): void; flashRelease(): void;                // 2163-2164 minus the DOM class toggle
}
export class ExecutorPool {                                 // owns execs 1529, autoExec 1530, allExecs 1531
  readonly execs: readonly Executor[]; readonly autoExec: Executor; readonly all: readonly Executor[];
  go(e: Executor, dir?: 1 | -1): void;                     // execGo 1632; needs the index for the log text and the bus
}
// CueList.ts — pure functions over Cue[] (callers assign e.cues = [...] directly today)
export function nextCueNumber(cues: readonly Cue[]): number;          // 1850
export function findCueIndex(cues: readonly Cue[], num: number): number;
export function insertCueSorted(cues: Cue[], cue: Cue): void;          // push + sort 1853
// Tracking.ts
export interface TrackedState { readonly vals: Record<number, AttrValues>; readonly fx: FxIndex }
export function tracked(e: Executor, i: number): TrackedState;         // 1612 (memoised in e.cache)
export function stepFade(e: Executor, now: number): void;              // body of 1644-1661
// Phaser.ts + phaserShapes.ts
export type PhaserType = 'circle'|'pan'|'tilt'|'bally'|'dimSine'|'dimChase'|'dimSaw'|'flash'|'rainbow'|'rgbChase';
export interface PhaserInstance { type: PhaserType; rate: number; size: number; spread: number; ids: number[] }  // key order 1831
export interface FxRef { readonly inst: PhaserInstance; readonly idx: number; readonly n: number }
export type FxIndex = Record<string, FxRef>;                           // key `${id}|${feature}`
export function fxKey(id: number, feat: Feature): string;
export function indexFx(target: FxIndex, inst: PhaserInstance): void;  // 1608, 1619
export function stripFx(list: readonly PhaserInstance[], ids: readonly number[], feat?: Feature): void;  // mutate ids only
export function compactFx(list: readonly PhaserInstance[]): PhaserInstance[];                            // drop empty
export interface FxSample { dp: number; dt: number; dim: number; r: number; g: number; b: number }
export function evalPhaser(ref: FxRef, fixtureId: number, now: number, tempo: Tempo, out: FxSample): void;  // fxEval 1587
export const PHASER_TYPES: Readonly<Record<PhaserType, { name: string; feat: Feature; size: number }>>;    // FXT
// OutputMerger.ts
export class OutputMerger { compute(now: number): void }               // 1666; fills fixture.out / .base in place
// Programmer.ts — field names vals / fxList / fx kept for window.__desk.prog (F7)
export class Programmer {
  vals: Record<number, AttrValues>; fxList: PhaserInstance[]; fx: FxIndex;
  set(id: number, attr: AttrName, value: number): void;               // progSet
  removeFeature(ids: readonly number[], feat: Feature): void;          // progRemoveFeat
  applyPreset(type: PresetType, slot: number): void; applyPhaser(type: PhaserType): void;
  removePhasers(ids: readonly number[]): void;                         // UI 2129
  phasersOnSelection(): PhaserInstance[];                              // selFxInsts
  colorTargets(): number[]; clear(): void; clearPress(): void;         // clearProg, doClear
  hasContent(): boolean;                                               // returns number|boolean today (1844): keep truthiness only
  storeCue(exec: number, num: number | null, opts?: { name?: string; fade?: number; merge?: boolean }): void;
}
// Selection.ts
export type SelectMode = 'replace' | 'add' | 'sub' | 'toggle';
export class Selection { get ids(): readonly number[]; has(id: number): boolean; set(ids: readonly number[], mode?: SelectMode): void; reverse(): void }
// Tempo.ts
export class Tempo { bpm: number; beatOrigin: number; tap(nowMs: number): void; setBpm(v: number): void; setBeatOrigin(sec: number): void }
// GroupLibrary.ts / PresetLibrary.ts
export interface Group { name: string; ids: number[] }
export class GroupLibrary { get all(): Record<number, Group>; replace(g: Record<number, Group>): void; store(slot: number, ids: readonly number[]): void; static defaults(rig: Rig): Record<number, Group> }
export type PresetType = 1 | 2 | 3 | 4 | 5;
export type Preset = { name: string; kind: 'global'; vals: AttrValues; gobo?: number } | { name: string; kind: 'fn'; fn: PresetFnName } | { name: string; kind: 'fix'; fix: Record<number, AttrValues> };
export class PresetLibrary { get all(): Record<PresetType, Record<number, Preset>>; replace(...): void; storeFromProgrammer(type: PresetType, slot: number, ids: readonly number[], vals: Programmer['vals']): void;
  static valuesFor(pr: Preset, f: Fixture, k: number, n: number): AttrValues | undefined }  // presetVals 1569
// positionPresets.ts
export type PresetFnName = keyof typeof PRESET_FNS;
export const PRESET_FNS: Readonly<Record<string, (f: Fixture, k: number, n: number) => AttrValues>>;  // PFN = POS + zMin/zMid/zMax
```
`Executor.clock` is the reason `Clock` is an interface. `AppState` keeps plain fields (`gm`, `blackout`, `highlight`, `fanMode`, `storeMode`, `selExec`) with small setters that emit `stateDirty`/`storeModeChanged`; keep it a holder, not a facade over every service.

### 3.7 Hotspots covered by engine

| Hotspot | Occurrences | Shared abstraction |
|---|---|---|
| Executor literal | 1529 (x10, has `flashOnly: false`); 1530 (`auto: true`, **no `flashOnly`**) | `new Executor(auto, clock)`. `autoExec.flashOnly` becomes `false` instead of `undefined`. Verified unobservable: the only readers are 2163-2164 (UI flash, `execs` only); `serialize` 2298 and the test hook map fields explicitly. Record it in known-quirks. |
| `indexFx` | 1608 (`prog.fx`), 1619 (tracked `fx`) | `indexFx(target, inst)`; key builder `fxKey` also replaces 1618, 1676, 1681. |
| `stripFx` | 1813 (`ids`, feature filter); 1827 (`sel`, feature filter); 1857 (cue.fx, feature filter, `inst.ids`); 2129 (UI, `sel`, **no feature filter**) | `stripFx(list, ids, feat?)` + `compactFx(list)`. **Keep the call order:** at 1827 the strip runs but 1829 may `return` before the compaction at 1830 and before `rebuildProgFx`. So `fxList` keeps empty instances and `prog.fx` keeps stale refs until the next rebuild. Do not merge strip + compact + rebuild into one call. |
| "all but screen" | 1547 (engine) | `rig.lightIds()` (2.4) |
| Zoom clamp to type range | 1807 (`progSet`); 2330 (demo `V`); 2574 (`genLook set`) | Not in the plan's list. Option: `Fixture.clampZoom(v)` in domain. 2330 and 2574 are full copies of a "values for fixture" builder (filter `has`, clamp zoom); the jscpd check in the plan may flag them in 3c. |

### 3.8 Quirks to keep (engine) — do not fix

| Line | Quirk |
|---|---|
| 1588 | `fxEval` declares `def = FXT[I.type]` and never uses it. Harmless; can drop (no behavior), or keep for diff clarity. |
| 1589-1591 | Phase math order: `freq = bpm / 60 / 4 * I.rate`; `ph = (tb*freq + (spread/360)*(n>1 ? idx/n : 0)) * 2π`. Keep the exact operation order (float goldens). Do not factor into a "beats" helper. |
| 1601 | Random flash: 16 steps per cycle, on when `hash(step*13.7 + id*3.1) > .82 && fr < .35`. |
| 1613-1621 | `tracked` caches by cue index in `e.cache`; renaming a cue or changing `fade` (2202, 2203, 1937) does not invalidate. Deleting a feature's attribute clears that feature's phaser (1618) per fixture. |
| 1628 | Fade time `fadeOverride ?? cue.fade ?? 2` (`!= null` check on override). |
| 1629 | `fade.to` is the cached `tr.vals` object (shared reference); `from` is a deep copy. At the end `e.vals = deep(F.to)` (1648). |
| 1634 | GO on a paused fade only resumes; it does not step. |
| 1635 | GO on an off executor with level 0 sets level to 1. |
| 1636 | GO wraps: past the last cue -> 0; before 0 -> last. |
| 1637 | Log text uses `execs.indexOf(e) + 1` (auto exec would print "Exec 0"). |
| 1647 | Fade curve smoothstep `p*p*(3-2p)`; `dur <= 0` jumps. |
| 1655-1657 | Dim missing on a side counts as 0; other attrs missing in `to` hold `from` until the end, then vanish; `gobo` snaps at k = .5. The `if (k < 1)` at 1656 is always true there (p < 1); keep. |
| 1667 | Active = `on && (level > 0 || flash)`, sorted by `lastGo` (LTP order). |
| 1670-1671 | Defaults: `r=g=b=100` then `defColor`; `zoom = z0`; screen `gobo = 1`. |
| 1674 | Level = 1 when flashing; `autoPump` multiplies the auto exec level only for type `beam` and `spot` (not `follow`, `bar`). |
| 1675 | Dim is HTP scaled by level; every other attribute is LTP and ignores level. |
| 1678 | Auto hit: blinders forced to `100 * autoExec.level` while `autoHitUntil > now`. |
| 1680 | A programmer value clears the phaser slot of that feature (`fxSel[ATTR[a].feat] = null`), which also creates `gobo`/`beam` keys (null, skipped at 1683). |
| 1682 | `base` is captured **before** phasers. |
| 1686 | A dim phaser **replaces** dim (`fxTmp.dim * lv`), it is not HTP. Position phaser ignores level. |
| 1688 | Tilt-only bars: pan forced to 0 after phasers. |
| 1689 | Highlight: `o.gobo = f.type === 'screen' ? 0 : 0`. Keep the expression. |
| 1690 | Blackout/GM applied last, so blackout also kills highlight. |
| 738, 1577 | `f.out` is `{}` until the first `computeOutput`; `colorTargets` reads `f.out.dim > 1` (false for `undefined`). |
| 1796-1801 | `setSel` drops unknown ids; `replace` de-duplicates; `toggle` keeps order of insertion. |
| 1808-1809 | Clamp, round when `step`, then `+(+val).toFixed(2)`; zoom range is the type's `zr`. |
| 1818-1819 | Colour presets (type 4) use `colorTargets()` (works with no selection) and give no extra toast when empty. |
| 1821 | Empty `if (type === 2) { }` with a comment. Keep or drop (no behavior); list in known-quirks. |
| 1831 | New phaser: `{ type, rate: 1, size: def.size, spread: 360, ids }` (key order matters for show JSON). |
| 1838-1842 | Double CLEAR inside 400 ms = Clear All (uses `performance.now()`, not the frame time). |
| 1850 | Next cue number = `floor(last.num) + 1`. |
| 1852 | Store onto an existing cue without `merge` empties it first; `merge` comes only from the sequence click (2201). |
| 1853 | New cue key order `{num, name, fade, vals, fx}`; `fade: opts.fade ?? 2`. |
| 1876 | `storePreset` keeps the old name only when the old preset kind is `fix`. |
| 2133 | `applyPresetTo` is a pass-through (UI; plan known-quirk). |
| 2146 | Level to 0 turns the executor off unless flashing. |
| 2159 | OFF button keeps level for executor 1 only (`i === 0 ? e.level : 0`) (UI). |
| 2249 | Tap: `beatOrigin = t/1000` on every tap; BPM from the mean interval of taps inside 2500 ms, rounded, clamp 40-220. |

## 4. Load order and module-load side effects

| Line | Side effect / risk | Rule for the modules |
|---|---|---|
| 748-802 | The rig is built at script load. `aimAt` (817) is used at 801 by hoisting; `TYPES.bar` at 798. | `buildRig()` is a function called from `main.ts` before anything reads fixtures. Do not build at import time unless option R5-A is chosen. |
| 805-806 | `range`/`idsOfType` close over `fixtures`. | Methods on `Rig`. |
| 1529-1536 | Engine state created at load (no DOM). | Created in `main.ts` (`new AppState(...)`) before render/UI. |
| 1949 | `const uiDirty` is declared **after** `setSel` (1802), `doClear` (1842), `storeCue` (1863) use it. Works only because none runs before 1949. | Gone: events replace it. |
| 2554 | `let autoPump, autoHitUntil` declared after `computeOutput` (1674). First read is in the first frame. | 3.5. |
| 2569 | `const AG = { ...range(...) }` runs at load and needs the built rig. | 3c: if autoshow keeps it at module top level, the rig must exist at import time. Prefer building `AG` from the `Rig` passed in. |
| 2570, 2940 | `auto` and `deskMode` are read by `updateExecUI` (2184), `encList` (1996) and the loop; forward references. | Not engine; note for Phase 5. |
| 3089-3092 | Boot order: `renderFeatTabs; renderEncoders; buildExecs; renderAuto` -> `loadShow(saved)` -> `gotoCue(execs[0],0,0)` and level 1 -> else `buildDemo()` -> guide -> `requestAnimationFrame(loop)`. | Keep this order in `main.ts`. Bus subscribers (UI `log`/`toast`, `renderPools`, persist) must be connected **before** `loadShow`/`buildDemo`, which emit `poolsChanged` and, in the demo, `showChanged`. |
| 3093 | `window.__desk` exposes `prog`, `execs`, `FX`, `fixtures`, `sel()`, `groups()`. | Expose the `Programmer` instance as `prog`, `pool.execs` as `execs`, a `Record<number, Fixture>` view as `FX`, `rig.fixtures` as `fixtures`. Same identities for the whole session. |

## 5. Risks

| # | Risk | Where |
|---|---|---|
| R1 | Float drift in goldens if math is "cleaned up" (operation order, helper factoring, `Vec3` re-implementation). | 1589-1591, 1647, 818-825 |
| R2 | Event dispatch that is async (microtask) breaks the command transcript (F6) and the log/toast order. | 1862, test hook |
| R3 | `fixtures` order changed (sorting by id, `Object.values`) changes `range` results, groups, demo cues and `outputAt` order. | F3 |
| R4 | Phase 3a/3b remove `vis`, `vo`, `sel`, `dom` from types while render/UI code in `main.ts` (`@ts-nocheck`) still writes them. Plain objects/classes accept the writes at runtime; **do not freeze, seal or use `#private`** on `Fixture`/`Executor` until Phases 4-5. `f.vis` must still be initialised (738 rule, incl. profile aim 802) or render crashes at 1726. | 738, 802, 1461, 1483, 2155 |
| R5 | Rig singleton vs injected rig. A: module singleton built on import (matches today, hidden side effect, easy for `AG`). B: `buildRig()` in `main.ts`, passed in (explicit, but `AG` 2569 and `defaultGroups` need the rig as a parameter). | 748, 2569 |
| R6 | JSON key order of cues, presets, groups, phasers changes the golden `serialize()` string. | 1831, 1853, 1867, 1876, 2297-2298 |
| R7 | `hasContent()` returns a number today (1844); a `boolean` return is fine for all callers (`!`, `if`) — verified 1849, 2627. | 1844 |
| R8 | `log()` uses `innerHTML` with cue/group names (1888). Keep `innerHTML` in the UI subscriber; a switch to `textContent` changes the transcript for names with `&`/`<`. | 1888 |

## 6. Suggested parallel split (no shared files)

`src/main.ts` is the only shared file. Give it to **one** owner per phase; the others export code + unit tests only and do not touch `main.ts`.

**Phase 3a**
| Implementer | Owns | Notes |
|---|---|---|
| 3a-1 | `src/core/**` + `src/core/**/*.test.ts` | Small; the API in 1.2 is the contract. |
| 3a-2 | `src/domain/**` + tests + **`src/main.ts`** | Codes against the 1.2 contract; runs final typecheck after 3a-1 lands. Replaces 687-693, 699-806 (keeping render-only 761-769, 780 in `main.ts`), 1229, 1574 in `main.ts`. |

**Phase 3b** (the plan's `engine/` is one folder; split by file set)
| Implementer | Owns | Depends on |
|---|---|---|
| 3b-1 "state" | `engine/events.ts`, `AppState.ts`, `Selection.ts`, `Tempo.ts`, `GroupLibrary.ts`, `PresetLibrary.ts`, `positionPresets.ts` + tests | core, domain |
| 3b-2 "playback" | `engine/Executor.ts`, `CueList.ts`, `Tracking.ts`, `Phaser.ts`, `phaserShapes.ts`, `OutputMerger.ts` + tests | 3b-1 contracts (`Tempo`, `Selection`, `AppState` fields, `EngineEvents`) |
| 3b-3 "programmer + wiring" | `engine/Programmer.ts` + tests + **`src/main.ts`** | 3b-1 and 3b-2 contracts; does the `main.ts` cut and the bus subscribers (`log`, `toast`, `renderPools`, `persist`, store-mode DOM) |

Freeze the signatures in 3.4 and 3.6 before the three start; any change goes through the orchestrator.

## 7. Open items (not determined here)

- Whether the lint boundary allows `three` in `domain` (2.3 option A) — needs the orchestrator's decision.
- 3.5 A vs B and `showChanged` vs `stateDirty {persist}` — orchestrator decision.
- Exact content of the Phase-1 golden files: `tests/golden` and `tests/e2e` are empty in the worktree now (only `tests/serve.mjs`), so the field set used by the goldens is known only from the uncommitted test hook in `index.html`.

## 8. Verification done for this map

- Rig count and order: lines 687, 689, 699-826 were run in Node 26 with a minimal `Vector3` stub. Result: `405` fixtures; first ids `101,102,103`; `fixtures[20].id === 801` (build order, F3); `range(1201,1299).length === 24`.
- `100*2.55 === 254.99999999999997` and the 1-ulp hue difference (1.3) were checked in Node.
- Every line range in this file was read in `index.base.html`; call-site lists come from `grep -n` on the same file.
