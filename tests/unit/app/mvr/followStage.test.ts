/**
 * Owns the rule that the MVR scenery and the missing-file prompt follow every stage change that is not the MVR
 * import's own: a stage without MVR data or with another file drops both, and a stage of another MVR file queues the
 * restore of its stored bytes. The stage is the real `StageService` and the show load the real `ShowSerializer`.
 */
import { describe, expect, it } from 'vitest';
import { followStage } from '../../../../src/app/mvr/followStage';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { jsonRoundTrip } from '../../../shared';
import { importedDesign } from '../../show/importedDesign';
import { stageWorld } from '../../show/stageWorld';

const RIG: StageDesign = { ...importedDesign(), source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h1' } };
const OTHER: StageDesign = { ...importedDesign(), source: { kind: 'mvr', name: 'Other.mvr', fileHash: 'h2' } };
const DROP = ['dispose', 'prompt.hide'];

/** A stage world on `initial` that a stage follower watches; `calls` names its dispose, hide and restore calls. */
function followed(initial?: StageDesign) {
  const world = stageWorld(initial);
  const calls: string[] = [];
  const record = (name: string) => (): void => void calls.push(name);
  const scenery = { dispose: record('dispose') };
  const prompt = { hide: record('prompt.hide') };
  followStage({ bus: world.bus, stage: world.service, scenery, prompt, restore: record('restore') });
  return { ...world, calls };
}

describe('followStage', () => {
  it('leaves the MVR import its own apply: no dispose, no hide, no restore', () => {
    const world = followed();
    world.service.apply(RIG, 'import');
    expect(world.calls).toEqual([]);
  });

  it('drops the scenery and the prompt when a show without a stage follows an import', () => {
    const world = followed();
    world.service.apply(RIG, 'import');
    world.serializer.load({});
    expect(world.service.isBuiltIn).toBe(true);
    expect(world.calls).toEqual(DROP);
  });

  it('drops the scenery and the prompt when a template follows an import', () => {
    const world = followed();
    world.service.apply(RIG, 'import');
    world.service.apply(createTemplate('theatre'), 'builder');
    expect(world.calls).toEqual(DROP);
  });

  it('queues the restore of a show that holds another MVR file', () => {
    const world = followed(RIG);
    world.serializer.load({ stage: jsonRoundTrip(OTHER) });
    expect(world.service.design.source.fileHash).toBe('h2');
    expect(world.calls).toEqual([...DROP, 'restore']);
  });

  it('keeps the scenery of a show that holds the same file with other hidden layers', () => {
    const world = followed(RIG);
    const mvr = { ...RIG.mvr, hiddenLayers: [] } as StageDesign['mvr'];
    world.serializer.load({ stage: jsonRoundTrip({ ...RIG, mvr }) });
    expect(world.service.design.mvr?.hiddenLayers).toEqual([]);
    expect(world.calls).toEqual([]);
  });

  it('keeps the scenery when the builder edits the MVR stage (same file hash)', () => {
    const world = followed(RIG);
    world.service.apply({ ...RIG, source: { kind: 'builder', name: 'Edit', fileHash: 'h1' } }, 'builder');
    expect(world.calls).toEqual([]);
  });

  it('restores the MVR stage that a builder Cancel brings back after a template preview', () => {
    const world = followed(RIG);
    world.service.apply(createTemplate('theatre'), 'preview');
    world.service.apply(RIG, 'preview');
    expect(world.calls).toEqual([...DROP, ...DROP, 'restore']);
  });
});
