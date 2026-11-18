// @vitest-environment jsdom
/** The top bar's LED level: hidden without LED walls, shown at the level of the walls, and it reports each change. */
import { expect, it } from 'vitest';
import { showLedBar, syncLedBar } from '../../../../../src/ui/panels/top/ledBar.ts';
import { topBarMarkup } from '../../../../../src/ui/panels/top/topBarMarkup.ts';

it('is not in the top bar at first, shows beside Haze for a stage with LED walls, follows the summary and hides again', () => {
  document.body.innerHTML = topBarMarkup;
  showLedBar(undefined);
  expect(document.getElementById('ledGroup')).toBeNull();
  const levels: number[] = [];
  showLedBar({ level: 25, set: (percent) => levels.push(percent) });
  const group = document.getElementById('ledGroup');
  const select = document.querySelector<HTMLSelectElement>('#ledWalls');
  if (!group || !select) throw new Error('the top bar has an LED group');
  expect(group.previousElementSibling?.querySelector('#haze')).not.toBeNull();
  expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
    'off',
    '10 %',
    '25 %',
    '50 %',
    '100 %',
  ]);
  expect(select.title).toMatch(/B\.O\. is a lighting blackout/);
  expect([group.style.display, select.value]).toEqual(['', '25']);
  select.value = '100';
  select.dispatchEvent(new Event('change'));
  expect(levels).toEqual([100]);
  syncLedBar(10);
  expect(select.value).toBe('10');
  showLedBar(undefined);
  select.dispatchEvent(new Event('change'));
  expect([group.style.display, levels]).toEqual(['none', [100]]);
});
