/**
 * SurfaceHit on other stage designs (G6): beams land on the theatre and festival decks, risers and LED walls from
 * `surfacesOf`, a hidden LED wall catches nothing, and `setSurfaces` replaces the boxes instead of adding to them.
 */
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { surfacesOf } from '../../../../src/domain/stage/surfaces';
import { createTemplate } from '../../../../src/domain/stage/templates/index';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { UP } from '../../../../src/domain/venue';
import { SCREEN_NORMAL, SurfaceHit, type BeamHit } from '../../../../src/render/surface/SurfaceHit';

const down = (x: number, z: number): [Vector3, Vector3] => [new Vector3(x, 10, z), new Vector3(0, -1, 0)];
const upstage: [Vector3, Vector3] = [new Vector3(0, 10, 0), new Vector3(0, 0, -1)];

function surfacesFor(design: StageDesign): SurfaceHit {
  const surfaces = new SurfaceHit();
  surfaces.setSurfaces(surfacesOf(design));
  return surfaces;
}

/** The hit as [t, normal kind], so a copied normal object fails the identity check. */
function described(hit: BeamHit | null): [number, string] | null {
  if (!hit) return null;
  if (hit.normal === UP) return [hit.t, 'up'];
  return [hit.t, hit.normal === SCREEN_NORMAL ? 'screen' : 'other'];
}

describe('SurfaceHit on other stages', () => {
  it('lands on the 1 m theatre deck and finds no screen there', () => {
    const theatre = surfacesFor(createTemplate('theatre'));
    expect(described(theatre.hit(...down(0, -4)))).toEqual([9, 'up']);
    expect(described(theatre.hit(...upstage))).toBeNull();
  });

  it('lands on the festival deck edge, its LED wall front and a riser before the deck', () => {
    const festival = createTemplate('festival');
    const plain = surfacesFor(festival);
    expect(described(plain.hit(...down(14, -10)))).toEqual([10 - 1.8, 'up']);
    expect(described(plain.hit(...upstage))).toEqual([15.5 - 0.05, 'screen']);
    const risers = [{ id: 'r1', at: [0, 2.5, -5], size: [4, 0.5, 2] }] as const;
    expect(described(surfacesFor({ ...festival, risers }).hit(...down(0, -5)))).toEqual([7.5, 'up']);
  });

  it('gives no screen hit when the LED wall scenery is hidden', () => {
    const scenery = { ...BUILT_IN_DESIGN.scenery, ledWall: false };
    expect(described(surfacesFor(BUILT_IN_DESIGN).hit(...upstage))?.[1]).toBe('screen');
    expect(described(surfacesFor({ ...BUILT_IN_DESIGN, scenery }).hit(...upstage))).toBeNull();
  });

  it('replaces the boxes on setSurfaces instead of adding to them', () => {
    const surfaces = surfacesFor(BUILT_IN_DESIGN);
    expect(described(surfaces.hit(...down(15, -10)))).toEqual([10 - 1.8, 'up']);
    surfaces.setSurfaces(surfacesOf(createTemplate('theatre')));
    expect([surfaces.hit(...down(15, -10)), surfaces.hit(...upstage)]).toEqual([null, null]);
    surfaces.setSurfaces([]);
    expect(surfaces.hit(...down(0, -4))).toBeNull();
  });
});
