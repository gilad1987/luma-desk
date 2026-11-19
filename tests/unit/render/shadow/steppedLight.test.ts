import { Matrix4, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { ROW } from '../../../../src/render/beams/packBeam';
import { LightPicker } from '../../../../src/render/shadow/LightPicker';
import { SHADOW_DEFAULTS, type ShadowConfig } from '../../../../src/render/shadow/shadowConfig';
import { KEY, nearKey, rowWords, storeKey } from '../../../../src/render/shadow/tileKey';
import { TileSchedule } from '../../../../src/render/shadow/TileSchedule';
import { beamRows, setRow } from './shadowRows';

const layout = { size: 4096, hero: { count: 2, size: 1024 }, secondary: { count: 3, size: 512 } };
const AFTER: ShadowConfig = { ...SHADOW_DEFAULTS, layout };
/** The rule before the fix: one rest time, and a step is a move. */
const BEFORE: ShadowConfig = { ...AFTER, moveWindow: 0, movingRestFrames: 0 };
/** One 8-bit step of a 540 degree pan, in radians. */
const PAN_STEP = ((540 / 255) * Math.PI) / 180;
const LIGHT = 3;

function viewProjection(): number[] {
  const camera = new PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(2, 4, 20);
  camera.lookAt(2, 4, 0);
  camera.updateMatrixWorld();
  return new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).elements;
}

const pan = (rows: Float32Array, steps: number): void =>
  setRow(rows, LIGHT, { origin: [LIGHT, 8, 0], axis: [Math.sin(steps * PAN_STEP), -Math.cos(steps * PAN_STEP), 0] });

/**
 * 300 frames of a rig with two bright hero lights and a light past them that pans one step every `every` frames.
 * Returns the frames in which that light had no usable tile, and how often its shadow went off.
 */
function run(config: ShadowConfig, every: number): { dark: number; blinks: number } {
  const picker = new LightPicker(config, () => 1);
  const schedule = new TileSchedule(config.layout, config, 16);
  const rows = beamRows(4);
  setRow(rows, 0, { origin: [0, 8, 0], peak: 9 });
  setRow(rows, 1, { origin: [1, 8, 0], peak: 8 });
  const view = viewProjection();
  let dark = 0;
  let blinks = 0;
  let lit = false;
  for (let frame = 0; frame < 300; frame++) {
    if (frame % every === 0) pan(rows, frame / every);
    schedule.plan(picker.words, picker.pick(rows, 4, view, 1), 1);
    const shadowed = (schedule.tileOf[LIGHT] ?? -1) >= 0;
    if (!shadowed) dark += 1;
    if (lit && !shadowed) blinks += 1;
    lit = shadowed;
  }
  return { dark, blinks };
}

describe('a light past the hero tiles that pans in 8-bit steps', () => {
  it('keeps its shadow through a step every 40 frames, where it went off at each of the 7 steps', () => {
    // before: 2 frames at the start and 2 after each step; after: the 2 frames at the start
    expect(run(BEFORE, 40)).toEqual({ dark: 16, blinks: 7 });
    expect(run(AFTER, 40)).toEqual({ dark: 2, blinks: 0 });
  });

  it('stays unshadowed when it steps faster than it may rest, where its shadow went off 59 times', () => {
    expect(run(BEFORE, 5).blinks).toBe(59);
    // the first step comes from rest and keeps the tile; the next one shows that the light moves
    expect(run(AFTER, 5).blinks).toBe(1);
  });

  it('takes one pan step for a step of the same light, and a light one metre away for another light', () => {
    // row 3 is the light as it stood, rows 0 and 1 are the light one and two steps on, row 2 stands a metre away
    const rows = beamRows(4);
    const words = rowWords(rows);
    const keys = new Uint32Array(2 * KEY);
    pan(rows, 0);
    storeKey(words, LIGHT * ROW, keys, 0);
    storeKey(words, 2 * ROW, keys, 1);
    [1, 2].forEach((steps, row) => {
      pan(rows, steps);
      rows.copyWithin(row * ROW, LIGHT * ROW, (LIGHT + 1) * ROW);
    });
    expect([nearKey(words, 0, keys, 0), nearKey(words, ROW, keys, 0)]).toEqual([true, false]);
    expect(nearKey(words, 0, keys, 1)).toBe(false);
  });
});
