import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireShowFileDialog } from '../../../../src/app/uix/wireShowFileDialog';
import { EventBus } from '../../../../src/core';
import { buildRig } from '../../../../src/domain/rig';
import { BUILT_IN_DESIGN } from '../../../../src/domain/stage/templates/sultansPool/builtInDesign';
import { defaultGroups } from '../../../../src/engine/defaultGroups';
import type { EngineEvents } from '../../../../src/engine/events';
import { FakeButton, FakeDom, FakeElement } from '../../../shared/dom';

const rig = buildRig();
const stage = { rig, design: BUILT_IN_DESIGN, isBuiltIn: true };

/** Opens the dialog with every collaborator writing its name into one call log, so the tests read the order. */
function open() {
  const dom = new FakeDom(),
    calls: string[] = [];
  for (const kind of ['HTMLTextAreaElement', 'HTMLInputElement']) vi.stubGlobal(kind, FakeElement);
  for (const id of ['fileBtn', 'fSave', 'fCopy', 'fDemo', 'fNew', 'fImp']) dom.add(id, new FakeButton());
  for (const id of ['fTxt', 'fFile']) dom.add(id);
  const record = (name: string) => vi.fn(() => void calls.push(name));
  const serializer = {
    serialize: vi.fn(),
    load: vi.fn(() => {
      calls.push('load');
      return { badStage: false };
    }),
  };
  wireShowFileDialog({
    bus: new EventBus<EngineEvents>(),
    stage,
    modal: { open: vi.fn(), close: record('close') },
    serializer,
    showStorage: { persist: record('persist') },
    demo: { load: record('demo') },
    showLoaded: record('repaint'),
    cancelBuilder: record('cancelBuilder'),
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
    expect(calls).toEqual(['cancelBuilder', 'demo', 'repaint', 'close']);
  });

  it('loads a new show with the default groups, repaints, saves, then closes', () => {
    const { calls, click, serializer } = open();
    click('fNew');
    expect(serializer.load).toHaveBeenCalledWith({ groups: defaultGroups(rig) });
    expect(calls).toEqual(['cancelBuilder', 'load', 'repaint', 'persist', 'close']);
  });

  it('runs the same load and repaint for pasted JSON', () => {
    const { dom, calls, click, serializer } = open();
    dom.get('fTxt').value = '{"v":1,"bpm":128}';
    click('fImp');
    expect(serializer.load).toHaveBeenCalledWith({ v: 1, bpm: 128 });
    expect(calls).toEqual(['cancelBuilder', 'load', 'repaint', 'persist', 'close']);
  });
});
