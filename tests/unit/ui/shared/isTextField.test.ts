/**
 * Owns which elements count as a text field for the page and builder keys. How each key listener uses it is owned by
 * builderKeys.test.ts and the command-line tests.
 */
import { describe, expect, it } from 'vitest';
import { isTextField } from '../../../../src/ui/shared';
import { asReal, FakeElement } from '../../../shared/dom';

const field = (tagName: string): boolean => isTextField(asReal<Element>(new FakeElement(tagName)));

describe('isTextField', () => {
  it('is true for INPUT, TEXTAREA and SELECT', () => {
    expect(['INPUT', 'TEXTAREA', 'SELECT'].map(field)).toEqual([true, true, true]);
  });

  it('is false for other elements and for no element', () => {
    expect([field('BUTTON'), field('DIV'), field('BODY'), isTextField(null)]).toEqual([false, false, false, false]);
  });
});
