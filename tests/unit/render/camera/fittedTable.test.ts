/**
 * The camera asks the table once per render tick. A tick whose camera numbers did not change stops at `FrameKey`,
 * before a frame is built, and keeps the views; a new aspect or view offset still makes the views again.
 */
import { PerspectiveCamera } from 'three';
import { expect, it, vi } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { FittedTable } from '../../../../src/render/camera/FittedTable';
import { FrameKey } from '../../../../src/render/camera/FrameKey';
import type { ViewFitter, ViewFrame } from '../../../../src/render/camera/viewFrame';

const box: StageBounds = { min: [-10, 0, -10], max: [10, 8, 4] };

function fitted() {
  const tableFor = vi.fn((frame: ViewFrame) => ({
    crowd: { position: [0, 2, frame.width] as const, target: [0, 2, 0] as const },
  }));
  const fitter: ViewFitter = { rig: box, scene: box, tableFor };
  const table = new FittedTable();
  table.set(box, fitter);
  return { table, tableFor };
}

it('tells a changed aspect or view offset from a still camera', () => {
  const key = new FrameKey();
  const camera = new PerspectiveCamera(46, 16 / 9);
  expect([key.changed(camera), key.changed(camera)]).toEqual([true, false]);
  camera.aspect = 4 / 3;
  expect([key.changed(camera), key.changed(camera)]).toEqual([true, false]);
  camera.setViewOffset(1600, 1200, 0, 100, 1600, 1200);
  expect([key.changed(camera), key.changed(camera)]).toEqual([true, false]);
  camera.setViewOffset(1600, 1200, 0, 150, 1600, 1200);
  expect([key.changed(camera), key.changed(camera)]).toEqual([true, false]);
  camera.clearViewOffset();
  expect([key.changed(camera), key.changed(camera)]).toEqual([true, false]);
});

it('keeps the same views while the camera numbers stay', () => {
  const { table, tableFor } = fitted();
  const camera = new PerspectiveCamera(46, 16 / 9);
  expect(table.follow(camera)).toBe(true);
  const views = table.views;
  for (let tick = 0; tick < 5; tick++) expect(table.follow(camera)).toBe(false);
  expect(tableFor).toHaveBeenCalledTimes(1);
  expect(table.views).toBe(views);
});

it('makes the views again for a new aspect or a new view offset', () => {
  const { table, tableFor } = fitted();
  const camera = new PerspectiveCamera(46, 16 / 9);
  table.follow(camera);
  camera.aspect = 4 / 3;
  expect(table.follow(camera)).toBe(true);
  camera.setViewOffset(1600, 1200, 0, 100, 1600, 1200);
  expect(table.follow(camera)).toBe(true);
  camera.setViewOffset(1600, 1200, 0, 150, 1600, 1200);
  expect([table.follow(camera), table.follow(camera)]).toEqual([true, false]);
  expect(tableFor).toHaveBeenCalledTimes(4);
});

it('keeps the views when a new aspect gives the same frame under a view offset', () => {
  const { table, tableFor } = fitted();
  const camera = new PerspectiveCamera(46, 4 / 3);
  camera.setViewOffset(1600, 1200, 0, 100, 1600, 1200);
  table.follow(camera);
  camera.aspect = 16 / 9;
  expect(table.follow(camera)).toBe(false);
  expect(tableFor).toHaveBeenCalledTimes(1);
});
