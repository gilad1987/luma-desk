import { describe, expect, it } from 'vitest';
import { scheduleSetup } from './scheduleSetup';

const HEROES = 8;

/**
 * A rig of 30 picked lights whose secondary draws are always busy: lights 8 to 15 move in every frame, so a new
 * secondary tile waits for its turn. `swap` changes the rank of a hero light and a secondary light.
 */
function busyRig(count = 30) {
  const { schedule, picks, plan, move } = scheduleSetup();
  picks.count = count;
  const frame = (): void => {
    for (let light = 8; light < 16; light++) move(light);
    plan();
  };
  const swap = (a: number, b: number): void => {
    const at = picks.lights.indexOf(a);
    picks.lights[picks.lights.indexOf(b)] = a;
    picks.lights[at] = b;
  };
  for (let warm = 0; warm < 12; warm++) frame();
  return { schedule, frame, swap };
}

/** Runs `frames` frames and returns in how many of them light 3 or light 20 had no usable tile. */
function gaps(rig: ReturnType<typeof busyRig>, frames: number): number {
  let without = 0;
  for (let f = 0; f < frames; f++) {
    rig.frame();
    if ([3, 20].some((light) => (rig.schedule.tileOf[light] ?? -1) < 0)) without += 1;
  }
  return without;
}

describe('a light whose rank changes', () => {
  it('has a usable tile in every frame when a hero falls to the secondary lights and comes back', () => {
    const rig = busyRig();
    const { tileOf } = rig.schedule;
    expect(gaps(rig, 1)).toBe(0);
    // light 20 takes the hero rank of light 3
    rig.swap(3, 20);
    expect(gaps(rig, 12)).toBe(0);
    // by then each has a tile of its new class
    expect(tileOf[3]).toBeGreaterThanOrEqual(HEROES);
    expect(tileOf[20]).toBeLessThan(HEROES);
    rig.swap(3, 20);
    expect(gaps(rig, 12)).toBe(0);
    expect(tileOf[3]).toBeLessThan(HEROES);
    expect(tileOf[20]).toBeGreaterThanOrEqual(HEROES);
  });

  it('keeps both lights shadowed when no tile is free: each reads the tile of its old class', () => {
    const rig = busyRig(40);
    rig.swap(3, 20);
    expect(gaps(rig, 12)).toBe(0);
  });

  it('lends no tile across a change of the scenery: a secondary light is never shown with an old shadow', () => {
    const { schedule, picks, plan } = scheduleSetup();
    for (let warm = 0; warm < 9; warm++) plan();
    picks.lights[3] = 39;
    picks.lights[39] = 3;
    plan(2);
    // light 3 is the last secondary light: its new tile is not drawn in this frame, and the hero tile is old
    expect(schedule.tileOf[3]).toBe(-1);
  });
});
