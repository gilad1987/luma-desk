import { describe, expect, it } from 'vitest';
import { groupRowsMarkup, rigRowsMarkup } from '../../../../src/ui/guide/rigTable';

describe('rig table rows', () => {
  it('builds the legacy row markup in table order', () => {
    const rows = rigRowsMarkup();
    expect(rows.startsWith('<tr><td><code>101–120</code></td><td>Spot</td><td>טראס קדמי (FOH)</td></tr>')).toBe(true);
    expect(rows.endsWith('<tr><td><code>2001</code></td><td>LED Screen</td><td>מסך LED (ומסכי הצד)</td></tr>')).toBe(
      true,
    );
    expect(rows.match(/<tr>/g)).toHaveLength(23);
  });

  it('lists groups with their fixture count', () => {
    expect(groupRowsMarkup({ 7: { name: 'Front', ids: [1, 2] } })).toBe(
      '<tr><td><code>Group 7</code></td><td>Front</td><td style="color:var(--mut)">2 גופים</td></tr>',
    );
  });
});
