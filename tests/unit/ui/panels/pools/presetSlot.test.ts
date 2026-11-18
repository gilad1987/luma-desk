/**
 * Owns the G10 hiding in the pool view: a computed preset whose stage part is missing shows as an empty slot with
 * no click and a Hebrew title, and an available one keeps the old slot. Which presets miss which part is owned by
 * the PresetLibrary tests; the screenshot of the pools on the built-in stage is the parity suite's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PresetType } from '../../../../../src/engine/presetTypes';
import type { PresetTarget } from '../../../../../src/engine/stage/presetTargets';
import { he } from '../../../../../src/i18n/he';
import type { PoolsDeps } from '../../../../../src/ui/panels/pools/PoolsDeps';
import { presetSlot } from '../../../../../src/ui/panels/pools/presetSlot';
import { asReal, FakeDom } from '../../../../shared/dom';

/** Position pool slot 2.1 holds a named preset; `missing` is what `missingTarget` reports for it. */
function render(missing: PresetTarget | null): {
  className: string;
  innerHTML: string;
  title: unknown;
  clicks: boolean;
} {
  const all: Partial<Record<PresetType, unknown[]>> = { 2: [undefined, { name: 'Ring cone' }] };
  const deps = asReal<PoolsDeps>({ presets: { all, missingTarget: () => missing } });
  const slot = presetSlot(2, 1, deps, vi.fn());
  return {
    className: slot.className,
    innerHTML: slot.innerHTML,
    title: 'title' in slot ? slot.title : undefined,
    clicks: slot.onclick !== null || slot.ondblclick !== null,
  };
}

describe('presetSlot', () => {
  beforeEach(() => new FakeDom());
  afterEach(() => vi.unstubAllGlobals());

  it('shows a preset aimed at a missing ring as an empty slot without a click, titled in Hebrew', () => {
    expect(render('ring')).toEqual({
      className: 'slot empty is-unavailable',
      innerHTML: '<span class="n">2.1</span><span class="t">—</span>',
      title: he.builder.presetMissing.ring,
      clicks: false,
    });
  });

  it('keeps the named slot with its click when the stage has the part', () => {
    expect(render(null)).toEqual({
      className: 'slot',
      innerHTML: '<span class="n">2.1</span><span class="t">Ring cone</span>',
      title: undefined,
      clicks: true,
    });
  });
});
