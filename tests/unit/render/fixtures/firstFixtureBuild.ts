import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { withSeededRandom } from '../seededRandom';
import { stubCanvasDocument } from '../stubCanvasDocument';
import { buildFixtureScene, createFixtureStage } from './buildFixtureScene';
import { snapshotFixtureScene } from './fixtureSnapshot';

/**
 * Recorded from the legacy main.ts path (gobo block to the end of the props block, Math.random = rng(1234)) in the
 * production preview, where the first fixture glow is the first Sprite and makes three's shared Sprite geometry
 * inside the seeded window.
 */
export const FIXTURE_GOLDEN: readonly string[] = JSON.parse(
  readFileSync('tests/golden/fixture-scene.json', 'utf8'),
) as string[];

let built = false;

/**
 * Builds the fixture scene under the seeded window and serialises it, once per test file. three makes its shared
 * Sprite geometry on the first Sprite only, so a second build in the same module context draws fewer randoms and
 * differs from the golden whatever its order. `vi.resetModules` cannot undo that: Vitest loads three from
 * node_modules outside its module registry. Each test file gets a fresh three, so the guard makes a second build an
 * error instead of a silent mismatch that a negative control would read as a pass.
 */
export function snapshotFirstFixtureBuild(swap: boolean): string[] {
  if (built) throw new Error('build the fixture scene once per test file: three is no longer in its first-build state');
  built = true;
  stubCanvasDocument();
  try {
    const stage = createFixtureStage();
    const scene = withSeededRandom(() => buildFixtureScene(stage, swap));
    return snapshotFixtureScene({ roots: scene.scene.children, resources: scene.resources, picks: scene.picks });
  } finally {
    vi.unstubAllGlobals();
  }
}
