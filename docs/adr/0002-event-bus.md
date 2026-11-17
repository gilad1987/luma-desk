# ADR 0002: A typed event bus between the engine and the UI

- Status: Accepted
- Date: 2026-11-17
- Scope: `src/core/EventBus.ts`, `src/engine/events.ts`, `src/ui`, `src/main.ts`

## Context

In `index.html` at `48a3b63`, engine functions call UI and storage functions directly:

- `execGo` calls `toast` and `log` (1633, 1637).
- `storeCue` calls `log`, `toast` and `persist`, and sets `uiDirty.all` (1862-1863).
- `storeGroup` and `storePreset` call `log`, `renderPools` and `persist` (1868, 1877).
- `runCmd` calls `log` for every result and error, `renderPools` for group labels, `persist` for deletes and labels,
  and sets `uiDirty.all` at the end (1888-1944).
- `setSel` sets `uiDirty.sel` (1802). `doClear` sets `uiDirty.all` (1842).
- `colorTargets` and `applyPreset` call `toast` (1576-1579, 1819).
- `serialize` reads `hazeU` (a render uniform), and `loadShow` writes the `#haze` input (2298, 2306).

`toast` and `log` write the DOM (694, 1888). `uiDirty` is a flag object that the render loop reads to decide when to
repaint the slow panels (1949, 2543-2545).

The engine must never import `render`, `ui` or the DOM, and it must run in unit tests with no DOM. So it needs a way
to say "something happened" without knowing who listens.

## Decision

1. One small generic class, `EventBus<Events>`, in `src/core/EventBus.ts`. `Events` maps an event name to its
   payload type. `on` returns an unsubscribe function; `emit` calls the listeners in the order they subscribed, at
   once and in the same call stack. No queue, no async delivery, no wildcard events.
2. One event map for the app, `EngineEvents` in `src/engine/events.ts` (decision 3 in
   `docs/plan/extraction/00-decisions.md`):

   | Event              | Payload                                                     | Replaces                         |
   | ------------------ | ----------------------------------------------------------- | -------------------------------- |
   | `message`          | `{ kind: 'log', text, level }` or `{ kind: 'toast', text }` | `log(msg, cls)` and `toast(msg)` |
   | `cueStored`        | `{ exec, num }`                                             | the store-cue feedback pair      |
   | `poolsChanged`     | none                                                        | `renderPools()`                  |
   | `selectionChanged` | none                                                        | `uiDirty.sel = true`             |
   | `stateDirty`       | none                                                        | `uiDirty.all = true`             |
   | `showChanged`      | none                                                        | the `persist()` calls            |
   | `storeModeChanged` | `{ on }`                                                    | the STORE key and banner updates |

   Saving and repainting are separate events because they happen at different times: `stateDirty` repaints,
   `showChanged` saves. Names and payloads are typed, so a wrong name or field is a compile error.

3. `main.ts`, the composition root, creates the bus and connects the listeners. Engine classes get the bus in their
   constructor.
4. Delivery is synchronous so that order stays the same. Example: the command line must show one statement's
   feedback before the next statement runs (decision 9), and `persist()` keeps its 500 ms debounce, so the
   localStorage write happens at the same time as before.
5. The bus is one of the few allowed interfaces at a boundary. There is one implementation.
6. Render state that the show format needs (the haze level) moves to `AppState` in the engine (decision 5). Render
   and UI read it from there; the serializer no longer reads a three.js uniform or a DOM element.

## Alternatives rejected

- **Pass callbacks into each engine class** (for example `new CueList({ onStored })`). Simple and typed. But the same
  callbacks go into many classes, and every new listener changes constructors. Still fine for one-to-one links.
- **DOM `EventTarget` and `CustomEvent`.** Built in, but payloads are not typed without extra code, and it ties the
  engine to a DOM type, which the layer rule forbids.
- **A reactive store or signals library.** Fine-grained updates, but a dependency the plan does not list, and it
  changes the repaint model.
- **Return result objects and let the caller show messages.** Clean for the command runner, but `execGo` is called
  from many places (buttons, keys, MIDI, commands), and each caller would repeat the message code.

## Consequences

Good:

- The engine has no DOM imports, so `Programmer`, `Executor`, `ExecutorPool` and the command runner run in Vitest.
- Command transcripts are recorded from `message` events instead of from DOM text.
- `main.ts` shows in one place who reacts to what.

Costs and risks:

- Message text and order must stay the same. The command feedback keeps only the last two lines (1888), and the
  transcripts compare this text, so the `CommandLine` listener applies the same rule.
- A synchronous bus can hide re-entrant calls (a listener that calls the engine again). Listeners do UI and storage
  work only.
- `uiDirty` was a pull model (the loop reads a flag); events push. The UI keeps a dirty flag that the event sets, so
  repaint timing stays the same (the slow panels repaint at most every 400 ms or when dirty, 2543).
- `selectionChanged` and `cueStored` have no listener yet (known quirks, section H). They stay because a panel can
  subscribe without an engine change.

## Verified

- `tests/unit/core/EventBus.test.ts` covers order, unsubscribe and synchronous delivery.
- `tests/unit/command/transcriptReplay.test.ts` replays the golden transcripts through the bus.
- Engine state tests record the emitted events (`tests/unit/engine/state/recordEvents.ts`).
