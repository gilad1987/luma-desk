import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import type { ViewportDeps } from '../../../../../src/ui/panels/viewport/ViewportDeps';
import { ViewportPicking } from '../../../../../src/ui/panels/viewport/ViewportPicking';
import { FakeElement } from '../../fakes/FakeElement';
import { FakeDom } from '../../fakes/installFakeDom';

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
const lamp = { id: 7, T: { name: 'Spot' }, pos: { x: 50, y: 50 } };

function mount(pick: typeof lamp | null = lamp) {
  const dom = new FakeDom(),
    win = new Target(),
    canvas = new Target('canvas');
  vi.stubGlobal('window', win);
  for (const id of ['viewer', 'selRect', 'tip']) dom.add(id);
  const bus = new EventBus<EngineEvents>(),
    logs: EngineMessage[] = [];
  bus.on('message', (m) => logs.push(m));
  const fakes = { selection: { set: vi.fn() }, controls: { enabled: true }, clock: { nowMs: () => 1000 } };
  const picker = { pickAt: () => pick, projectToScreen: (p: { x: number; y: number }) => ({ ...p, depth: 0 }) };
  const deps = { ...fakes, canvas, picker, bus, fixtures: [lamp] } as unknown as ViewportDeps;
  new ViewportPicking(deps);
  const at = (x: number, y: number, more: object = {}) => ({ clientX: x, clientY: y, target: canvas, ...more });
  return { dom, win, canvas, logs, at, ...fakes };
}

describe('ViewportPicking', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('Shift+click on a fixture toggles it and logs; a 5 px move is neither click nor box', () => {
    const { win, canvas, logs, at, selection } = mount();
    canvas.fire('pointerdown', at(10, 10, { shiftKey: true, button: 2 }));
    win.fire('pointerup', at(12, 12));
    expect(selection.set).toHaveBeenCalledWith([7], 'toggle');
    expect(logs).toEqual([{ kind: 'log', text: 'Fixture 7 (Spot)', level: 'ok' }]);
    canvas.fire('pointerdown', at(0, 0, { shiftKey: true, button: 0 }));
    win.fire('pointerup', at(3, 4));
    expect(selection.set).toHaveBeenCalledTimes(1);
  });

  it('Shift+drag draws the rectangle, holds the camera and adds the fixtures inside', () => {
    const { dom, win, canvas, logs, at, selection, controls } = mount();
    canvas.fire('pointerdown', at(80, 90, { shiftKey: true, button: 0 }));
    expect(controls.enabled).toBe(false);
    win.fire('pointermove', at(40, 30));
    const style = dom.get('selRect').style as unknown as Record<string, string>;
    expect([style.display, style.left, style.top, style.width, style.height]).toEqual([
      'block',
      '40px',
      '30px',
      '40px',
      '60px',
    ]);
    win.fire('pointerup', at(40, 30, { target: win }));
    expect(selection.set).toHaveBeenCalledWith([7], 'add');
    expect(logs).toEqual([{ kind: 'log', text: 'Box select +1', level: 'ok' }]);
    expect([style.display, controls.enabled]).toEqual(['none', true]);
  });

  it('a click released off the canvas selects nothing', () => {
    const { win, canvas, at, selection } = mount();
    canvas.fire('pointerdown', at(10, 10));
    win.fire('pointerup', at(10, 10, { target: win }));
    expect(selection.set).not.toHaveBeenCalled();
  });

  it('hover shows the tooltip beside the pointer, and hides it over empty space', () => {
    const hit = mount();
    hit.canvas.fire('pointermove', hit.at(20, 30));
    const tip = hit.dom.get('tip'),
      style = tip.style as unknown as Record<string, string>;
    expect([style.display, style.left, style.top, tip.textContent]).toEqual(['block', '32px', '42px', '7 · Spot']);
    expect((hit.canvas.style as unknown as Record<string, string>).cursor).toBe('pointer');
    vi.unstubAllGlobals();
    const miss = mount(null);
    miss.canvas.fire('pointermove', miss.at(20, 30));
    expect(miss.dom.get('tip').style.display).toBe('none');
  });
});
