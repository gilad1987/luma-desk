import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../src/core/index.ts';

type TestEvents = { message: string; count: number; tick: undefined; constructor: string };

function recordingBus() {
  const bus = new EventBus<TestEvents>();
  const calls: string[] = [];
  const record = (name: string) => (payload: unknown) => calls.push(`${name}:${String(payload)}`);
  return { bus, calls, record };
}

describe('EventBus', () => {
  it('delivers synchronously, before emit returns, in subscribe order', () => {
    const { bus, calls, record } = recordingBus();
    bus.on('message', record('a'));
    bus.on('message', record('b'));
    bus.on('message', record('c'));
    bus.emit('message', 'hi');
    expect(calls).toEqual(['a:hi', 'b:hi', 'c:hi']);
  });

  it('delivers only to the listeners of the emitted type', () => {
    const { bus, calls, record } = recordingBus();
    bus.on('message', record('m'));
    bus.on('count', record('n'));
    bus.emit('count', 3);
    bus.emit('tick', undefined);
    expect(calls).toEqual(['n:3']);
  });

  it('stops calling a listener after unsubscribe; a second unsubscribe does nothing', () => {
    const { bus, calls, record } = recordingBus();
    const off = bus.on('message', record('a'));
    bus.on('message', record('b'));
    off();
    off();
    bus.emit('message', 'x');
    expect(calls).toEqual(['b:x']);
  });

  it('treats the same function subscribed twice as two subscriptions', () => {
    const { bus, calls, record } = recordingBus();
    const listener = record('a');
    const offFirst = bus.on('message', listener);
    bus.on('message', listener);
    bus.emit('message', '1');
    offFirst();
    bus.emit('message', '2');
    expect(calls).toEqual(['a:1', 'a:1', 'a:2']);
  });

  it('iterates a snapshot: a listener removed during emit still runs in that emit, an added one waits', () => {
    const { bus, calls, record } = recordingBus();
    let offLater = (): void => undefined;
    bus.on('message', (payload) => {
      calls.push(`first:${payload}`);
      offLater();
      bus.on('message', record('added'));
    });
    offLater = bus.on('message', record('later'));
    bus.emit('message', '1');
    expect(calls).toEqual(['first:1', 'later:1']);
    bus.emit('message', '2');
    expect(calls).toEqual(['first:1', 'later:1', 'first:2', 'added:2']);
  });

  it('lets an error from a listener reach the emitter and skips the listeners after it', () => {
    const { bus, calls, record } = recordingBus();
    bus.on('message', () => {
      throw new Error('boom');
    });
    bus.on('message', record('after'));
    expect(() => bus.emit('message', 'x')).toThrow('boom');
    expect(calls).toEqual([]);
  });

  it('handles an event named like an Object member', () => {
    const { bus, calls, record } = recordingBus();
    bus.emit('constructor', 'none');
    bus.on('constructor', record('k'));
    bus.emit('constructor', 'yes');
    expect(calls).toEqual(['k:yes']);
  });
});
