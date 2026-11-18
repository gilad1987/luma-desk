import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../src/core';
import type { EngineEvents } from '../../../src/engine/events';
import { Modal } from '../../../src/ui/shared';
import { FakeDom, type FakeElement } from '../../shared/dom';

const FIELD = 'width:100%;background:#000;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;font:14px ';
const ROW = (ok: string) =>
  `<div class="row"><button id="mOk" class="on">${ok}</button><button id="mCancel">Cancel</button></div>`;

describe('Modal', () => {
  let dom: FakeDom, backdrop: FakeElement, box: FakeElement, input: FakeElement, events: string[], modal: Modal;
  beforeEach(() => {
    dom = new FakeDom();
    [backdrop, box, input] = [dom.add('modal'), dom.add('mbox'), dom.add('mIn')];
    dom.add('mOk');
    dom.add('mCancel');
    const bus = new EventBus<EngineEvents>();
    events = [];
    bus.on('stateDirty', () => events.push(`dirty open=${modal.isOpen()}`));
    modal = new Modal(bus);
  });
  afterEach(() => vi.unstubAllGlobals());
  const click = (id: string) => dom.get(id).onclick?.({ target: undefined });

  it('opens with the box class, rtl on request, and closes from the backdrop or any #hClose', () => {
    modal.open('<p>x</p>', true);
    expect([box.className, box.innerHTML, modal.isOpen()]).toEqual(['mbox rtl', '<p>x</p>', true]);
    backdrop.onclick?.({ target: box });
    expect(modal.isOpen()).toBe(true);
    backdrop.onclick?.({ target: backdrop });
    expect(modal.isOpen()).toBe(false);
    modal.open('');
    expect(box.className).toBe('mbox');
    dom.documentClicks.forEach((listener) => listener({ target: dom.add('hClose') }));
    expect(modal.isOpen()).toBe(false);
  });

  it('rename: legacy markup, focus + select, trimmed answer, then close, then repaint', () => {
    const done = vi.fn();
    modal.rename('Cue 3', 'Big "one"', done);
    expect(box.innerHTML).toBe(
      `<h2>Label Cue 3</h2><input id="mIn" style="${FIELD}Inter" value="Big &quot;one&quot;">${ROW('OK')}`,
    );
    expect([input.focus.mock.calls.length, input.select.mock.calls.length]).toEqual([1, 1]);
    input.value = '  Intro ';
    input.onkeydown?.({ key: 'Enter' });
    expect(done).toHaveBeenCalledWith('Intro');
    expect(events).toEqual(['dirty open=false']);
  });

  it('rename keeps the old name for a blank answer; Cancel and Escape only close', () => {
    const done = vi.fn();
    modal.rename('Group 1', 'Front', done);
    input.onkeydown?.({ key: 'Escape' });
    click('mCancel');
    expect([modal.isOpen(), done.mock.calls.length, events.length]).toEqual([false, 0, 0]);
    input.value = '   ';
    click('mOk');
    expect(done).toHaveBeenCalledWith('Front');
  });

  it('number: legacy markup, no select; a non-number closes and repaints without answering', () => {
    const done = vi.fn();
    modal.number('Dim', done);
    expect(box.innerHTML).toBe(
      `<h2>Dim</h2><input id="mIn" type="number" step="any" style="${FIELD}'JetBrains Mono'">${ROW('Set')}`,
    );
    expect(input.select).not.toHaveBeenCalled();
    input.value = 'abc';
    click('mOk');
    expect([done.mock.calls.length, events]).toEqual([0, ['dirty open=false']]);
    modal.number('Dim', done);
    input.value = '2.5s';
    click('mOk');
    expect(done).toHaveBeenCalledWith(2.5);
  });
});
