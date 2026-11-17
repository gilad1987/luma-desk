import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withSeededRandom } from '../seededRandom';
import { buildFixtureScene, createFixtureStage, stubCanvasDocument } from './buildFixtureScene';
import { snapshotFixtureScene } from './fixtureSnapshot';

/*
 * Golden recorded from the legacy main.ts path (gobo block to the end of the props block, Math.random = rng(1234))
 * in the production preview. This file must build only once per seed window: three makes the shared Sprite
 * geometry on the first Sprite, and in the legacy page that first Sprite is the first fixture glow, inside the
 * window. Vitest loads this file in a fresh module context, so the first build here matches the page.
 */
const GOLDEN: string[] = JSON.parse(readFileSync('tests/golden/fixture-scene.json', 'utf8')) as string[];

afterEach(() => vi.unstubAllGlobals());

function snapshot(swap: boolean): string[] {
  stubCanvasDocument();
  const stage = createFixtureStage();
  const built = withSeededRandom(() => buildFixtureScene(stage, swap));
  return snapshotFixtureScene({ roots: built.scene.children, resources: built.resources, picks: built.picks });
}

describe('fixture scene parity with the legacy code path', () => {
  it('creates every object with the legacy type, uuid (creation order) and settings', () => {
    const lines = snapshot(false);
    expect(lines).toHaveLength(GOLDEN.length);
    expect(lines).toEqual(GOLDEN);
  });

  it('fails when one object is created out of order', () => {
    const lines = snapshot(true);
    expect(lines).not.toEqual(GOLDEN);
    expect(lines.filter((line, i) => line !== GOLDEN[i]).length).toBeGreaterThan(GOLDEN.length / 2);
  });
});
