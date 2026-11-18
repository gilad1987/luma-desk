import { describe, expect, it } from 'vitest';
import type { StageBounds } from '../../../../src/domain/stage/types';
import { mvrViews } from '../../../../src/render/mvr/mvrViews';
import { stageViews } from '../../../../src/render/mvr/stageViews';

const stage: StageBounds = { min: [-12, 0, -10], max: [12, 11, 4] };
/** The camera box: the stage plus seat rows out to 60 m in front of it. */
const box: StageBounds = { min: [-30, 0, -10], max: [30, 11, 60] };
const deck = { x0: -8, x1: 8, z0: -8, z1: 2, height: 1.5 };

describe('stageViews', () => {
  const views = stageViews({ stage, deck }, box);

  it('stands upstage centre at performer eye height and looks out over the band to the house (On Stage)', () => {
    const { position, target } = views.stage;
    // the built-in meaning (`VIEWS.stage`): the eye is on the deck, the target is in the house
    expect(position).toEqual([0, deck.height + 1.7, -5.5]);
    expect(position[2]).toBeLessThan((deck.z0 + deck.z1) / 2);
    expect(target[0]).toBe(0);
    expect(target[2]).toBeGreaterThan(stage.max[2]);
    expect(target[2]).toBeLessThan(box.max[2]);
    expect(position[1]).toBeGreaterThanOrEqual(target[1]);
  });

  it('looks from over the deck at the seats in front of the stage', () => {
    const { position, target } = views.aud;
    expect(position[2]).toBeLessThan(deck.z1);
    expect(position[1]).toBeLessThan(stage.max[1]);
    expect(target[2]).toBeGreaterThan(stage.max[2]);
    expect(target[2]).toBeLessThan(box.max[2]);
  });

  it('frames the middle of the deck from the house side for the band', () => {
    const view = views.band;
    expect(view.position[2]).toBeGreaterThan(deck.z1);
    expect(view.target).toEqual([0, deck.height + 1.4, -3]);
    // the orbit controls lift an eye that is below its target, which would move the framing
    expect(view.position[1]).toBeGreaterThanOrEqual(view.target[1]);
  });

  it('uses the stage box when the deck lies outside it', () => {
    const far = stageViews({ stage, deck: { ...deck, z0: 200, z1: 210 } }, box);
    expect(far.stage.position).toEqual([0, 1.7, -6.5]);
    expect(far.band.position[2]).toBeGreaterThan(stage.max[2]);
  });

  it('gives the demo venue places a view of the imported stage', () => {
    const all = mvrViews(box, [], { stage, deck }).tableFor({
      width: 16,
      height: 9,
      free: { x: 0, y: 0, width: 16, height: 9 },
    });
    expect(all.drums).toBe(all.band);
    expect(all.orch).toBe(all.band);
    expect(all.ring).toBe(all.stage);
    expect(all.walls).toBe(all.wide);
    expect(all.valley).toBe(all.wide);
  });
});
