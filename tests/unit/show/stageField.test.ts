/**
 * Owns the optional `stage` key of the show file (plan §3.4, contract §4): written last and only for a custom design,
 * read before the groups, the built-in design for a missing or bad key. Parsing rules are owned by the domain tests.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates';
import { defaultPoolOf } from '../../../src/engine/stage/defaultPool';
import { jsonRoundTrip, readGolden } from '../../shared';
import { readSavedShow } from './showWorld';
import { BAD_STAGE, stageWorld } from './stageWorld';

describe('show stage field: save', () => {
  it('built-in stage: no stage key, and the demo show is byte-equal to the golden', () => {
    const world = stageWorld();
    world.demo.load();
    expect(world.serializer.serialize()).not.toHaveProperty('stage');
    expect(world.json()).toBe(JSON.stringify(readGolden('demo-show')));
  });

  it('custom stage: stage is the last key and holds the active design', () => {
    const theatre = createTemplate('theatre');
    const file = stageWorld(theatre).serializer.serialize();
    expect(Object.keys(file)).toEqual(['v', 'groups', 'presets', 'execs', 'bpm', 'haze', 'stage']);
    expect(file.stage).toBe(theatre);
  });
});

describe('show stage field: load', () => {
  it('a custom stage survives save -> JSON -> load deep-equal, and the groups come from its rig', () => {
    const theatre = createTemplate('theatre');
    const source = stageWorld();
    source.serializer.load({ stage: jsonRoundTrip(theatre) });
    expect(source.groups.all).toStrictEqual(defaultPoolOf(source.service));
    const saved = source.json();
    const world = stageWorld();
    world.serializer.load(JSON.parse(saved));
    expect(world.service.isBuiltIn).toBe(false);
    expect(world.service.design).toEqual(theatre);
    expect(world.json()).toBe(saved);
    expect([...source.messages, ...world.messages]).toEqual([]);
  });

  it('an invalid stage applies the built-in stage, toasts once, and loads the rest of the show', () => {
    const world = stageWorld(createTemplate('theatre'));
    world.serializer.load({ stage: { v: 2 }, bpm: 90, execs: [{ name: 'Kept' }] });
    expect(world.service.isBuiltIn).toBe(true);
    expect(world.messages).toEqual([{ kind: 'toast', text: BAD_STAGE }]);
    expect([world.tempo.bpm, world.execs[0]?.name]).toEqual([90, 'Kept']);
    expect(world.groups.all).toStrictEqual(defaultPoolOf(world.service));
  });

  it('an old show without stage, loaded on a custom stage, applies the built-in stage and saves unchanged', () => {
    const raw = readSavedShow('old-show-v1.json');
    const world = stageWorld(createTemplate('festival'));
    world.serializer.load(JSON.parse(raw));
    expect(world.service.isBuiltIn).toBe(true);
    expect(world.designs).toHaveLength(1);
    expect(world.json()).toBe(raw.trimEnd());
    expect(world.messages).toEqual([]);
  });

  it('a show without stage on the built-in stage does not rebuild the rig', () => {
    const world = stageWorld();
    world.serializer.load(JSON.parse(readSavedShow('old-show-v1.json')));
    expect(world.designs).toEqual([]);
    expect(world.service.isBuiltIn).toBe(true);
  });
});
