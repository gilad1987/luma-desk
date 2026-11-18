/** Checks the guide wiring: the rig chapter lists the rig's default groups, the tour button and Escape (listener K3). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireGuide } from '../../../../src/app/io/wireGuide';
import { buildRig } from '../../../../src/domain/rig';
import { he } from '../../../../src/i18n/he';
import { FakeDom, FakeHost } from '../../../shared/dom';

const OVERLAY_IDS = ['guide', 'gClose', 'gPrev', 'gNext', 'gTitle', 'gBody', 'gTour'];
const TOUR_IDS = ['tNext', 'tPrev', 'tEnd', 'tourHole', 'tourTip', 'tTitle', 'tText', 'tCount'];

function setup() {
  const dom = new FakeDom();
  for (const id of [...OVERLAY_IDS, ...TOUR_IDS]) dom.add(id);
  dom.add('gNav', new FakeHost());
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', { setItem: (key: string, value: string) => stored.set(key, value) });
  vi.stubGlobal('addEventListener', vi.fn());
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  const handles = wireGuide({ rig: buildRig(), isMa: () => false });
  return { dom, stored, handles };
}

describe('wireGuide', () => {
  afterEach(() => vi.unstubAllGlobals());

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
    const { dom, stored, handles } = setup();
    handles.guide.open(0);
    handles.tour.start();
    const escape = { target: null, key: 'Escape' };
    dom.documentClicks[0]?.(escape);
    expect([handles.guide.isOpen(), handles.tour.isActive()]).toEqual([false, false]);
    expect(stored.get('lumadesk-guide-seen')).toBe('1');
  });
});
