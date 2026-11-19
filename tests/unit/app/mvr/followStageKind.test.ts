// @vitest-environment jsdom
/**
 * Owns the rule that the stage title and the hall light follow the stage kind, not the scenery: an MVR stage shows
 * its file name and the hall over its own box even when its scenery never arrives (no stored file, a failed chunk,
 * both a restore that does nothing here), and a stage without MVR data shows the demo title with the hall off.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { followStage } from '../../../../src/app/mvr/followStage';
import { boundsOf } from '../../../../src/domain/stage/bounds';
import type { StageDesign } from '../../../../src/domain/stage/StageDesign';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { DEMO_TITLE } from '../../../../src/ui/panels/top/topBarMarkup';
import { importedDesign, jsonRoundTrip, stageWorld } from '../../../shared';

const mvrStage = (name: string, fileHash: string): StageDesign => ({
  ...importedDesign(),
  source: { kind: 'mvr', name, fileHash },
});
const A = mvrStage('Hall A.mvr', 'ha');
const B = mvrStage('Hall B.MVR', 'hb');

/** A stage world on `initial` with a follower over a fake hall; the scenery and prompt fakes do nothing. */
function followed(initial?: StageDesign) {
  const world = stageWorld(initial);
  const hall = { show: vi.fn(), hide: vi.fn() };
  const scenery = { dispose: vi.fn(), setHiddenLayers: vi.fn(), refit: vi.fn() };
  const deps = { bodies: { clear: vi.fn() }, prompt: { hide: vi.fn() }, restore: vi.fn(), scenery, hall };
  const boot = followStage({ ...deps, bus: world.bus, stage: world.service });
  return { ...world, hall, boot };
}
const title = (): string | null => document.getElementById('showName')?.textContent ?? null;

beforeEach(() => {
  document.body.innerHTML = `<div id="showName">${DEMO_TITLE}</div>`;
});

describe('followStage title and hall', () => {
  it('shows the file name and the hall at boot although the stored file is missing (restore draws nothing)', () => {
    const world = followed(A);
    world.boot();
    expect(title()).toBe('Hall A');
    expect(world.hall.show).toHaveBeenCalledWith(boundsOf(A));
  });

  it('shows them for a show load of another file whose scenery load fails, and drops the .mvr in any case', () => {
    const world = followed(A);
    world.serializer.load({ stage: jsonRoundTrip(B) });
    expect(title()).toBe('Hall B');
    expect(world.hall.show).toHaveBeenLastCalledWith(boundsOf(world.service.design));
    expect(world.hall.hide).not.toHaveBeenCalled();
  });

  it('shows them for the MVR import apply too', () => {
    const world = followed();
    world.service.apply(A, 'import');
    expect(title()).toBe('Hall A');
    expect(world.hall.show).toHaveBeenCalledTimes(1);
  });

  it('gives a built-in template and Load demo rig the demo title and turns the hall off', () => {
    const world = followed(A);
    world.boot();
    world.service.apply(createTemplate('theatre'), 'builder');
    expect(title()).toBe(DEMO_TITLE);
    expect(world.hall.hide).toHaveBeenCalledTimes(1);
    world.service.apply(A, 'import');
    world.serializer.load({});
    expect(world.service.isBuiltIn).toBe(true);
    expect(title()).toBe(DEMO_TITLE);
    expect(world.hall.hide).toHaveBeenCalledTimes(2);
  });

  it('sets a long or right-to-left name as text, with the full name as tooltip', () => {
    const world = followed(mvrStage('<b>הופעה</b>.mvr', 'hc'));
    world.boot();
    const element = document.getElementById('showName');
    expect(element?.textContent).toBe('<b>הופעה</b>');
    expect(element?.title).toBe('<b>הופעה</b>');
    expect(element?.dir).toBe('auto');
  });
});
