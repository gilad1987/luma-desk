import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireShowFileDialog } from '../../../../src/app/uix/wireShowFileDialog';
import { EventBus } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import { defaultGroups } from '../../../../src/engine/defaultGroups';
import type { EngineEvents } from '../../../../src/engine/events';
import { FakeButton, FakeDom, FakeElement } from '../../../shared/dom';

const rig = buildRig();

/** Opens the dialog with every collaborator writing its name into one call log, so the tests read the order. */
function open() {
  const dom = new FakeDom(),
    calls: string[] = [];
  for (const kind of ['HTMLTextAreaElement', 'HTMLInputElement']) vi.stubGlobal(kind, FakeElement);
  for (const id of ['fileBtn', 'fSave', 'fCopy', 'fDemo', 'fNew', 'fImp', 'fDemoRig', 'fMvrExport']) {
    dom.add(id, new FakeButton());
  }
  for (const id of ['fTxt', 'fFile', 'fMvrFile']) dom.add(id);
  const record = (name: string) => vi.fn(() => void calls.push(name));
  const serializer = { serialize: vi.fn(), load: record('load') };
  wireShowFileDialog({
    bus: new EventBus<EngineEvents>(),
    rig,
    modal: { open: vi.fn(), close: record('close') },
    serializer,
    showStorage: { persist: record('persist') },
    demo: { load: record('demo') },
    showLoaded: record('repaint'),
    mvr: { importFile: vi.fn(), loadDemoRig: record('demoRig'), exportMvr: vi.fn() },
  });
  dom.get('fileBtn').onclick?.({ target: null });
  const click = (id: string): void => dom.get(id).onclick?.({ target: null });
  return { dom, calls, click, serializer };
}

describe('wireShowFileDialog', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('repaints after the demo loads, before the dialog closes', () => {
    const { calls, click } = open();
    click('fDemo');
    expect(calls).toEqual(['demo', 'repaint', 'close']);
  });

  it('hands Load demo rig to the MVR actions, without the show repaint', () => {
    const { calls, click } = open();
    click('fDemoRig');
    expect(calls).toEqual(['demoRig']);
  });

  it('loads a new show with the default groups, repaints, saves, then closes', () => {
    const { calls, click, serializer } = open();
    click('fNew');
    expect(serializer.load).toHaveBeenCalledWith({ groups: defaultGroups(rig) });
    expect(calls).toEqual(['load', 'repaint', 'persist', 'close']);
  });

  it('runs the same load and repaint for pasted JSON', () => {
    const { dom, calls, click, serializer } = open();
    dom.get('fTxt').value = '{"v":1,"bpm":128}';
    click('fImp');
    expect(serializer.load).toHaveBeenCalledWith({ v: 1, bpm: 128 });
    expect(calls).toEqual(['load', 'repaint', 'persist', 'close']);
  });
});
