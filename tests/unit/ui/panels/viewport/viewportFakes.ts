import { OrthographicCamera, Vector3 } from 'three';
import { vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import { Fixture } from '../../../../../src/domain/Fixture';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import type { ViewportDeps } from '../../../../../src/ui/panels/viewport/ViewportDeps';
import { ViewportPicking } from '../../../../../src/ui/panels/viewport/ViewportPicking';
import { asReal, FakeDom, FakeElement } from '../../../../shared/dom';

type Listener = (ev: object) => void;
/** An element or window that records listeners by event type, so the test can fire them. */
class Target extends FakeElement {
  readonly listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string, ev: object): void {
    for (const l of this.listeners.get(type) ?? []) l(ev);
  }
}
/** At the world origin, which the camera below puts in the middle of the 100 px canvas: client (50, 50). */
const lamp = new Fixture({ id: 7, type: 'spot', pos: new Vector3(), mount: 'hang', fixed: null });
/** Maps world x/y in -1..1 straight to NDC, so client = (ndc + 1) * 50 on the 100 px canvas rect. */
const camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);

/** Mounts picking on a 100 px canvas whose picker returns `pick`; returns the fakes and an event builder. */
export function mount(pick: typeof lamp | null = lamp) {
  const dom = new FakeDom(),
    win = new Target(),
    canvas = new Target('canvas');
  canvas.rect = { left: 0, top: 0, width: 100, height: 100 };
  vi.stubGlobal('window', win);
  for (const id of ['viewer', 'selRect', 'tip']) dom.add(id);
  const bus = new EventBus<EngineEvents>(),
    logs: EngineMessage[] = [];
  bus.on('message', (m) => logs.push(m));
  const fakes = {
    selection: { set: vi.fn() },
    controls: { enabled: true },
    clock: { nowMs: () => 1000, nowSeconds: () => 1 },
  };
  const picker = { pickAt: () => pick },
    flags = { building: false };
  const deps: ViewportDeps = {
    ...fakes,
    canvas: asReal<HTMLCanvasElement>(canvas),
    picker,
    camera,
    bus,
    fixtures: [lamp],
    isBuilding: () => flags.building,
  };
  new ViewportPicking(deps);
  const at = (x: number, y: number, more: object = {}) => ({ clientX: x, clientY: y, target: canvas, ...more });
  return { dom, win, canvas, logs, at, flags, ...fakes };
}
