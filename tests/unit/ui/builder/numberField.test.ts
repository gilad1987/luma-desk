/**
 * Owns the numeric field: a valid value reaches `send`, invalid input never does and shows the range, a refused value
 * shows its text. What `send` does with the value is owned by the tab tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { he } from '../../../../src/i18n/he';
import { numberField } from '../../../../src/ui/builder/numberField.ts';
import { asReal, FakeDom, type FakeElement } from '../../../shared/dom';
import { change, control, prop, shownErrors } from './toolsDom.ts';

describe('numberField', () => {
  let field: FakeElement, send: ReturnType<typeof vi.fn<(value: number) => string | null>>;
  beforeEach(() => {
    new FakeDom();
    send = vi.fn<(value: number) => string | null>(() => null);
    const options = { label: 'Width (m)', title: 'help', value: 10.00000001, step: 0.5, min: 0.1, max: 100, send };
    field = asReal<FakeElement>(numberField(options));
  });
  afterEach(() => vi.unstubAllGlobals());
  const input = (): FakeElement => control(field, 'Width (m)');

  it('shows the value rounded for display, with step, bounds and the Hebrew title', () => {
    const el = input();
    expect([el.value, prop(el, 'step'), prop(el, 'min'), prop(el, 'max'), prop(el, 'title')]).toEqual([
      '10',
      '0.5',
      '0.1',
      '100',
      'help',
    ]);
  });

  it('sends a valid value and shows no error', () => {
    change(input(), '12.5');
    expect([send.mock.calls, shownErrors(field)]).toEqual([[[12.5]], []]);
  });

  it.each(['', '  ', 'abc', '0', '100.5', 'Infinity'])('does not send %j and shows the allowed range', (raw) => {
    change(input(), raw);
    const marks = [input().classList.contains('is-invalid'), prop(input(), 'ariaInvalid')];
    expect([send.mock.calls, shownErrors(field), marks]).toEqual([
      [],
      [he.builder.tools.badNumber(0.1, 100)],
      [true, 'true'],
    ]);
  });

  it('accepts both bounds', () => {
    change(input(), '0.1');
    change(input(), '100');
    expect(send.mock.calls).toEqual([[0.1], [100]]);
  });

  it('shows the text of a refused value next to the field, and clears it on the next accepted one', () => {
    send.mockReturnValueOnce('setDeckSize: too big');
    change(input(), '50');
    const refused = shownErrors(field);
    change(input(), '40');
    expect([refused, shownErrors(field)]).toEqual([['setDeckSize: too big'], []]);
  });
});
