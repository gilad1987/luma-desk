import { vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import type { AttrName } from '../../../../../src/domain/attributes';
import type { Fixture } from '../../../../../src/domain/Fixture';
import type { Rig } from '../../../../../src/domain/rig/Rig';
import { AppState } from '../../../../../src/engine/AppState';
import type { EngineEvents } from '../../../../../src/engine/events';
import type { Programmer } from '../../../../../src/engine/Programmer';
import type { Selection } from '../../../../../src/engine/Selection';
import { AimHeight } from '../../../../../src/ui/components/AimHeight';
import type { EncodersDeps } from '../../../../../src/ui/panels/encoders/EncodersDeps';
import type { Modal } from '../../../../../src/ui/shared';
import { asReal } from '../../fakes/asReal';

/** A fixture with the given base values; it has exactly the attributes in `base`. */
export const fixture = (id: number, base: Partial<Record<AttrName, number>>, type = 'spot'): Fixture =>
  asReal<Fixture>({ id, type, base, has: (a: AttrName) => a in base });

/** Real bus and state; plain objects for the programmer, the selection and the rig of `fixtures`. */
export function encodersFakes(fixtures: readonly Fixture[]) {
  const bus = new EventBus<EngineEvents>();
  const toasts: string[] = [];
  bus.on('message', (m) => void (m.kind === 'toast' && toasts.push(m.text)));
  const selection = { ids: [] as number[], set: vi.fn((ids: number[]) => (selection.ids = [...ids])) };
  const phasers: { spread: number }[] = [];
  const programmer = {
    vals: {} as Record<number, Partial<Record<AttrName, number>>>,
    fxList: [],
    colorTargets: vi.fn((): number[] => []),
    phasersOnSelection: () => phasers,
    set: vi.fn(),
  };
  const rig = { get: (id: number) => fixtures.find((f) => f.id === id) };
  const deps: EncodersDeps = {
    bus,
    state: new AppState(bus),
    programmer: asReal<Programmer>(programmer),
    selection: asReal<Selection>(selection),
    rig: asReal<Rig>(rig),
    modal: asReal<Modal>({ number: vi.fn() }),
    layoutMode: () => 'desk',
    aimHeight: new AimHeight(),
    goboIcons: [],
  };
  return { deps, toasts, selection, programmer, phasers };
}
