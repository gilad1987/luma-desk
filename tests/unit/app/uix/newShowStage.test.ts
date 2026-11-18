import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wireEngine } from '../../../../src/app/boot/wireEngine';
import { createShowFiles } from '../../../../src/app/uix/createShowFiles';
import { wireShowFileDialog } from '../../../../src/app/uix/wireShowFileDialog';
import { createTemplate } from '../../../../src/domain/stage/templates';
import { defaultPoolOf } from '../../../../src/engine/stage/defaultPool';
import { FakeButton, FakeDom, FakeElement } from '../../../shared/dom';

// New Show starts the delayed browser save; fake timers keep that save out of the test run
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** The real dialog over a real engine and serializer; `click` presses a dialog button after the dialog opens. */
function openDialog() {
  const dom = new FakeDom();
  for (const kind of ['HTMLTextAreaElement', 'HTMLInputElement']) vi.stubGlobal(kind, FakeElement);
  for (const id of ['fileBtn', 'fSave', 'fCopy', 'fDemo', 'fNew', 'fImp']) dom.add(id, new FakeButton());
  for (const id of ['fTxt', 'fFile']) dom.add(id);
  const engine = wireEngine();
  const { serializer, showStorage, demo } = createShowFiles({ ...engine, execs: engine.pool.execs });
  const modal = { open: vi.fn(), close: vi.fn() };
  wireShowFileDialog({
    bus: engine.bus,
    stage: engine.stage,
    modal,
    serializer,
    showStorage,
    demo,
    showLoaded: vi.fn(),
    cancelBuilder: vi.fn(),
  });
  const click = (id: string): void => dom.get(id).onclick?.({ target: null });
  return { engine, open: () => click('fileBtn'), click };
}

/** Every group fixture id the rig on screen does not have. */
function strangers(engine: ReturnType<typeof wireEngine>): number[] {
  const ids = Object.values(engine.groupLibrary.all).flatMap((group) => group.ids);
  return ids.filter((id) => !engine.stage.rig.get(id));
}

describe('New Show on the stage on screen', () => {
  it('keeps a custom stage and builds the default pool from its rig', () => {
    const { engine, open, click } = openDialog();
    engine.stage.apply(createTemplate('theatre'), 'builder');
    const design = engine.stage.design;
    open();
    click('fNew');
    expect([engine.stage.design, engine.stage.cause]).toEqual([design, 'builder']);
    expect(engine.groupLibrary.all).toEqual(defaultPoolOf(engine.stage));
    expect(strangers(engine)).toEqual([]);
  });

  it('keeps the built-in stage and its default pool', () => {
    const { engine, open, click } = openDialog();
    open();
    click('fNew');
    expect([engine.stage.isBuiltIn, engine.stage.cause]).toEqual([true, 'boot']);
    expect(engine.groupLibrary.all).toEqual(defaultPoolOf(engine.stage));
  });
});
