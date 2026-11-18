import { describe, expect, it } from 'vitest';
import { GpuGate, type FenceGl } from '../../../../src/render/still/gpuGate';

const [ALREADY_SIGNALED, TIMEOUT_EXPIRED, CONDITION_SATISFIED, WAIT_FAILED] = [0x911a, 0x911b, 0x911c, 0x911d];

/** A WebGL2 context reduced to fences: each poll returns the next queued status and logs its arguments. */
class FakeGl implements FenceGl {
  readonly SYNC_GPU_COMMANDS_COMPLETE = 0x9117;
  readonly TIMEOUT_EXPIRED = 0x911b;
  readonly WAIT_FAILED = 0x911d;
  statuses: number[] = [];
  contextLost = false;
  readonly calls: string[] = [];
  private made = 0;
  fenceSync = (condition: GLenum, flags: GLbitfield): WebGLSync => {
    this.calls.push(`fence ${condition.toString(16)} ${flags}`);
    return { id: ++this.made };
  };
  clientWaitSync = (_sync: WebGLSync, flags: GLbitfield, timeout: GLuint64): GLenum => {
    this.calls.push(`poll ${flags} ${timeout}`);
    return this.statuses.shift() ?? ALREADY_SIGNALED;
  };
  deleteSync = (): void => void this.calls.push('delete');
  isContextLost = (): boolean => this.contextLost;
}

function make() {
  const [gl, canvas] = [new FakeGl(), new EventTarget()];
  return { gl, canvas, gate: new GpuGate(gl, canvas) };
}

describe('GpuGate', () => {
  it('is ready before any sample and sets a GPU-commands fence after one', () => {
    const { gl, gate } = make();
    expect(gate.ready()).toBe(true);
    gate.mark();
    expect(gl.calls).toEqual(['fence 9117 0']);
  });

  it('waits a frame on a timeout and proceeds once the fence is signalled, then deletes it', () => {
    for (const done of [ALREADY_SIGNALED, CONDITION_SATISFIED]) {
      const { gl, gate } = make();
      gate.mark();
      gl.statuses = [TIMEOUT_EXPIRED, done];
      expect(gate.ready()).toBe(false);
      expect(gate.ready()).toBe(true);
      expect(gl.calls).toEqual(['fence 9117 0', 'poll 0 0', 'poll 0 0', 'delete']);
      expect(gate.ready()).toBe(true);
      expect(gl.calls).toHaveLength(4);
    }
  });

  it('fails on WAIT_FAILED and still deletes the fence', () => {
    const { gl, gate } = make();
    gate.mark();
    gl.statuses = [WAIT_FAILED];
    expect(() => gate.ready()).toThrow(/WAIT_FAILED/);
    expect(gl.calls.at(-1)).toBe('delete');
  });

  it('deletes a pending fence when a new one is set and on dispose', () => {
    const { gl, gate } = make();
    gate.mark();
    gate.mark();
    gate.dispose();
    expect(gl.calls).toEqual(['fence 9117 0', 'delete', 'fence 9117 0', 'delete']);
  });

  it('fails the next poll after a webglcontextlost event, and stops listening on dispose', () => {
    const { canvas, gate } = make();
    canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(() => gate.ready()).toThrow(/context was lost/);
    const later = make();
    later.gate.dispose();
    later.canvas.dispatchEvent(new Event('webglcontextlost'));
    expect(later.gate.ready()).toBe(true);
  });

  it('fails when the context was already lost before the gate listened', () => {
    const { gl, gate } = make();
    gl.contextLost = true;
    expect(() => gate.ready()).toThrow(/context was lost/);
  });
});
