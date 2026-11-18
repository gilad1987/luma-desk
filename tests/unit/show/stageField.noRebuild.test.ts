/**
 * Owns the show-load rule that the stage applies only when the design changes, and that a load which throws on JSON
 * `null` changes no stage: each apply rebuilds the scene, so a needless one costs a full rebuild.
 */
import { describe, expect, it } from 'vitest';
import { createTemplate } from '../../../src/domain/stage/templates';
import { savedStageOf } from '../../../src/show/stageField';
import { importedDesign } from './importedDesign';
import { BAD_STAGE, stageWorld } from './stageWorld';

describe('show stage field: no rebuild', () => {
  it('load(null) throws before the stage changes', () => {
    const theatre = createTemplate('theatre');
    const world = stageWorld(theatre);
    expect(() => world.serializer.load(null)).toThrow(TypeError);
    expect(world.service.isBuiltIn).toBe(false);
    expect(world.service.design).toBe(theatre);
    expect(world.designs).toEqual([]);
  });

  it('booting on the stored stage, then loading the same show, does not rebuild the rig', () => {
    const theatre = createTemplate('theatre');
    const text = stageWorld(theatre).json();
    const world = stageWorld(savedStageOf(text));
    world.serializer.load(JSON.parse(text));
    expect(world.designs).toEqual([]);
    expect(world.service.design).toEqual(theatre);
  });

  it('booting on a stored MVR stage (patch, mvr, fileHash), then loading the same show, does not rebuild', () => {
    const imported = { ...importedDesign(), source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h1' } } as const;
    const text = stageWorld(imported).json();
    const world = stageWorld(savedStageOf(text));
    world.serializer.load(JSON.parse(text));
    expect(world.designs).toEqual([]);
    expect(world.service.design).toEqual(imported);
  });

  it('a bad stage on the built-in stage toasts once and does not rebuild the rig', () => {
    const world = stageWorld();
    world.serializer.load({ stage: { v: 2 } });
    expect(world.messages).toEqual([{ kind: 'toast', text: BAD_STAGE }]);
    expect(world.designs).toEqual([]);
    expect(world.service.isBuiltIn).toBe(true);
  });
});
