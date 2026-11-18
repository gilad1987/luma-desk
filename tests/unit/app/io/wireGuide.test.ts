/** Checks the guide wiring: the rig chapter lists the rig's default groups, the tour button and Escape (listener K3). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireGuide } from '../../../../src/app/io/wireGuide';
import { buildRig } from '../../../../src/domain/rig';
import { he } from '../../../../src/i18n/he';
import { GuideFlag } from '../../../../src/show';
import type { KeyValueStore } from '../../../../src/show/KeyValueStore';
import { FakeDom, FakeHost } from '../../../shared/dom';

const OVERLAY_IDS = ['guide', 'gClose', 'gPrev', 'gNext', 'gTitle', 'gBody', 'gTour'];
const TOUR_IDS = ['tNext', 'tPrev', 'tEnd', 'tourHole', 'tourTip', 'tTitle', 'tText', 'tCount'];

function setup(store: KeyValueStore = new MapStore()) {
  const dom = new FakeDom();
  for (const id of [...OVERLAY_IDS, ...TOUR_IDS]) dom.add(id);
  dom.add('gNav', new FakeHost());
  vi.stubGlobal('addEventListener', vi.fn());
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  const handles = wireGuide({ rig: buildRig(), isMa: () => false, guideFlag: new GuideFlag(store) });
  return { dom, store, handles };
}

class MapStore implements KeyValueStore {
  readonly stored = new Map<string, string>();
  getItem = (key: string): string | null => this.stored.get(key) ?? null;
  setItem = (key: string, value: string): void => void this.stored.set(key, value);
}

const blockedStore: KeyValueStore = {
  getItem: () => {
    throw new Error('storage blocked');
  },
  setItem: () => {
    throw new Error('storage blocked');
  },
};

describe('wireGuide', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens the guide 600 ms after a first visit only; blocked storage counts as seen', () => {
    vi.useFakeTimers();
    const seenStore = new MapStore();
    seenStore.setItem('lumadesk-guide-seen', '1');
    // each setup replaces the global document, so every case runs to the end before the next starts
    const openStates = [new MapStore(), seenStore, blockedStore].map((store) => {
      const { guide } = setup(store).handles;
      guide.openOnFirstRun();
      vi.advanceTimersByTime(599);
      const isEarly = guide.isOpen();
      vi.advanceTimersByTime(1);
      return [isEarly, guide.isOpen()];
    });
    expect(openStates).toEqual([
      [false, true],
      [false, false],
      [false, false],
    ]);
  });

  it('closes without throwing when storage is blocked', () => {
    const { handles } = setup(blockedStore);
    handles.guide.open(0);
    handles.guide.close();
    expect(handles.guide.isOpen()).toBe(false);
  });

  it('opens nothing at boot and registers exactly one document key listener (K3)', () => {
    const { dom, handles } = setup();
    expect([handles.guide.isOpen(), handles.tour.isActive(), dom.documentClicks.length]).toEqual([false, false, 1]);
  });

  it('lists the default groups of the rig in the rig chapter', () => {
    const { dom, handles } = setup();
    const rigChapter = he.guide.chapters.findIndex((chapter) => chapter.title === 'הריג והקבוצות');
    handles.guide.open(rigChapter);
    expect(dom.get('gBody').innerHTML).toContain('<code>Group 1</code>');
  });

  it('closes the guide and starts the tour from the tour button', () => {
    const { dom, handles } = setup();
    handles.guide.open(0);
    dom.get('gTour').onclick?.({ target: null });
    expect([handles.guide.isOpen(), handles.tour.isActive()]).toEqual([false, true]);
  });

  it('ends the tour and closes the guide on Escape, marking the guide seen', () => {
    const { dom, store, handles } = setup();
    handles.guide.open(0);
    handles.tour.start();
    const escape = { target: null, key: 'Escape' };
    dom.documentClicks[0]?.(escape);
    expect([handles.guide.isOpen(), handles.tour.isActive()]).toEqual([false, false]);
    expect(store.getItem('lumadesk-guide-seen')).toBe('1');
  });
});
