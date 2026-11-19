/**
 * Owns the product side of `FixtureVisuals.rebuild`: a rig with an Esprite, then one without, then the Esprite again,
 * builds each time, reuses the one lazily painted lens face, and never disposes it, because the product lens set lives
 * as long as the model table. The leak count of a rebuild is owned by fixtureVisualsRebuild.test.ts.
 */
import { Texture } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rigFromDesign } from '../../../../src/domain/stage/deriveRig';
import type { FixtureVisual } from '../../../../src/render/fixtures';
import { sampleDesign, withEsprite } from '../../domain/stage/edit/sampleDesign';
import { setupFixtureVisuals } from './fixtureVisualsSetup';

afterEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

/** The lens face of the Esprite visual of `visuals`, or null when the rig has none. */
function espriteLens(visuals: readonly FixtureVisual[]): Texture | null {
  const v = visuals.find((x) => x.kind === 'light' && x.fixture.id === 501);
  return v?.kind === 'light' ? v.lensMat.map : null;
}

describe('FixtureVisuals.rebuild with a product', () => {
  it('rebuilds Esprite, plain, Esprite with one lens face it never disposes', () => {
    const { visuals, fixtures, screens } = setupFixtureVisuals(withEsprite());
    const plain = rigFromDesign(sampleDesign()).fixtures;
    const first = espriteLens(visuals.rebuild(fixtures, screens));
    const disposed: unknown[] = [];
    vi.spyOn(Texture.prototype, 'dispose').mockImplementation(function (this: unknown): void {
      disposed.push(this);
    });
    const without = espriteLens(visuals.rebuild(plain, screens));
    const again = espriteLens(visuals.rebuild(rigFromDesign(withEsprite()).fixtures, screens));
    expect([first instanceof Texture, without, again === first, disposed.includes(first)]).toStrictEqual([
      true,
      null,
      true,
      false,
    ]);
  });
});
