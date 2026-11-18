import { describe, expect, it } from 'vitest';
import { createTemplate, type TemplateId } from '../../../src/domain/stage/templates';
import { defaultPoolOf } from '../../../src/engine/stage/defaultPool';
import { DemoShow } from '../../../src/show';
import { readGolden, type SavedShow } from '../../shared';
import { stageWorld } from './stageWorld';

/** A stage world whose demo reads the stage service, as main.ts wires it once the stage builder is on. */
function demoWorld(id?: TemplateId) {
  const world = stageWorld(id === undefined ? undefined : createTemplate(id));
  const { service, serializer, execs, state, bus } = world;
  const demo = new DemoShow({ rig: service.rig, source: service, serializer, execs, state, bus });
  return { ...world, demo };
}

/** The ids every cue of every executor of the saved show writes values on. */
function cueIds(show: SavedShow): number[] {
  return show.execs.flatMap((e) => e.cues.flatMap((c) => Object.keys(c.vals).map(Number)));
}

describe('DemoShow on the current stage', () => {
  it.each(['empty', 'theatre', 'festival'] as TemplateId[])('loads on the %s stage and keeps it', (id) => {
    const world = demoWorld(id);
    const { service } = world;
    const design = service.design;
    world.demo.load();
    expect(world.designs).toEqual([]);
    expect(service.design).toBe(design);
    const saved = JSON.parse(world.json()) as SavedShow & { stage?: unknown };
    expect(saved.groups).toEqual(JSON.parse(JSON.stringify(defaultPoolOf(service))));
    expect(saved.stage).toEqual(JSON.parse(JSON.stringify(design)));
    expect(cueIds(saved).filter((n) => !service.rig.get(n))).toEqual([]);
  });

  it('lights the stage screens, not a fixed id (festival screen 1001)', () => {
    const world = demoWorld('festival');
    world.demo.load();
    const intro = world.execs[0]?.cues[0];
    expect(intro?.vals[1001]?.dim).toBeGreaterThan(0);
  });

  it('is still the golden demo on the built-in stage, with no stage key', () => {
    const world = demoWorld();
    world.demo.load();
    expect(world.designs).toEqual([]);
    expect(world.json()).toBe(JSON.stringify(readGolden('demo-show')));
  });
});
