import type { Object3D } from 'three';

/** True when `node` and every group above it is visible; a light under a hidden layer gives no light. */
export function isShown(node: Object3D | null | undefined): boolean {
  for (let at = node; at; at = at.parent) if (!at.visible) return false;
  return Boolean(node);
}
