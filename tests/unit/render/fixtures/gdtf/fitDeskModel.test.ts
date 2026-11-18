/**
 * Owns the fit of a desk model to the overall box of its GDTF: each axis takes its own scale, so the drawn body has
 * the GDTF size; a box too far from the shape of the model is still met exactly and is noted; the model keeps
 * its joints; and a fixture without a box keeps its model as it was.
 */
import { CircleGeometry } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_DESIGN } from '../../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { gdtfBodySource, measureBodies } from '../../../../../src/render/fixtures/gdtf/index.ts';
import { setupFixtureVisuals } from '../fixtureVisualsSetup';

type Size = readonly [number, number, number];
const round = (size: readonly number[]): number[] => size.map((value) => +value.toFixed(5));

/** The rig with the first mover fitted to the box that `boxFrom` makes of its own size (width, depth, height). */
function fitFirstMover(boxFrom: (size: Size) => Size) {
  const { visuals, fixtures, screens } = setupFixtureVisuals(BUILT_IN_DESIGN);
  visuals.rebuild(fixtures, screens);
  const f = fixtures.find((candidate) => candidate.T.moving);
  const own = measureBodies(visuals.visuals).find((body) => body.id === f?.id)?.size ?? [0, 0, 0];
  const [width, depth, height] = boxFrom(own);
  const note = vi.fn();
  // the library's box is in app axes: X, Y (height), Z (depth)
  const library = {
    protoOf: () => undefined,
    boxOf: () => [width, height, depth] as const,
    note,
    beamRadiusOf: () => undefined,
    lens: new CircleGeometry(),
  };
  visuals.setGdtf(gdtfBodySource(library, (id) => (id === f?.id ? { uuid: 'U' } : undefined)));
  const lights = visuals.visuals.flatMap((v) => (v.kind === 'light' ? [v] : []));
  const fitted = lights.find((light) => light.fixture === f);
  const size = measureBodies(visuals.visuals).find((body) => body.id === f?.id)?.size ?? [0, 0, 0];
  return { own, size, note, fitted, others: lights.filter((light) => light.fixture !== f) };
}

describe('desk model fitted to a GDTF box', () => {
  it('scales each axis so the drawn body has the size of the box, and keeps the joints', () => {
    const { own, size, note, fitted, others } = fitFirstMover(([w, d, h]) => [w * 1.2, d * 0.8, h * 0.9]);
    expect(round(size)).toEqual(round([own[0] * 1.2, own[1] * 0.8, own[2] * 0.9]));
    expect(fitted?.joints).not.toBeNull();
    expect(note).not.toHaveBeenCalled();
    expect(others.some((light) => light.axisAt)).toBe(false);
  });

  it('meets a box far from the shape of the model exactly, and notes that the model is stretched', () => {
    const { own, size, note } = fitFirstMover(([w, d, h]) => [w * 6, d, h]);
    expect(round(size)).toEqual(round([own[0] * 6, own[1], own[2]]));
    expect(note).toHaveBeenCalledWith('U', 'limited');
  });
});

describe('fitDeskModel on a box that gives no scale', () => {
  it('keeps the scale the model had', async () => {
    const { BoxGeometry, Group, Mesh } = await import('three');
    const { fitDeskModel } = await import('../../../../../src/render/fixtures/gdtf/fitDeskModel');
    const g = new Group();
    g.scale.setScalar(0.7);
    g.add(new Mesh(new BoxGeometry()));
    expect(fitDeskModel(g, [0, 0, 0], undefined).limited).toBe(true);
    expect(g.scale.toArray()).toEqual([0.7, 0.7, 0.7]);
  });
});
