/**
 * The audience on seat proxies: who sits where is fixed by the seed, the summary's choice reaches the meshes, and a
 * stage change frees everything the audience made.
 */
import { afterEach, expect, it } from 'vitest';
import { addAudience, audienceFigures, setAudience } from '../../../../../src/render/venue/audience/addAudience.ts';
import { AUDIENCE_GROUP } from '../../../../../src/render/venue/audience/figureSlot.ts';
import { FIGURES } from '../../../../../src/render/venue/audience/FigureSpec.ts';
import { figureCount, fillOrder } from '../../../../../src/render/venue/audience/occupancy.ts';
import { drawn, figureMeshes, freeStages, matrices, seatStage } from './seatStage.ts';

afterEach(freeStages);

/** The X of every drawn figure: one value per seat of the row. */
const places = (root: ReturnType<typeof seatStage>): Set<number> =>
  new Set(matrices(root).flatMap((all) => all.filter((_, i) => i % 16 === 12)));

it('seats 85 % of the seats with the same people every time', () => {
  const [first, second] = [seatStage(200), seatStage(200)];
  expect(addAudience(first)).toBe(170);
  expect(addAudience(second)).toBe(340);
  expect([drawn(first), figureMeshes(first).length]).toEqual([170, FIGURES.length * 2]);
  expect(matrices(second)).toEqual(matrices(first));
  expect(addAudience(first)).toBe(340);
  expect(figureMeshes(first)).toHaveLength(FIGURES.length * 2);
});

it('fills seats in a fixed order, so more occupancy adds people and moves none', () => {
  expect([figureCount(2895, 0.85), figureCount(2895, 0), figureCount(2895, 1)]).toEqual([2461, 0, 2895]);
  const order = Array.from(fillOrder(500));
  expect(Array.from(fillOrder(500))).toEqual(order);
  expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 500 }, (_, i) => i));
  const root = seatStage(200);
  addAudience(root);
  expect(setAudience({ shown: true, occupancy: 0.5 })).toBe(100);
  root.updateMatrixWorld();
  const half = places(root);
  expect(setAudience({ shown: true, occupancy: 1 })).toBe(200);
  root.updateMatrixWorld();
  const full = places(root);
  expect([half.size, full.size, [...half].every((x) => full.has(x))]).toEqual([100, 200, true]);
});

it('hides the figures when the audience is off', () => {
  const root = seatStage(20);
  addAudience(root);
  expect(setAudience({ shown: false, occupancy: 1 })).toBe(0);
  expect(root.getObjectByName(AUDIENCE_GROUP)?.visible).toBe(false);
  expect(setAudience({ shown: true, occupancy: 1 })).toBe(20);
});

it('frees its geometries with the stage and starts the next stage with the default choice', () => {
  const root = seatStage(40);
  addAudience(root);
  setAudience({ shown: true, occupancy: 0.5 });
  let freed = 0;
  for (const mesh of figureMeshes(root)) mesh.geometry.addEventListener('dispose', () => freed++);
  figureMeshes(root).forEach((mesh) => mesh.dispose());
  expect([freed, audienceFigures()]).toEqual([FIGURES.length * 2, 0]);
  expect(addAudience(seatStage(40))).toBe(34);
});
