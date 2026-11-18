import { describe, expect, it } from 'vitest';
import { CommandHistory } from '../../../../src/ui/panels/command/CommandHistory';

describe('CommandHistory', () => {
  it('walks newest first and back to an empty line', () => {
    const h = new CommandHistory();
    expect(h.older()).toBeUndefined();
    h.push('a', true);
    h.push('b', true);
    expect([h.older(), h.older(), h.older()]).toEqual(['b', 'a', 'a']);
    expect([h.newer(), h.newer(), h.newer()]).toEqual(['b', '', '']);
  });

  it('a keypad push keeps the walk position (quirk Q6)', () => {
    const h = new CommandHistory();
    h.push('a', true);
    h.push('b', true);
    expect(h.older()).toBe('b');
    h.push('c', false);
    expect(h.older()).toBe('b');
  });
});
