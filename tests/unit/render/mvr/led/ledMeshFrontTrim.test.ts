/**
 * The front of a merged mesh with trim: a small separate part (a top cap, an end sheet) does not cancel the front
 * of the screen it trims, while a second screen that faces another way still does.
 */
import { BoxGeometry, Mesh, PlaneGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { describe, expect, it } from 'vitest';
import { meshFront } from '../../../../../src/render/mvr/led/ledMeshFront.ts';

const seated = { seats: new Vector3(0, 0, 30), middle: new Vector3(0, 3, 0) };
const merged = (...parts: BufferGeometry[]): Mesh => new Mesh(mergeGeometries(parts));

describe('the front of a screen with trim merged into one mesh', () => {
  it('keeps the front of a 6 x 3 m screen with a separate 2 cm top cap', () => {
    const screen = new BoxGeometry(6, 3, 0.1).translate(0, 3, 0);
    const cap = new BoxGeometry(6, 0.02, 0.12).translate(0, 4.52, 0);
    expect(meshFront(merged(screen, cap), seated)?.toArray()).toEqual([0, 0, 1]);
  });

  it('keeps the front of a front sheet with a separate thin end sheet', () => {
    const sheet = new PlaneGeometry(6, 3).translate(0, 3, 0);
    const end = new PlaneGeometry(0.1, 3).rotateY(Math.PI / 2).translate(3.05, 3, -0.05);
    expect(meshFront(merged(sheet, end), seated)?.toArray()).toEqual([0, 0, 1]);
  });

  it('gives no front for a main screen and a side screen of a quarter of its area', () => {
    const main = new BoxGeometry(6, 3, 0.1).translate(0, 3, 0);
    const side = new BoxGeometry(3, 1.5, 0.1).rotateY(-Math.PI / 2).translate(6, 3, 0);
    expect(meshFront(merged(main, side), seated)).toBeUndefined();
  });
});
