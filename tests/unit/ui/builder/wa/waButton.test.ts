// @vitest-environment jsdom
/**
 * Owns the disabled state `setWaDisabled` writes: the attribute and, on an element that has one, the property. That a
 * real `wa-button` greys out needs the component in a browser, so it is owned by tests/e2e/builder-*.spec.ts.
 */
import { describe, expect, it } from 'vitest';
import { setWaDisabled } from '../../../../../src/ui/builder/wa/waButton';

describe('setWaDisabled', () => {
  // catches a button that stays clickable before the component upgrades, when only the attribute is read
  it('sets the disabled attribute when off', () => {
    const el = document.createElement('div');
    setWaDisabled(el, true);
    expect(el.hasAttribute('disabled')).toBe(true);
  });

  // catches a button that stays greyed out after the edit becomes possible again
  it('removes the disabled attribute when on', () => {
    const el = document.createElement('div');
    el.setAttribute('disabled', '');
    setWaDisabled(el, false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  // catches an upgraded element whose property disagrees with the attribute: the property here does not follow the
  // attribute (as on a native button), so only a direct property write turns it off and on
  it('sets the disabled property of an element that has one', () => {
    const el = Object.defineProperty(document.createElement('div'), 'disabled', { value: false, writable: true });
    setWaDisabled(el, true);
    const off = [Reflect.get(el, 'disabled'), el.hasAttribute('disabled')];
    setWaDisabled(el, false);
    expect([off, [Reflect.get(el, 'disabled'), el.hasAttribute('disabled')]]).toEqual([
      [true, true],
      [false, false],
    ]);
  });
});
