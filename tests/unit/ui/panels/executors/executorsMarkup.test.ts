import { describe, expect, it } from 'vitest';
import { cueHudMarkup } from '../../../../../src/ui/panels/executors/cueHudMarkup';
import { executorCardMarkup } from '../../../../../src/ui/panels/executors/executorCardMarkup';
import { masterMarkup } from '../../../../../src/ui/panels/executors/masterMarkup';
import { legacyMarkup } from '../../../../shared/legacy';

// oracles from index.html at 48a3b63: line 570 (HUD), lines 657-666 (strip + master), the buildExecs template (2151)

describe('executors markup equals the original page byte for byte', () => {
  it('cue HUD', () => {
    expect(cueHudMarkup).toBe(legacyMarkup('cueHud'));
  });

  it('executor strip and master section', () => {
    expect(masterMarkup).toBe(legacyMarkup('master'));
  });

  it('executor card template', () => {
    expect(executorCardMarkup(7)).toBe(legacyMarkup('card').replace('${i + 1}', '7'));
  });
});
