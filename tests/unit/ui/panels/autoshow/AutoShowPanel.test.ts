import { afterEach, describe, expect, it, vi } from 'vitest';
import { STYLES } from '../../../../../src/autoshow/styles';
import { AutoShowPanel } from '../../../../../src/ui/panels/autoshow/AutoShowPanel';
import { autoShowMarkup } from '../../../../../src/ui/panels/autoshow/autoShowMarkup';
import { IDLE_STATUS } from '../../../../../src/ui/panels/autoshow/autoShowText';
import { FakeElement } from '../../fakes/FakeElement';
import { FakeDom } from '../../fakes/installFakeDom';
import { FakeButton } from '../fakes/FakeButton';
import { FakeHost } from '../fakes/FakeHost';
import { autoShowDeps } from './autoShowFakes';

const IDS = ['styleGrid', 'autoBpm', 'autoSec', 'autoStatus', 'songStat', 'aEnergyV', 'aMasterV', 'aBars', 'aPulse'];
const INPUTS = ['aEnergy', 'aMaster', 'aStrobe', 'aHits', 'aScreen', 'aTake', 'songFile'];
type Input = FakeElement & { checked?: boolean; oninput?: () => void; onchange?: () => void; disabled?: boolean };

function mount() {
  const dom = new FakeDom();
  for (const kind of ['HTMLSelectElement', 'HTMLButtonElement']) vi.stubGlobal(kind, FakeElement);
  for (const id of [...IDS, ...INPUTS]) dom.add(id);
  for (const id of ['autoGo', 'songPlay', 'aNext', 'aSave', 'aList']) dom.add(id, new FakeButton());
  const dots = [0, 1, 2, 3].map(() => new FakeElement('i')),
    beatDots = dom.add('beatDots', new FakeHost());
  beatDots.found.set('i', dots);
  const host = new FakeHost(),
    fakes = autoShowDeps(),
    panel = new AutoShowPanel(host as unknown as HTMLElement, fakes.deps);
  const input = (id: string): Input => dom.get(id);
  return { dom, host, dots, panel, input, ...fakes };
}

describe('AutoShowPanel', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('appends the pane and builds one card per style, the current one on', () => {
    const { dom, host, panel } = mount();
    expect(host.html).toBe(autoShowMarkup);
    panel.renderStyles();
    const cards = dom.get('styleGrid').children;
    expect(cards.map((c) => c.className)).toEqual(Object.keys(STYLES).map((k, i) => (i ? 'style' : 'style on')));
    expect(dom.get('autoGo').textContent).toBe('▶ START AUTO');
  });

  it('selects a style on click and repaints', () => {
    const { dom, panel, auto } = mount();
    panel.renderStyles();
    const grid = dom.get('styleGrid'),
      count = grid.children.length;
    grid.children[1]?.onclick?.({ target: null });
    expect(auto.selectStyle).toHaveBeenCalledWith('techno');
    // the fake keeps cleared children, so the repainted grid is the second batch
    expect(grid.children.slice(count, count + 2).map((c) => c.className)).toEqual(['style', 'style on']);
  });

  it('lights the beat dot, shows BPM and the countdown on the fast tick', () => {
    const { dom, dots, panel, auto } = mount();
    panel.fast(3.5); // 120 BPM: beat 7, bar 1
    expect(dots.map((d) => d.classList.contains('on'))).toEqual([false, false, false, true]);
    expect(dom.get('autoBpm').textContent).toBe('120 BPM');
    expect([dom.get('autoSec').textContent, dom.get('autoStatus').innerHTML]).toEqual(['', IDLE_STATUS]);
    auto.on = true;
    panel.fast(3.5);
    expect(dom.get('autoSec').textContent).toBe('Verse · next look in 3 bars');
  });

  it('feeds sliders, selects and checkboxes into the settings', () => {
    const { input, auto } = mount();
    Object.assign(input('aEnergy'), { value: '40' }).oninput?.();
    Object.assign(input('aPulse'), { value: 'beat' }).onchange?.();
    Object.assign(input('aBars'), { value: '8' }).onchange?.();
    Object.assign(input('aHits'), { checked: false }).onchange?.();
    expect(auto.settings).toMatchObject({ energy: 0.4, pulse: 'beat', bars: 8, hits: false });
    expect(input('aEnergyV').textContent).toBe('40');
  });

  it('starts Auto when a song starts playing and resets the button at the end', () => {
    const { dom, panel, song, auto } = mount();
    song.toggle.mockReturnValue('playing');
    dom.get('songPlay').onclick?.({ target: null });
    expect([dom.get('songPlay').textContent, auto.start.mock.calls.length]).toEqual(['❚❚ Pause', 1]);
    panel.songEnded();
    expect(dom.get('songPlay').textContent).toBe('▶ Play');
  });

  it('switches the pulse to the music after a song loads, and reports a bad file', async () => {
    const { input, song, auto } = mount();
    song.load.mockResolvedValueOnce({ name: 's.mp3', bpm: 100, duration: 60 }).mockRejectedValueOnce(new Error());
    Object.assign(input('songFile'), { files: [{}] }).onchange?.();
    await vi.waitFor(() => expect(auto.settings.pulse).toBe('audio'));
    expect([input('aPulse').value, input('songPlay').disabled]).toEqual(['audio', false]);
    input('songFile').onchange?.();
    await vi.waitFor(() => expect(input('songStat').textContent).toBe('Could not read this audio file.'));
  });
});
