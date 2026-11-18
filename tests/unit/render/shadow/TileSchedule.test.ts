import { describe, expect, it } from 'vitest';
import { LIGHTS, scheduleSetup as setup } from './scheduleSetup';

describe('TileSchedule', () => {
  it('draws a static rig in 8 frames and then draws nothing: the caps hold in every frame', () => {
    const { schedule, plan } = setup();
    const draws = Array.from({ length: 10 }, () => plan().length);
    expect(draws).toEqual([12, 4, 4, 4, 4, 4, 4, 4, 0, 0]);
    const tiles = [...schedule.tileOf.subarray(0, LIGHTS)];
    expect(new Set(tiles).size).toBe(LIGHTS);
    expect(tiles.slice(0, 8).every((tile) => tile >= 0 && tile < 8)).toBe(true);
    expect(tiles.slice(8).every((tile) => tile >= 8 && tile < 40)).toBe(true);
  });

  it('reports a secondary light without a drawn tile as -1 until its turn', () => {
    const { schedule, plan } = setup();
    expect(plan()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(schedule.tileOf[11]).toBeGreaterThanOrEqual(8);
    expect(schedule.tileOf[12]).toBe(-1);
    expect(plan()).toEqual([12, 13, 14, 15]);
    expect(schedule.tileOf[12]).toBeGreaterThanOrEqual(8);
  });

  it('redraws the tile of a moving hero light every frame and no other', () => {
    const { schedule, plan, move } = setup();
    for (let frame = 0; frame < 9; frame++) plan();
    const kept = schedule.tileOf[5];
    for (let frame = 0; frame < 3; frame++) {
      move(3);
      expect(plan()).toEqual([3]);
      expect(schedule.tileOf[3]).toBeGreaterThanOrEqual(0);
      expect(schedule.tileOf[5]).toBe(kept);
    }
  });

  it('draws moving secondary lights four per frame in turn, and reports the others as not valid', () => {
    const { schedule, plan, move } = setup();
    for (let frame = 0; frame < 9; frame++) plan();
    const turns = new Map<number, number>();
    for (let frame = 0; frame < 16; frame++) {
      for (let light = 8; light < LIGHTS; light++) move(light);
      const drawn = plan();
      expect(drawn).toHaveLength(4);
      for (const light of drawn) turns.set(light, (turns.get(light) ?? 0) + 1);
      const valid = [...schedule.tileOf.subarray(8, LIGHTS)].filter((tile) => tile >= 0);
      expect(valid).toHaveLength(4);
      // the static hero lights keep their tiles while the others move
      expect([...schedule.tileOf.subarray(0, 8)].every((tile) => tile >= 0 && tile < 8)).toBe(true);
    }
    expect(turns.size).toBe(32);
    expect([...turns.values()].every((count) => count === 2)).toBe(true);
  });

  it('keeps the tile of a static light when another light moves, and finds a tile again after a pause', () => {
    const { schedule, picks, plan, move } = setup();
    for (let frame = 0; frame < 9; frame++) plan();
    const tile = schedule.tileOf[20];
    move(21);
    plan();
    expect(schedule.tileOf[20]).toBe(tile);
    picks.count = 20;
    plan();
    expect(schedule.tileOf[20]).toBe(-1);
    picks.count = LIGHTS;
    expect(plan()).toEqual([]);
    expect(schedule.tileOf[20]).toBe(tile);
  });

  it('never draws more than the cap: the hero lights past it wait unshadowed', () => {
    const { schedule, plan } = setup({ maxDraws: 5, maxSecondary: 4 });
    expect(plan()).toEqual([0, 1, 2, 3, 4]);
    expect([...schedule.tileOf.subarray(0, 8)].filter((tile) => tile >= 0)).toHaveLength(5);
    expect(plan()).toEqual([5, 6, 7, 8, 9]);
  });

  it('draws every tile again when the scenery epoch changes', () => {
    const { schedule, plan } = setup();
    for (let frame = 0; frame < 9; frame++) plan();
    expect(plan(2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(schedule.tileOf[30]).toBe(-1);
  });

  it('takes back the draws that a frame had no time for, and draws them first in the next frame', () => {
    const { schedule, plan } = setup();
    plan();
    schedule.cancel(9);
    expect(schedule.drawCount).toBe(9);
    expect([schedule.tileOf[8], schedule.tileOf[9], schedule.tileOf[10]]).toEqual([8, -1, -1]);
    expect(plan()).toEqual([9, 10, 11, 12]);
  });
});
