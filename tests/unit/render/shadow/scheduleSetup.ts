import { LIVE_LAYOUT } from '../../../../src/render/shadow/atlasLayout';
import { createPicks, type Picks } from '../../../../src/render/shadow/rankBeams';
import { rowWords } from '../../../../src/render/shadow/tileKey';
import { TileSchedule } from '../../../../src/render/shadow/TileSchedule';
import { beamRows, setRow } from './shadowRows';

export const LIGHTS = 40;

/** A schedule on the live layout with 40 picked lights: 0..7 hero, 8..39 secondary. */
export function scheduleSetup(caps = { maxDraws: 12, maxSecondary: 4 }) {
  const rows = beamRows(LIGHTS + 1);
  const words = rowWords(rows);
  const picks: Picks = createPicks(LIGHTS);
  picks.lights.set(Array.from({ length: LIGHTS }, (_, i) => i));
  picks.heroes = 8;
  picks.count = LIGHTS;
  const schedule = new TileSchedule(LIVE_LAYOUT, caps, 64);
  let moves = 0;
  /** Gives a light a row no frame had before. */
  const move = (light: number): void => setRow(rows, light, { origin: [light, 8, ++moves] });
  const plan = (epoch = 1): number[] => {
    schedule.plan(words, picks, epoch);
    return [...schedule.drawLights.subarray(0, schedule.drawCount)];
  };
  return { schedule, picks, plan, move };
}
