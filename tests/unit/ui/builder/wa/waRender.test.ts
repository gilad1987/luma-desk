/**
 * Owns `afterWaRender`: the callback waits for a pending Lit render and runs at once without one. That a real
 * `wa-button` then takes the focus is owned by tests/e2e/builder-shell.focus.spec.ts. Plain objects stand in for hosts.
 */
import { describe, expect, it } from 'vitest';
import { afterWaRender } from '../../../../../src/ui/builder/wa/waRender';

describe('afterWaRender', () => {
  // Bug: the toolbar focused Redo before Lit rendered it enabled, so its disabled inner button dropped the focus
  it('runs the callback only after the pending render', async () => {
    let render = (): void => undefined;
    const host = { updateComplete: new Promise<void>((resolve) => (render = resolve)) };
    const runs: string[] = [];
    afterWaRender(host, () => runs.push('then'));
    runs.push('before render');
    render();
    await host.updateComplete;
    expect(runs).toEqual(['before render', 'then']);
  });

  // catches a host that is not a Lit element (jsdom, a tag not yet upgraded) never running the callback
  it('runs the callback at once when there is no render to wait for', () => {
    const runs: string[] = [];
    afterWaRender({}, () => runs.push('then'));
    expect(runs).toEqual(['then']);
  });
});
