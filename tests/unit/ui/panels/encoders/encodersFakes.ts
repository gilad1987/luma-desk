import { Vector3 } from 'three';
import { vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import type { AttrName } from '../../../../../src/domain/attributes';
import { Fixture } from '../../../../../src/domain/Fixture';
import type { FixtureTypeId } from '../../../../../src/domain/FixtureType';
import { AppState } from '../../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../../src/engine/events';
import type { PhaserInstance } from '../../../../../src/engine/shared';
import { AimHeight } from '../../../../../src/ui/components/AimHeight';
import type { EncodersDeps } from '../../../../../src/ui/panels/encoders/EncodersDeps';

/** A real fixture with the given base values that has exactly the attributes in `base`, or every one with `hasAll`. */
class TestFixture extends Fixture {
  readonly #hasAll: boolean;

  constructor(id: number, base: Partial<Record<AttrName, number>>, type: FixtureTypeId, hasAll: boolean) {
    super({ id, type, pos: new Vector3(), mount: 'hang', fixed: null });
    Object.assign(this.base, base);
    this.#hasAll = hasAll;
  }

  override has(attr: AttrName): boolean {
    return this.#hasAll || attr in this.base;
  }
}

/** A fixture with the given base values; it has exactly the attributes in `base`, or all of them with `hasAll`. */
export const fixture = (
  id: number,
  base: Partial<Record<AttrName, number>>,
  type: FixtureTypeId = 'spot',
  hasAll = false,
) => new TestFixture(id, base, type, hasAll);

/** Real bus and state; plain objects for the programmer, the selection and the rig of `fixtures`. */
export function encodersFakes(fixtures: readonly Fixture[]) {
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (m) => void (m.kind === 'toast' && toasts.push(m.text)));
  const selection = { ids: [] as number[], set: vi.fn((ids: number[]) => (selection.ids = [...ids])) };
  const phasers: PhaserInstance[] = [];
  const programmer = {
    vals: {} as Record<number, Partial<Record<AttrName, number>>>,
    fxList: [],
    colorTargets: vi.fn((): number[] => []),
    phasersOnSelection: () => phasers,
    set: vi.fn(),
    applyPhaser: vi.fn(),
    applyPreset: vi.fn(),
    removeFeature: vi.fn(),
    removePhasers: vi.fn(),
  };
  const rig = { get: (id: number) => fixtures.find((f) => f.id === id) };
  const deps: EncodersDeps = {
    bus,
    state: new AppState(bus),
    programmer,
    selection,
    rig,
    modal: { number: vi.fn() },
    layoutMode: () => 'desk',
    aimHeight: new AimHeight(),
    goboIcons: [],
  };
  return { deps, toasts, selection, programmer, phasers };
}
