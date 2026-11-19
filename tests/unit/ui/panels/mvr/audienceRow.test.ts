// @vitest-environment jsdom
/**
 * The "Audience" row of the import summary: on at 85 % at first, the line always says the figures are the desk's
 * and not the file's, every change is reported, and hidden proxies or hidden seat layers leave the count.
 */
import { expect, it } from 'vitest';
import {
  AUDIENCE_NOT_LOADED,
  audienceLine,
  audienceRow,
  type AudienceChoice,
  type AudienceControl,
} from '../../../../../src/ui/panels/mvr/audienceRow.ts';
import { proxiesRow } from '../../../../../src/ui/panels/mvr/proxiesRow.ts';

/** Two seat layers: `A` with 2,895 seats and `B` with 105. */
const seats = (hidden: readonly string[]): number =>
  (hidden.includes('A') ? 0 : 2895) + (hidden.includes('B') ? 0 : 105);
const control = (choices: AudienceChoice[], built = true): AudienceControl => ({
  seats,
  figures: (occupancy, hidden) => Math.round(seats(hidden) * occupancy),
  onChange: (choice) => choices.push(choice),
  choice: () => choices.at(-1),
  built: Promise.resolve(built),
});

it('words the line for many, one and no figures', () => {
  expect(audienceLine(2461, 2895)).toBe(
    '2,461 audience figures are added by the desk on 2,895 seats; they are not in the file.',
  );
  expect(audienceLine(1, 1)).toBe('1 audience figure is added by the desk on 1 seat; it is not in the file.');
  expect(audienceLine(0, 24)).toBe('No audience figures are shown on 24 seats; the file has no audience.');
});

it('starts on at 85 % under "Show proxies", reports each change and follows the proxies box', () => {
  const host = document.body.appendChild(document.createElement('div'));
  const proxies = proxiesRow(host, () => undefined);
  host.appendChild(document.createElement('label')).textContent = 'Layer A';
  const choices: AudienceChoice[] = [];
  let hidden: string[] = ['B'];
  const note = audienceRow(host, control(choices), () => hidden);
  const box = host.querySelector<HTMLInputElement>('#mvrAudience');
  const share = host.querySelector<HTMLSelectElement>('#mvrAudienceShare');
  expect([box?.checked, share?.value, note.textContent]).toEqual([true, '85', audienceLine(2461, 2895)]);
  expect(Array.from(host.children, (child) => child.textContent)).toEqual([
    'Show proxies',
    'Audience0 %50 %85 %100 %',
    audienceLine(2461, 2895),
    'Layer A',
  ]);
  if (!box || !share) return;
  share.value = '100';
  share.dispatchEvent(new Event('change', { bubbles: true }));
  expect(note.textContent).toBe(audienceLine(2895, 2895));
  box.click();
  expect(note.textContent).toBe(audienceLine(0, 2895));
  expect(choices).toEqual([
    { shown: true, occupancy: 1 },
    { shown: false, occupancy: 1 },
  ]);
  box.click();
  hidden = [];
  proxies.click();
  expect([box.disabled, share.disabled, note.textContent]).toEqual([true, true, audienceLine(0, 3000)]);
  proxies.click();
  expect([box.disabled, note.textContent, choices.length]).toEqual([false, audienceLine(3000, 3000), 3]);
});

it('starts a row made again from the last choice, and an occupancy change keeps the audience off', () => {
  const choices: AudienceChoice[] = [];
  const first = document.body.appendChild(document.createElement('div'));
  audienceRow(first, control(choices), () => []);
  first.querySelector<HTMLSelectElement>('#mvrAudienceShare')?.dispatchEvent(new Event('change', { bubbles: true }));
  first.querySelector<HTMLInputElement>('#mvrAudience')?.click();
  const again = document.body.appendChild(document.createElement('div'));
  const note = audienceRow(again, control(choices), () => []);
  const box = again.querySelector<HTMLInputElement>('#mvrAudience');
  const share = again.querySelector<HTMLSelectElement>('#mvrAudienceShare');
  expect([box?.checked, share?.value, note.textContent]).toEqual([false, '85', audienceLine(0, 3000)]);
  if (!share) return;
  share.value = '50';
  share.dispatchEvent(new Event('change', { bubbles: true }));
  expect(choices.at(-1)).toEqual({ shown: false, occupancy: 0.5 });
  expect(note.textContent).toBe(audienceLine(0, 3000));
  const third = document.body.appendChild(document.createElement('div'));
  audienceRow(third, control(choices), () => []);
  expect(third.querySelector<HTMLSelectElement>('#mvrAudienceShare')?.value).toBe('50');
});

it('says so when the audience was not built', async () => {
  const host = document.body.appendChild(document.createElement('div'));
  const note = audienceRow(host, control([], false), () => []);
  await Promise.resolve();
  await Promise.resolve();
  expect([note.textContent, host.querySelector<HTMLInputElement>('#mvrAudience')?.disabled]).toEqual([
    AUDIENCE_NOT_LOADED,
    true,
  ]);
});
