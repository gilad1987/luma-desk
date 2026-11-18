import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireEngine } from '../../../../src/app/boot/wireEngine';
import { createShowFiles } from '../../../../src/app/uix/createShowFiles';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { STORAGE_KEYS } from '../../../../src/show';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Puts a saved show on the theatre stage in the browser store and returns the show the restore parses. */
function storeTheatreShow(): unknown {
  const show = { v: 1, groups: {}, presets: {}, execs: [], bpm: 120, haze: 0, stage: createTemplate('theatre') };
  const text = JSON.stringify(show);
  vi.stubGlobal('localStorage', { getItem: (key: string) => (key === STORAGE_KEYS.show ? text : null) });
  return JSON.parse(text);
}

describe('wireEngine', () => {
  it('draws no random number, so the scene after it keeps its seeded uuids (decision 24)', () => {
    const random = vi.spyOn(Math, 'random');
    wireEngine();
    expect(random).not.toHaveBeenCalled();
  });

  it('shares one rig, selection and bus between the parts the command runner drives', () => {
    const engine = wireEngine();
    const seen: string[] = [];
    engine.bus.on('message', (m) => seen.push(m.text));
    engine.runner.run('201');
    expect(engine.selection.ids).toEqual([201]);
    engine.runner.run('Store Exec 20');
    expect(seen).toEqual(['1 fixtures selected', 'No such executor']);
  });

  it('boots on the saved stage, and the show restore keeps it with no second apply', () => {
    vi.useFakeTimers();
    const saved = storeTheatreShow();
    const engine = wireEngine();
    expect(engine.stage.design).toEqual(createTemplate('theatre'));
    createShowFiles({ ...engine, execs: engine.pool.execs }).serializer.load(saved);
    expect([engine.stage.cause, engine.stage.rig.fixtures.length]).toEqual(['boot', 30]);
  });

  it('boots on the built-in stage when the browser refuses to read storage', () => {
    const getItem = vi.fn(() => {
      throw new Error('storage blocked');
    });
    vi.stubGlobal('localStorage', { getItem });
    expect([wireEngine().stage.isBuiltIn, getItem.mock.calls.length]).toEqual([true, 1]);
  });
});
