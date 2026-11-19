/**
 * Owns the rule that the MVR scenery and the missing-file prompt follow every stage change that is not the MVR
 * import's own: a stage without MVR data or with another file drops both, a stage of another MVR file queues the
 * restore of its stored bytes, and a stage of the same file takes its hidden layers. The stage is the real
 * `StageService` and the show load the real `ShowSerializer`.
 */
import { describe, expect, it, vi } from 'vitest';
import { followStage } from '../../../../src/app/mvr/followStage';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { importedDesign, jsonRoundTrip, stageWorld } from '../../../shared';

const RIG: StageDesign = { ...importedDesign(), source: { kind: 'mvr', name: 'Rig.mvr', fileHash: 'h1' } };
const OTHER: StageDesign = { ...importedDesign(), source: { kind: 'mvr', name: 'Other.mvr', fileHash: 'h2' } };
const unstored = (name: string): StageDesign => ({ ...importedDesign(), source: { kind: 'mvr', name } });
const DROP = ['dispose', 'prompt.hide'];
const QUIET = { bodies: { clear: vi.fn() }, hall: { show: vi.fn(), hide: vi.fn() } };
/** A stage world on `initial` that a stage follower watches; `calls` names each scenery, prompt and restore call. */
function followed(initial?: StageDesign) {
  const world = stageWorld(initial);
  const calls: string[] = [];
  const record = (name: string) => (): void => void calls.push(name);
  const setHiddenLayers = (uuids: readonly string[]): void => void calls.push(`hide ${JSON.stringify(uuids)}`);
  const refit = (design: StageDesign): void => void calls.push(`refit ${design.source.name}`);
  const scenery = { dispose: record('dispose'), setHiddenLayers, refit };
  const prompt = { hide: record('prompt.hide') };
  const restore = (design: StageDesign): void => void calls.push(`restore ${design.source.name}`);
  followStage({ ...QUIET, bus: world.bus, stage: world.service, scenery, prompt, restore });
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

  it('drops the scenery of a stage that keeps the file hash but has no MVR data', () => {
    const world = followed(RIG);
    world.service.apply({ ...createTemplate('theatre'), source: RIG.source }, 'builder');
    expect(world.calls).toEqual(DROP);
  });

  it('queues the restore of a show that holds another MVR file', () => {
    const world = followed(RIG);
    world.serializer.load({ stage: jsonRoundTrip(OTHER) });
    expect(world.service.design.source.fileHash).toBe('h2');
    expect(world.calls).toEqual([...DROP, 'restore Other.mvr']);
  });

  it('counts two MVR files that were not stored (no file hash) as two files', () => {
    const world = followed(unstored('A.mvr'));
    world.serializer.load({ stage: jsonRoundTrip(unstored('B.mvr')) });
    expect(world.calls).toEqual([...DROP, 'restore B.mvr']);
  });

  it('compares a show load with the file the import drew, not with the boot file', () => {
    const world = followed(RIG);
    world.service.apply(OTHER, 'import');
    world.serializer.load({ stage: jsonRoundTrip(RIG) });
    expect(world.calls).toEqual([...DROP, 'restore Rig.mvr']);
  });

  it('keeps the scenery of a show that holds the same file and gives it the hidden layers of the show', () => {
    const world = followed(RIG);
    const mvr = { ...RIG.mvr, hiddenLayers: [] } as StageDesign['mvr'];
    world.serializer.load({ stage: jsonRoundTrip({ ...RIG, mvr }) });
    expect(world.service.design.mvr?.hiddenLayers).toEqual([]);
    expect(world.calls).toEqual(['hide []', 'refit Rig.mvr']);
  });

  it('keeps the scenery when the builder edits the MVR stage (same file hash) and fits the views to it again', () => {
    const world = followed(RIG);
    world.service.apply({ ...RIG, source: { kind: 'builder', name: 'Edit', fileHash: 'h1' } }, 'builder');
    expect(world.calls).toEqual(['hide ["L-1"]', 'refit Edit']);
  });

  it('restores the MVR stage that a builder Cancel brings back after a template preview', () => {
    const world = followed(RIG);
    world.service.apply(createTemplate('theatre'), 'preview');
    world.service.apply(RIG, 'preview');
    expect(world.calls).toEqual([...DROP, ...DROP, 'restore Rig.mvr']);
  });
});
