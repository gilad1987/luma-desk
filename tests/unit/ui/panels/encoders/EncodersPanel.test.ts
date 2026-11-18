import { afterEach, describe, expect, it, vi } from 'vitest';
import { GOBO_NAMES, SCREEN_MODES } from '../../../../../src/domain/attributes';
import { Encoder } from '../../../../../src/ui/components/Encoder';
import { encoderList } from '../../../../../src/ui/panels/encoders/encoderList';
import { EncodersPanel } from '../../../../../src/ui/panels/encoders/EncodersPanel';
import { asReal, FakeDom, FakeHost } from '../../../../shared/dom';
import { encodersFakes, fixture } from './encodersFakes';

// legacy: fmtVal and updateEncUI in index.html at 48a3b63, lines 2026-2034
describe('EncodersPanel.fast', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const setup = (ids: number[]) => {
    const dom = new FakeDom();
    for (const id of ['encoders', 'encExtra', 'featTabs']) dom.add(id);
    const fakes = encodersFakes([fixture(1, { gobo: 2 }, 'screen'), fixture(2, { gobo: 2 })]);
    fakes.selection.ids = ids;
    const panel = new EncodersPanel(asReal<HTMLElement>(new FakeHost()), fakes.deps);
    panel.render();
    dom.created.find((b) => b.dataset['f'] === 'gobo')?.onclick?.({ target: null });
    const paint = vi.spyOn(Encoder.prototype, 'paint').mockImplementation(() => undefined);
    paint.mockClear(); // one spy for every Encoder: drop the calls of an earlier setup in the same test
    panel.fast();
    const byAttr = new Map(encoderList('gobo', 'desk').map((attr, k) => [attr, paint.mock.calls[k]]));
    return { byAttr };
  };

  it('names screen modes on the Gobo tab only when a screen is selected first', () => {
    expect(setup([1, 2]).byAttr.get('gobo')?.[3]).toBe(SCREEN_MODES[2]);
    expect(setup([2, 1]).byAttr.get('gobo')?.[3]).toBe(`2 ${GOBO_NAMES[2]}`);
  });

  it('disables an encoder the selection lacks, but never with an empty selection', () => {
    expect(setup([2]).byAttr.get('grot')?.[2]).toBe(true);
    expect(setup([]).byAttr.get('grot')?.[2]).toBe(false);
  });
});

describe('EncodersPanel.feature', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts on Dimmer and follows the feature tab clicks', () => {
    const dom = new FakeDom();
    for (const id of ['encoders', 'encExtra', 'featTabs']) dom.add(id);
    const panel = new EncodersPanel(asReal<HTMLElement>(new FakeHost()), encodersFakes([fixture(1, {})]).deps);
    expect(panel.feature).toBe('dim');
    dom.created.find((b) => b.dataset['f'] === 'beam')?.onclick?.({ target: null });
    expect(panel.feature).toBe('beam');
  });
});
