import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { animateCrowd } from '../../../../src/render/venue/crowdAnimation';
import { colourLedStrip } from '../../../../src/render/venue/ledStripColour';
import { animatePerformers } from '../../../../src/render/venue/performersAnimation';
import type { Performer } from '../../../../src/render/venue/performerSpec';

// The expected values use the legacy frame-loop expressions verbatim (src/main.ts 2462, 4731, 5477-5484).
const tempo = { beatOrigin: 1234.5, bpm: 128 };
const now = 98765.4;

describe('render/venue per-frame updates', () => {
  it('animatePerformers matches the legacy animPerformers', () => {
    const p: Performer = {
      body: new Group(),
      head: new Mesh(),
      baseY: 1.8,
      facing: 0.25,
      phase: 2.1,
      bounce: 0.05,
      sway: 0.1,
    };
    animatePerformers([p], now, tempo);
    const bf = (((now - tempo.beatOrigin) * tempo.bpm) / 60) * Math.PI * 2;
    const b = Math.sin(bf + p.phase);
    expect(p.body.position.y).toBe(p.baseY + Math.abs(b) * p.bounce);
    expect(p.body.rotation.y).toBe(p.facing + Math.sin(bf * 0.25 + p.phase) * p.sway);
    expect(p.head.rotation.x).toBe(b * 0.12);
  });

  it('animateCrowd writes the legacy beat phase and the given jump', () => {
    const uniforms = { uBeat: { value: 0 }, uJump: { value: 1 } };
    animateCrowd(uniforms, now, tempo, 0.42);
    expect(uniforms.uBeat.value).toBe((((now - tempo.beatOrigin) * tempo.bpm) / 60) * Math.PI);
    expect(uniforms.uJump.value).toBe(0.42);
  });

  it('colourLedStrip matches the legacy strip colour', () => {
    const strip = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const o = { r: 80, g: 30, b: 55 },
      intensity = 0.7;
    colourLedStrip(strip, o, intensity);
    const expected = new MeshBasicMaterial().color.setRGB(
      (o.r / 100) * intensity * 2,
      (o.g / 100) * intensity * 2,
      (o.b / 100) * intensity * 2,
    );
    expect(strip.material.color.toArray()).toEqual(expected.toArray());
  });
});
