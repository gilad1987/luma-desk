import { describe, expect, it, vi } from 'vitest';
import { wireShowChoice } from '../../../../../src/ui/panels/mvr/wireShowChoice';
import { FakeButton, FakeDom } from '../../../../shared/dom';

/** A DOM with the summary's close button and the two choice buttons, wired to a `buildShow` spy. */
function wire() {
  const dom = new FakeDom();
  for (const id of ['mvrSummaryClose', 'mvrBuildShow', 'mvrKeepCues']) dom.add(id, new FakeButton());
  dom.add('mvrShowChoice');
  const buildShow = vi.fn();
  wireShowChoice(buildShow);
  return { dom, buildShow };
}

describe('wireShowChoice', () => {
  it('focuses Build; Build builds and gives the focus to the close button', () => {
    const { dom, buildShow } = wire();
    expect(dom.get('mvrBuildShow').focus).toHaveBeenCalledOnce();
    dom.get('mvrBuildShow').onclick?.({ target: null });
    expect(buildShow).toHaveBeenCalledOnce();
    expect(dom.get('mvrSummaryClose').focus).toHaveBeenCalledOnce();
  });

  it('Keep ends the choice without a build', () => {
    const { dom, buildShow } = wire();
    dom.get('mvrKeepCues').onclick?.({ target: null });
    expect(buildShow).not.toHaveBeenCalled();
    expect(dom.get('mvrSummaryClose').focus).toHaveBeenCalledOnce();
  });
});
