# Phase 0: recover the lost Stage Builder fixes

Branch `fix/sb-recover`, on main `6114b2a9`. Phase 0 of the Stage Builder drag-and-drop plan; no later phase work.

Fourteen Stage Builder fix commits lived only on the local branches `sb/y1`..`sb/y4` (merge-base `c14c63a6`). Main
moved on through PRs #4-#6 (MVR). This phase puts 13 of them back by cherry-pick, one commit each, with the original
messages and tests. The goldens and the screenshot baselines stay byte-exact.

## Commits (in order)

| #   | SHA        | Fix                                                                       | Conflict |
| --- | ---------- | ------------------------------------------------------------------------- | -------- |
| 1   | `89e0c10b` | parser rejects a second LED wall that names another wall's screen fixture | none     |
| 2   | `5b20efb4` | deck height change moves the risers in the same undo step                 | none     |
| 3   | `8102fcda` | batch on a hung truss counts the truss's fixtures in plan                 | none     |
| 4   | `0b8fa8b3` | parser clamps truss sizes 0.1-60 m and rings to 32 chains                 | none     |
| 5   | `c077682d` | design keeps `nextFixtureId` over deletes                                 | 4 files  |
| 6   | `c77b240f` | missing-fixture check reads a cue without vals/fx as empty                | none     |
| 7   | `e82109bc` | regroup reads a null group slot as empty                                  | none     |
| 8   | `1118a1bf` | Auto Show puts unmatched lights in the group of their type                | none     |
| 9   | `7cff43c7` | builder keys act after a click on a checkbox or list                      | none     |
| 10  | `974fd784` | top-view pick order: fixture mark, tower, truss line                      | none     |
| 11  | `40d2fbff` | clearing the LED wall box hides the wall instead of deleting it           | none     |
| 12  | `2a90db85` | stage build with no screen visual turns the LED wall spill light off      | none     |
| 13  | `a8fb11ee` | focus pad draws the current stage's deck, wall, ring and band marks       | none     |

Then one follow-up commit: "Stage Builder fix: comments and the MVR reuse test follow the kept fixture ids".

## Dropped

- `37dce306` (camera fit on a saved custom stage): main already has the behaviour inline in
  `src/app/boot/wireStage.ts` (`views.fitTo(boundsOf(design))` before `setView('foh', true)`).
- `169905d7`, `ad13fe13`, `d4b67ea3`, `f6e5405c`: WIP branch tips that add only a `node_modules` symlink.

## `c077682d`: conflict resolution

Main replaced the inline `fixtures.filter(...)` in `deleteFixtures` and `removeWall` with `withoutFixtures(d, gone)`,
which also drops the `mvr.fixtures` entries, and added `mvr?` to `StageDesign` with its parsing. Resolution:

- `StageDesign.ts`: keep main's `mvr?`; add the fix's `nextFixtureId?: number` with its doc comment before it.
- `edit/ids.ts`: applied clean; adds `nextFixtureId(d)`, which `nextIdBlock` uses.
- `edit/itemOps.ts`: `deleteFixtures` returns `{ ...withoutFixtures(d, gone), screens, nextFixtureId: nextFixtureId(d) }`.
- `edit/ledWall.ts`: `removeWall` spreads `withoutFixtures(d, new Set([wall.fixtureId]))`, drops the first screen and
  sets `nextFixtureId: nextFixtureId(d)`.
- `parse/parseStageDesign.ts`: reads `r.optional(o, 'nextFixtureId', '', r.positiveInt)` and spreads it only when
  defined, next to the `mvr` field. The file went over 100 lines, so the pre-commit hook stopped the pick;
  `checkMvrFixtureIds` moved to the new `parse/checkMvrFixtureIds.ts` inside the same commit, with its comment
  rewritten (ids are no longer given out again; a stale entry rejects the saved design).

The follow-up commit rewrites the `withoutFixtures` comment and the headers of `parseMvrRefs.test.ts` and
`deletedMvrEntries.test.ts`, which said a deleted id is given out again. `tests/unit/mvr/qa/reusedFixtureId.test.ts`
keeps its file and changes its premise: after `deleteFixtures(d, [1, 2])` and `addFloorRow` the ids are `[101, 102]`,
and the old uuid and GDTF name are still absent from the export.
