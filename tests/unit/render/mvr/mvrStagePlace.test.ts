/**
 * The views get the seats of the stage from the seat proxies of the shown layers: the seats of a hidden layer give
 * the Crowd view no place, and a second block far off stays in the scene box but out of the framed house.
 */
import { describe, expect, it } from 'vitest';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import type { MvrGeometry } from '../../../../src/mvr/index';
import { classifyProxies } from '../../../../src/mvr/scene/proxyClassify';
import { mvrCameraBounds } from '../../../../src/render/mvr/mvrCameraBounds';
import { mvrStagePlace } from '../../../../src/render/mvr/mvrStagePlace';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { seatRows } from '../../../shared/index';

const template = createTemplate('festival');
/** 20 seats a row, 12 rows, moved by `dx` and `dy` millimetres (the MVR frame has -y toward the audience). */
const rows = (dx: number, dy: number): ReturnType<typeof seatRows> =>
  seatRows(20, 12, 540, { symdef: 'S', layer: 'seats' }).map((seat) => ({
    ...seat,
    matrix: seat.matrix.map((value, i) => value + (i === 12 ? dx : 0) + (i === 13 ? dy : 0)),
  }));
/** The rows in front of the stage, and the same rows 200 m to one side: a block of another site on the same layer. */
const proxies = classifyProxies([...rows(0, -25000), ...rows(200000, -25000)], [0, 0, 0]);
const geometry: MvrGeometry = {
  placements: [],
  offset: [0, 0, 0],
  bounds: { min: [-15, 0, -20], max: [15, 15, 5] },
  surfaces: [],
  layers: [],
  hallLayers: [],
  proxies,
};
const mvr = { fixtures: {}, layers: [], hiddenLayers: [], offset: [0, 0, 0] } as const;
const design: StageDesign = { ...template, mvr };

describe('mvrStagePlace', () => {
  it('holds every seat proxy in the scene box, and gives the views the seats of the stage only', () => {
    const scene = mvrCameraBounds(design, geometry);
    expect(scene.max[0]).toBeCloseTo(210.26);
    const place = mvrStagePlace(design, geometry);
    if (!place.seats) throw new Error('no seats');
    expect(place.seats.min[0]).toBeCloseTo(0);
    expect(place.seats.max[0]).toBeCloseTo(10.26);
    expect(place.seats.max[2] - place.seats.min[2]).toBeCloseTo(11 * 0.95);
    expect(place.farProxies).toBe(240);
    const views = mvrViews(scene, [], place);
    expect(views.house.max[0]).toBeLessThan(scene.max[0] - 150);
    expect(views.scene).toEqual(scene);
    expect(views.farProxies).toBe(240);
  });

  it('gives no seats and counts none when their layer is hidden', () => {
    const hidden: StageDesign = { ...design, mvr: { ...mvr, hiddenLayers: ['seats'] } };
    const place = mvrStagePlace(hidden, geometry);
    expect(place.seats).toBeUndefined();
    expect('seats' in place).toBe(false);
    expect(place.farProxies).toBe(0);
  });
});
