# Phase 0: recover the lost Stage Builder fixes

Branch `fix/sb-recover`, on main `6114b2a9`. Phase 0 of the Stage Builder drag-and-drop plan; no later phase work.

Fourteen Stage Builder fix commits lived only on the local branches `sb/y1`..`sb/y4` (merge-base `c14c63a6`). Main
moved on through PRs #4-#6 (MVR). This phase puts 13 of them back by cherry-pick, one commit each, with the original
messages and tests. The goldens and the 9 baselines of `screenshots.spec.ts` stay byte-exact; two MVR baselines
change on purpose (see "Review and QA follow-ups"). The SHAs below are the originals on `sb/y1`..`sb/y4`.

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

## Review and QA follow-ups

- `2a90db85` (here `e14869a6`) removes the stale LED wall spill light from a stage without a screen. The synthetic MVR stage of
  `mvr-render-screenshots.spec.ts` has no wall, so its blue deck glow goes away: the `mvr-stage-foh.png` and
  `mvr-stage-wide.png` baselines were recorded again in their own commit. The 9 baselines of `screenshots.spec.ts` and
  the goldens do not change.
- The two MVR shots were racy on main: three.js `SMAAPass` loads its lookup images from data URLs in real time, so a
  slow run drew the last frame with SMAA and a fast run without it (1,540-6,400 edge pixels). PR #7
  (`rq/render-quality`) waits for those images (`smaaReady.ts`) and deleted `mvr-render-screenshots.spec.ts` and its
  two shots; the image gate
  (`tests/e2e/mvr-image-gate.spec.ts`, see `docs/render-gates.md`) covers that view. The merge of main into
  `rq/render-quality` keeps the delete, so no PR records the two shots again.
- A deck height change stores the moved riser heights rounded to 1 mm, as `moveRiser` does.
- The stricter parser (truss sizes 0.1-60 m, ring chains, one wall per screen fixture) rejects an old saved show that
  breaks a limit, or that holds a fixture id above `Number.MAX_SAFE_INTEGER`; the desk then loads the built-in stage
  with a toast. The builder could not make such a design.
- Fixture ids (`fixtures[].id`, `screens[].fixtureId`) must be positive safe integers, and the MVR import gives an
  unsafe FixtureID an auto id. `nextFixtureId` loads up to 2^53, and `nextIdBlock` refuses a batch whose last id is
  not safe, so ids never repeat and every design the app saves loads again.
