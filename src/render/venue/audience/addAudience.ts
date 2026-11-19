import type { Object3D } from 'three';
import { proxyMeshes } from '../../mvr/proxies';
import { AudienceLayer } from './AudienceLayer';
import { audienceMaterial, type AudienceUniforms } from './audienceShader';
import { AUDIENCE_GROUP } from './figureSlot';
import { DEFAULT_AUDIENCE, type AudienceChoice } from './occupancy';

/** The audience layers of the stage now built; the import summary's choice reaches them here (`setAudience`). */
const layers = new Set<AudienceLayer>();
const clock: AudienceUniforms = { uTime: { value: 0 } };
let choice: AudienceChoice = DEFAULT_AUDIENCE;

function apply(layer: AudienceLayer): void {
  layer.visible = choice.shown;
  layer.setOccupancy(choice.occupancy);
}

/** The figures now built and switched on, over every seat layer; a hidden layer hides its figures on its own. */
export const audienceFigures = (): number =>
  [...layers].reduce((sum, layer) => sum + (layer.visible ? layer.figures : 0), 0);

/** The number of seat layers that have their audience: 0 means no audience was built for the stage on screen. */
export const audienceLayers = (): number => layers.size;

/**
 * Seats the desk's audience on every seat proxy mesh under `root`, and returns the number of figures. The audience
 * is an addition of the desk, not file data: it lives only in the render scene. Each layer's figures hang in the
 * layer's proxy group, so they follow the layer's visibility and the "Show proxies" choice, and the stage frees
 * them with the proxies. A seat layer that has its audience is left as it is.
 */
export function addAudience(root: Object3D): number {
  for (const seats of proxyMeshes(root, 'seat')) {
    const holder = seats.parent;
    if (!holder || holder.getObjectByName(AUDIENCE_GROUP)) continue;
    const layer: AudienceLayer = new AudienceLayer(seats, audienceMaterial(clock), clock, () => {
      layers.delete(layer);
      // The choice is for the stage on screen: the next stage starts with the default again.
      if (layers.size === 0) choice = DEFAULT_AUDIENCE;
    });
    apply(layer);
    holder.add(layer);
    layers.add(layer);
  }
  return audienceFigures();
}

/** Applies the "Audience" choice of the import summary to the stage on screen; returns the figures now drawn. */
export function setAudience(next: AudienceChoice): number {
  choice = next;
  layers.forEach(apply);
  return audienceFigures();
}
