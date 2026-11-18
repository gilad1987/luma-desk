import type { Object3D } from 'three';
import { PROXY_GROUP } from './proxies';

/**
 * True for what the desk draws in a layer in place of file data: a proxy mesh, and everything that hangs in the
 * layer's proxy group (the panels, the seats and the audience on them). A mark of the user on a layer, such as
 * "LED", says what the file's own meshes are, so it passes these by: an audience that takes the mark is drawn as
 * one flat LED picture.
 */
export function isDeskMade(node: Object3D): boolean {
  if (node.name.startsWith('mvr-proxy-')) return true;
  for (let at = node.parent; at; at = at.parent) if (at.name === PROXY_GROUP) return true;
  return false;
}
