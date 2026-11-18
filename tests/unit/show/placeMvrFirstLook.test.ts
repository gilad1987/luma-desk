import { describe, expect, it } from 'vitest';
import { rigFromDesign } from '../../../src/domain/stage/deriveRig';
import { frameOf } from '../../../src/domain/stage/StageFrame';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import { MVR_FIRST_LOOK_NAME } from '../../../src/show/mvrLook/mvrFirstLook';
import { placeMvrFirstLook } from '../../../src/show/mvrLook/placeMvrFirstLook';
import { showWorld } from '../../shared';

/** A show world and the deps that place the look of template `id` in it. */
function placing(id: TemplateId = 'theatre') {
  const world = showWorld();
  const design = createTemplate(id);
  const source = { rig: rigFromDesign(design), design, frame: frameOf(design) };
  const deps = { source, builtInRig: world.rig, execs: world.execs, bus: world.bus };
  return { world, place: () => placeMvrFirstLook(deps) };
}

const userCue = { num: 1, name: 'Mine', fade: 0, vals: { 1: { dim: 50 } }, fx: [] };

describe('placeMvrFirstLook', () => {
  it('replaces the untouched demo song on executor 1, plays it at full and asks for a save', () => {
    const { world, place } = placing();
    world.demo.load();
    world.events.length = 0;
    expect(place()).toEqual({ kind: 'placed', execIndex: 0 });
    const [exec] = world.execs;
    expect(exec).toMatchObject({ name: MVR_FIRST_LOOK_NAME, level: 1, on: true, cur: 0 });
    expect(exec?.cues.map((c) => c.name)).toEqual([MVR_FIRST_LOOK_NAME]);
    expect(world.events).toEqual(expect.arrayContaining(['showChanged', 'stateDirty']));
    expect(world.serializer.serialize().execs[0]?.name).toBe(MVR_FIRST_LOOK_NAME);
  });

  it('replaces an earlier first look on a second import', () => {
    const { world, place } = placing();
    place();
    expect(place()).toEqual({ kind: 'placed', execIndex: 0 });
    expect(world.execs[0]?.cues).toHaveLength(1);
  });

  it('keeps the operator cues on executor 1 and uses the first empty executor', () => {
    const { world, place } = placing();
    world.demo.load();
    world.execs[0]?.cues.splice(0, 1);
    const kept = JSON.stringify(world.execs[0]?.cues);
    const empty = world.execs[3];
    if (!empty) throw new Error('no executor 4');
    empty.cues = [];
    expect(place()).toEqual({ kind: 'placed', execIndex: 3 });
    expect(JSON.stringify(world.execs[0]?.cues)).toBe(kept);
    expect(empty.name).toBe(MVR_FIRST_LOOK_NAME);
  });

  it('changes nothing when every executor holds operator cues', () => {
    const { world, place } = placing();
    for (const e of world.execs) e.cues = [{ ...userCue }];
    world.events.length = 0;
    expect(place()).toEqual({ kind: 'noFreeExecutor' });
    expect(world.execs.every((e) => e.cues[0]?.name === 'Mine')).toBe(true);
    expect(world.events).toEqual([]);
  });

  it('places nothing on a stage without look fixtures', () => {
    const { world, place } = placing('empty');
    expect(place()).toEqual({ kind: 'noLook' });
    expect(world.execs[0]?.cues).toEqual([]);
  });
});
