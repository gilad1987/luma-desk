import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireShowFileDialog } from '../../../../src/app/uix/wireShowFileDialog';
import { FakeButton, FakeDom, FakeElement } from '../../../shared/dom';
import { BAD_STAGE, BUILT_IN, stageWorld } from '../../show/stageWorld';

/** A show whose `stage` key does not parse; the rest of it is a good v1 show. */
const BAD_STAGE_SHOW = { v: 1, groups: {}, presets: {}, execs: [], bpm: 97, haze: 0, stage: { v: 1, trusses: 'x' } };

/** Opens the Show File dialog on a real serializer and stage service, and pastes `show` into the import box. */
function importPasted(show: unknown) {
  const dom = new FakeDom();
  for (const kind of ['HTMLTextAreaElement', 'HTMLInputElement']) vi.stubGlobal(kind, FakeElement);
  for (const id of ['fileBtn', 'fSave', 'fCopy', 'fDemo', 'fNew', 'fImp']) dom.add(id, new FakeButton());
  for (const id of ['fTxt', 'fFile']) dom.add(id);
  const world = stageWorld();
  wireShowFileDialog({
    bus: world.bus,
    stage: world.service,
    modal: { open: vi.fn(), close: vi.fn() },
    serializer: world.serializer,
    showStorage: { persist: vi.fn() },
    demo: world.demo,
    showLoaded: vi.fn(),
    cancelBuilder: vi.fn(),
  });
  dom.get('fileBtn').onclick?.({ target: null });
  dom.get('fTxt').value = JSON.stringify(show);
  dom.get('fImp').onclick?.({ target: null });
  return { ...world, toasts: world.messages.map((m) => m.text) };
}

describe('importing a show file and its stage', () => {
  afterEach(() => vi.unstubAllGlobals());

  // the toast shows only the latest text, so a "Show loaded" after the bad-stage text would hide it
  it('leaves the bad-stage text as the one toast and still loads the show on the built-in stage', () => {
    const { toasts, tempo, service } = importPasted(BAD_STAGE_SHOW);
    expect(toasts).toEqual([BAD_STAGE]);
    expect([tempo.bpm, service.design]).toEqual([97, BUILT_IN]);
  });

  it('still toasts exactly "Show loaded" for a good show', () => {
    const { toasts, tempo } = importPasted({ ...BAD_STAGE_SHOW, stage: undefined });
    expect(toasts).toEqual(['Show loaded']);
    expect(tempo.bpm).toBe(97);
  });
});
