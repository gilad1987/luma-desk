import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireEngine } from '../../../../src/app/boot/wireEngine';

afterEach(() => vi.restoreAllMocks());

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
});
