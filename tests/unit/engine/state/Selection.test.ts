import { describe, expect, it } from 'vitest';
import { EventBus, rng } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import type { EngineEvents } from '../../../../src/engine/events';
import { Selection, type SelectMode } from '../../../../src/engine/Selection';
import { reverseOracle, setSelOracle, type SelState } from './oracle/selectionOracle';
import { recordEvents } from './recordEvents';

const rig = buildRig();
const FX: Record<number, unknown> = Object.fromEntries(rig.fixtures.map((f) => [f.id, f]));
const MODES: readonly SelectMode[] = ['replace', 'add', 'sub', 'toggle'];
// ids the rig does not have: below, between and above the patched ranges
const UNKNOWN = [0, -1, 100, 121, 1819, 2002, 99999, 1.5];

const setup = () => {
  const bus = new EventBus<EngineEvents>();
  return { selection: new Selection(rig, bus), events: recordEvents(bus) };
};

/** A random id list: rig ids (often repeated, to exercise de-duplication and toggling twice) plus unknown ids. */
function randomIds(random: () => number): number[] {
  const pool = rig.fixtures.slice(0, 40).map((f) => f.id);
  return Array.from({ length: Math.floor(random() * 12) }, () =>
    random() < 0.15
      ? (UNKNOWN[Math.floor(random() * UNKNOWN.length)] ?? 0)
      : (pool[Math.floor(random() * pool.length)] ?? 0),
  );
}

describe('Selection', () => {
  it('matches the original setSel and reverse over 300 random operation sequences', () => {
    const random = rng(42);
    for (let run = 0; run < 300; run++) {
      const { selection } = setup();
      const oracle: SelState = { sel: [] };
      for (let step = 0; step < 25; step++) {
        if (random() < 0.1) {
          selection.reverse();
          reverseOracle(oracle, FX);
        } else {
          const ids = randomIds(random);
          const mode = MODES[Math.floor(random() * MODES.length)] ?? 'replace';
          selection.set(ids, mode);
          setSelOracle(oracle, FX, ids, mode);
        }
        expect(selection.ids).toEqual(oracle.sel);
        for (const f of rig.fixtures.slice(0, 40)) expect(selection.has(f.id)).toBe(oracle.sel.includes(f.id));
      }
    }
  });

  it('defaults to replace, keeps first occurrences and drops unknown ids', () => {
    const { selection } = setup();
    selection.set([103, 101, 103, 99999, 102, 101]);
    expect(selection.ids).toEqual([103, 101, 102]);
    expect(selection.has(99999)).toBe(false);
  });

  it('selects the fixtures of a saved group whose ids are strings, as the original FX[id] lookup did', () => {
    const { selection } = setup();
    // as JSON.parse gives them from a hand-edited show file: saved shows are not validated on load
    const saved = JSON.parse('{"name":"Front","ids":["103","101","abc"]}') as { ids: number[] };
    selection.set(saved.ids);
    expect(selection.ids).toEqual([103, 101]);
    selection.set(saved.ids, 'sub');
    expect(selection.ids).toEqual([]);
  });

  it('toggle flips each id in turn, so a repeated id flips back', () => {
    const { selection } = setup();
    selection.set([101, 102]);
    selection.set([102, 103, 103, 104], 'toggle');
    expect(selection.ids).toEqual([101, 104]);
  });

  it('announces every change, including one that changes nothing', () => {
    const { selection, events } = setup();
    selection.set([101]);
    selection.set([], 'add');
    selection.reverse();
    expect(events).toEqual(['selectionChanged', 'selectionChanged', 'selectionChanged']);
  });

  it('ignores an unknown mode string from untyped callers, as the original did', () => {
    const { selection } = setup();
    selection.set([101, 102]);
    selection.set([103], 'bogus' as SelectMode);
    expect(selection.ids).toEqual([101, 102]);
  });
});
