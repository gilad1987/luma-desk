// @vitest-environment jsdom
/** The "Show proxies" box of the import summary: on at first, and every change reports the new state. */
import { expect, it } from 'vitest';
import { proxiesRow } from '../../../../../src/ui/panels/mvr/proxiesRow.ts';

it('starts checked and reports each change', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const states: boolean[] = [];
  const box = proxiesRow(host, (shown) => states.push(shown));
  expect([box.checked, host.textContent]).toEqual([true, 'Show proxies']);
  box.click();
  box.click();
  expect(states).toEqual([false, true]);
});
