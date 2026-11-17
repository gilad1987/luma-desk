import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../../src/core';
import type { EngineEvents, EngineMessage } from '../../../../../src/engine/events';
import { ShowFileDialog } from '../../../../../src/ui/panels/showfile/ShowFileDialog';
import type { ShowFileDeps } from '../../../../../src/ui/panels/showfile/ShowFileDeps';
import { showFileMarkup } from '../../../../../src/ui/panels/showfile/showFileMarkup';
import { FakeElement } from '../../fakes/FakeElement';
import { FakeDom } from '../../fakes/installFakeDom';
import { FakeButton } from '../fakes/FakeButton';
import { legacyMarkup } from '../fakes/legacyMarkup';

vi.mock('../../../../../src/engine/defaultGroups', () => ({ defaultGroups: () => ({ defaults: true }) }));

type Field = FakeElement & { files?: unknown[]; onchange?: () => void };

function openDialog() {
  const dom = new FakeDom();
  vi.stubGlobal('HTMLTextAreaElement', FakeElement);
  for (const id of ['fileBtn', 'fSave', 'fCopy', 'fDemo', 'fNew', 'fImp']) dom.add(id, new FakeButton());
  for (const id of ['fTxt', 'fFile']) dom.add(id);
  const bus = new EventBus<EngineEvents>(),
    toasts: string[] = [];
  bus.on('message', (m: EngineMessage) => toasts.push(m.text));
  const fakes = {
    modal: { open: vi.fn(), close: vi.fn() },
    serializer: { serialize: () => ({ v: 1, bpm: 120 }) },
    storage: { persist: vi.fn() },
    demo: { load: vi.fn() },
    loadShow: vi.fn(),
    download: vi.fn(),
    stamp: () => '20261117-2350',
  };
  const deps = { ...fakes, bus, rig: {} } as unknown as ShowFileDeps;
  new ShowFileDialog(deps);
  dom.get('fileBtn').onclick?.({ target: null });
  const click = (id: string): void => dom.get(id).onclick?.({ target: null });
  return { dom, toasts, click, field: (id: string): Field => dom.get(id), ...fakes };
}

describe('ShowFileDialog', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('opens the original markup from #fileBtn', () => {
    const { modal } = openDialog();
    expect(showFileMarkup).toBe(legacyMarkup('../showfile/showFile'));
    expect(modal.open).toHaveBeenCalledWith(showFileMarkup);
  });

  it('downloads the indented JSON under a stamped name with the Hebrew toast', () => {
    const { click, download, toasts } = openDialog();
    click('fSave');
    expect(download).toHaveBeenCalledWith('luma-show-20261117-2350.json', '{\n "v": 1,\n "bpm": 120\n}');
    expect(toasts).toEqual(['קובץ המופע ירד']);
  });

  it('falls back to the import box when the clipboard is refused', async () => {
    const { click, field, toasts } = openDialog();
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    click('fCopy');
    await vi.waitFor(() => expect(toasts).toEqual(['Copy blocked — JSON shown in the box, copy it manually']));
    expect([field('fTxt').value, field('fTxt').select.mock.calls.length]).toEqual(['{"v":1,"bpm":120}', 1]);
  });

  it('loads pasted JSON, saves and closes; bad JSON only toasts', () => {
    const { click, field, loadShow, storage, modal, toasts } = openDialog();
    field('fTxt').value = '{"bpm":90}';
    click('fImp');
    field('fTxt').value = '{bad';
    click('fImp');
    expect(loadShow).toHaveBeenCalledWith({ bpm: 90 });
    expect([storage.persist.mock.calls.length, modal.close.mock.calls.length]).toEqual([1, 1]);
    expect(toasts).toEqual(['Show loaded', 'Invalid JSON']);
  });

  it('reports an unreadable file as invalid and builds a new show from the default groups', async () => {
    const { click, field, loadShow, toasts } = openDialog();
    Object.assign(field('fFile'), { files: [{ text: () => Promise.resolve('nope') }] }).onchange?.();
    await vi.waitFor(() => expect(toasts).toEqual(['Invalid file']));
    click('fNew');
    expect(loadShow).toHaveBeenLastCalledWith({ groups: { defaults: true } });
    expect(toasts.at(-1)).toBe('New show');
  });
});
