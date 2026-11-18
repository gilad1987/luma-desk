import { describe, expect, it } from 'vitest';
import { isHallLayer } from '../../../src/mvr/design/isHallLayer.ts';
import type { LayerBox } from '../../../src/mvr/design/layerBoxes.ts';
import { pointBox, type Aabb } from '../../../src/mvr/math/Aabb.ts';

/** The rig of a made-up show: trusses and fixtures over 20 m x 10 m of plan, 8 m high. */
const CORE: Aabb = { min: [-10, 0, -5], max: [10, 8, 5] };

const plan = (x0: number, x1: number, z0: number, z1: number): Aabb => ({ min: [x0, 0, z0], max: [x1, 6, z1] });
const layer = (name: string, box: Aabb, rig = false): LayerBox => ({ layer: name, name, box, rig, drapes: false });
const hall = (l: LayerBox, core: Aabb = CORE): boolean => isHallLayer(l, core);

describe('isHallLayer name rule', () => {
  it('hides a layer whose name has a hall word, in English or Hebrew', () => {
    for (const name of ['Venue', 'Main Hall', 'ROOF', 'Seating', 'Audience area', 'Floor-Plan', 'אולם ראשי']) {
      expect(hall(layer(name, plan(-1, 1, -1, 1))), name).toBe(true);
    }
  });

  it('keeps names that only look like a hall', () => {
    for (const name of ['Front of House', 'Floor', 'Hallway lights', 'Roofline LED', 'Stage']) {
      expect(hall(layer(name, plan(-1, 1, -1, 1))), name).toBe(false);
    }
  });

  it('never hides a layer that holds trusses, fixture bodies or LED surfaces, whatever its name', () => {
    expect(hall(layer('Roof', plan(-12, 12, -6, 6), true))).toBe(false);
    expect(hall(layer('Layer 1', plan(-40, 40, -40, 40), true))).toBe(false);
  });
});

describe('isHallLayer structure words', () => {
  it('hides a wall, floor or ceiling layer that reaches 4 m past the rig on one side', () => {
    expect(hall(layer('Walls', plan(-10, 15, -5, 5.4)))).toBe(true);
    expect(hall(layer('Floor', plan(-12, 12, -13, 1)))).toBe(true);
    for (const name of ['Ceiling', 'Side wall', 'קירות', 'קיר', 'רצפה', 'תקרה']) {
      expect(hall(layer(name, plan(-10, 10, -5, 9))), name).toBe(true);
    }
  });

  it('keeps a structure layer that stays within 4 m of the rig', () => {
    expect(hall(layer('Stage floor', plan(-9, 9, -4, 4)))).toBe(false);
    expect(hall(layer('Back wall', plan(-12, 12, -7, -5)))).toBe(false);
  });

  it('keeps a structure layer that holds an LED surface or fixtures', () => {
    expect(hall(layer('Side wall LED', plan(-30, 30, -5, 5), true))).toBe(false);
    expect(hall(layer('LED wall', plan(-10, 10, -15, -5), true))).toBe(false);
    expect(hall(layer('Floor lights', plan(-10, 10, -5, 12), true))).toBe(false);
  });

  it('judges no structure layer against a rig too small to give a scale', () => {
    expect(hall(layer('Floor', plan(-20, 20, -20, 20)), pointBox([0, 5, 0]))).toBe(false);
  });
});

describe('isHallLayer box rule', () => {
  it('hides a nameless layer that holds the rig on plan, is twice its area and reaches 4 m past it on two sides', () => {
    expect(hall(layer('Layer 7', plan(-10.5, 10.5, -9, 20)))).toBe(true);
    expect(hall(layer('Layer 8', plan(-16, 16, -7, 7)))).toBe(true);
  });

  it('keeps a low layer around the rig: a deck, a set and audience platforms below half the rig height', () => {
    expect(hall(layer('Layer 9', { min: [-20, 0, -6], max: [20, 3.8, 34] }))).toBe(false);
    expect(hall(layer('Layer 10', { min: [-20, 0, -6], max: [20, 4, 34] }))).toBe(true);
  });

  it('keeps a deck that reaches a little past the rig', () => {
    expect(hall(layer('Deck', plan(-11, 11, -6, 8)))).toBe(false);
    expect(hall(layer('Wide deck', plan(-13, 13, -6, 7)))).toBe(false);
  });

  it('keeps a truss, an LED wall and a far FOH platform layer', () => {
    expect(hall(layer('Truss', plan(-9, 9, -4, 4)))).toBe(false);
    expect(hall(layer('Screen', plan(-6, 6, -5, -4.5)))).toBe(false);
    expect(hall(layer('FOH', plan(-3, 3, 20, 24)))).toBe(false);
  });

  it('keeps a layer that misses part of the rig, and judges nothing against a rig too small to give a scale', () => {
    expect(hall(layer('Half', plan(-30, 0, -30, 30)))).toBe(false);
    expect(hall(layer('Around one fixture', plan(-20, 20, -20, 20)), pointBox([0, 5, 0]))).toBe(false);
  });
});
