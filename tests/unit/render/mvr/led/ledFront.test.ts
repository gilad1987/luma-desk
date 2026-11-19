/**
 * The front of a marked LED solid: one world direction, its largest face group on the audience side. The audience
 * is where the seat proxies are, else downstage (+Z). Only that side emits (`uLedFront`); the rest is the cabinet.
 */
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ledFrontOf } from '../../../../../src/render/mvr/led/ledFront.ts';
import { drawAsLed } from '../../../../../src/render/mvr/led/ledLayerLook.ts';
import { createLedMaterial } from '../../../../../src/render/mvr/led/ledMaterial.ts';
import { LED_FRAGMENT } from '../../../../../src/render/mvr/led/ledShader.ts';
import { directionsOf, stageSides } from '../../../../../src/render/mvr/led/ledStageSides.ts';

const toAudience = new Vector3(0, 0, 1);
const rounded = (v: Vector3): number[] => v.toArray().map((n) => Math.round(n * 1000) / 1000 + 0);
/** A 14 m wide, 9 m high, 9 m deep solid upstage, as a file holds an LED wall with no screen evidence. */
const solid = (): Mesh => {
  const mesh = new Mesh(new BoxGeometry(14, 9, 9), new MeshStandardMaterial());
  mesh.position.set(0, 4.5, -12);
  return mesh;
};
const frontOf = (mesh: Mesh): unknown =>
  Array.isArray(mesh.material) ? undefined : mesh.material.userData['ledFront'];
const seatsAt = (x: number, z: number): Mesh => {
  const seats = new Mesh(new BoxGeometry(10, 1, 6), new MeshStandardMaterial());
  seats.name = 'mvr-proxy-seat';
  seats.position.set(x, 0, z);
  return seats;
};

describe('ledFrontOf', () => {
  it('takes the wide face of a solid that looks at the audience, not the top, the ends or the back', () => {
    expect(rounded(ledFrontOf(solid(), { toAudience }))).toEqual([0, 0, 1]);
    expect(rounded(ledFrontOf(solid(), { toAudience: new Vector3(-1, 0, 0) }))).toEqual([-1, 0, 0]);
  });

  it('follows the turn of a solid that stands at an angle', () => {
    const mesh = solid();
    mesh.rotation.y = Math.PI / 6;
    expect(rounded(ledFrontOf(mesh, { toAudience }))).toEqual([0.5, 0, 0.866]);
  });

  it('takes the wide face of a side-on screen toward the stage middle, not its thin edge', () => {
    const screen = new Mesh(new BoxGeometry(4, 2, 0.2), new MeshStandardMaterial());
    screen.rotation.y = Math.PI / 2;
    expect(rounded(ledFrontOf(screen, { toAudience, inward: new Vector3(1, 0, 0) }))).toEqual([1, 0, 0]);
    expect(rounded(ledFrontOf(screen, { toAudience, inward: new Vector3(-1, 0, 0) }))).toEqual([-1, 0, 0]);
  });

  it('turns an open sheet that is drawn from behind to the audience', () => {
    const sheet = new Mesh(new PlaneGeometry(4, 2), new MeshStandardMaterial());
    sheet.rotation.y = Math.PI;
    expect(rounded(ledFrontOf(sheet, { toAudience }))).toEqual([0, 0, 1]);
  });
});

describe('the sides of a stage', () => {
  it('are downstage without seats and the direction to the seat proxies with them', () => {
    const stage = new Group().add(new Group().add(solid()), new Group().add(seatsAt(0, -30)));
    expect(stageSides(new Group().add(solid())).seats).toBeUndefined();
    expect(rounded(directionsOf(solid(), stageSides(new Group().add(solid()))).toAudience)).toEqual([0, 0, 1]);
    expect(rounded(directionsOf(solid(), stageSides(stage)).toAudience)).toEqual([0, 0, -1]);
  });
});

describe('drawAsLed', () => {
  it('gives each solid a material with its own front, from the seats of the stage when it has some', () => {
    const [wall, thin] = [solid(), new Mesh(new BoxGeometry(6, 3, 0.3), new MeshStandardMaterial())];
    thin.position.set(-12, 2, -4);
    thin.rotation.y = Math.PI / 4;
    const layer = new Group().add(wall, thin);
    const stage = new Group().add(layer);
    drawAsLed(layer, createLedMaterial(), true);
    expect([frontOf(wall), frontOf(thin)].map((v) => rounded(v as Vector3))).toEqual([
      [0, 0, 1],
      [0.707, 0, 0.707],
    ]);
    expect(wall.material).not.toBe(thin.material);
    drawAsLed(layer, createLedMaterial(), false);
    stage.add(new Group().add(seatsAt(-40, -12)));
    drawAsLed(layer, createLedMaterial(), true);
    expect(rounded(frontOf(wall) as Vector3)).toEqual([-1, 0, 0]);
  });

  it('emits only on faces within 60 degrees of the front, and maps the wall by that one axis', () => {
    expect(LED_FRAGMENT).toContain('float ledFace = ledFronted ? step(0.5, dot(ledNormal, uLedFront)) : 1.0;');
    expect(LED_FRAGMENT).toContain('vec3 ledAxis = ledFronted ? uLedFront : ledNormal;');
  });
});
