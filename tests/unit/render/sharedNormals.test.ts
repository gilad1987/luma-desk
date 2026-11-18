/**
 * UP, TERRACE_NORMAL and SCREEN_NORMAL are shared identity objects: venue builders pass them to three.js and the
 * fixture sync compares hit normals with `===`. A builder that mutated one would bend the scene and the beam pools
 * without any type error, so this pins their values across a full venue and fixture build.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TERRACE_NORMAL } from '../../../src/domain/audienceTerrain';
import { UP } from '../../../src/domain/venue';
import { SCREEN_NORMAL } from '../../../src/render/surface/SurfaceHit';
import { buildFixtureScene } from './fixtures/buildFixtureScene';
import { stubCanvasDocument } from './stubCanvasDocument';
import { buildVenueHeadless } from './venue/buildVenueHeadless';

const components = (): number[][] => [UP.toArray(), TERRACE_NORMAL.toArray(), SCREEN_NORMAL.toArray()];

afterEach(() => vi.unstubAllGlobals());

describe('shared identity normals', () => {
  it('keep their components through a full venue and fixture build', () => {
    const before = components();
    buildVenueHeadless();
    stubCanvasDocument();
    buildFixtureScene();
    expect(components()).toEqual(before);
    expect(before[0]).toEqual([0, 1, 0]);
  });
});
