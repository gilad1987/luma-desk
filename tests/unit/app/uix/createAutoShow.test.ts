import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAutoShow } from '../../../../src/app/uix/createAutoShow';
import { autoShowMarkup } from '../../../../src/ui/panels/autoshow/autoShowMarkup';
import { asReal, FakeButton, FakeDom, FakeElement, FakeHost } from '../../../shared/dom';
import { engineParts, stillClock } from './engineParts';

const IDS = ['styleGrid', 'autoBpm', 'autoSec', 'autoStatus', 'songStat', 'aEnergyV', 'aMasterV', 'aBars', 'aPulse'];
const INPUTS = ['aEnergy', 'aMaster', 'aStrobe', 'aHits', 'aScreen', 'aTake', 'songFile'];
const BUTTONS = ['autoGo', 'songPlay', 'aNext', 'aSave', 'aList'];

/** The auto-show on a real engine, and a fake page with the ids the pane looks up once it is mounted. */
function build() {
  const parts = engineParts(),
    handles = createAutoShow({ ...parts, clock: stillClock }),
    dom = new FakeDom();
  for (const kind of ['HTMLSelectElement', 'HTMLButtonElement', 'HTMLInputElement']) vi.stubGlobal(kind, FakeElement);
  for (const id of [...IDS, ...INPUTS]) dom.add(id);
  for (const id of BUTTONS) dom.add(id, new FakeButton());
  dom.add('beatDots', new FakeHost());
  const mount = (host: FakeHost) =>
    handles.mountPanel(asReal<HTMLElement>(host), {
      appState: parts.appState,
      showStorage: { persist: vi.fn() },
      sideTab: () => 'auto',
    });
  return { handles, dom, mount };
}

describe('createAutoShow', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts and stops before the pane is mounted without painting anything', () => {
    const { handles, dom } = build();
    handles.autoShow.start();
    handles.autoShow.stop();
    expect([dom.get('autoGo').textContent, dom.get('styleGrid').children.length]).toEqual(['', 0]);
  });

  it('mounts the pane and repaints it whenever Auto starts or stops', () => {
    const { handles, dom, mount } = build();
    const host = new FakeHost();
    mount(host);
    expect(host.html).toBe(autoShowMarkup);
    handles.autoShow.start();
    expect(dom.get('autoGo').textContent).toBe('■ STOP AUTO');
    expect(dom.get('styleGrid').children.length).toBeGreaterThan(0);
    handles.autoShow.stop();
    expect(dom.get('autoGo').textContent).toBe('▶ START AUTO');
  });
});
