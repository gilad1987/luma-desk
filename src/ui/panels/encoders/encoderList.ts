import type { AttrName, Feature } from '../../../domain/attributes';
import type { LayoutMode } from '../layoutMode';
import type { EncoderAttr } from './encoderSpec';

/** A feature tab: the five attribute families plus the Phaser tab. */
export type FeatureTab = Feature | 'fx';

const FEATURE_ENCODERS: Readonly<Record<FeatureTab, readonly EncoderAttr[]>> = {
  dim: ['dim'],
  pos: ['pan', 'tilt'],
  gobo: ['gobo', 'grot'],
  color: ['r', 'g', 'b'],
  beam: ['zoom', 'strobe'],
  fx: ['rate', 'size', 'spread'],
};

/** The MA console keeps all five encoders live: current feature first, then the others in this fixed order. */
const MA_FILL: readonly AttrName[] = ['dim', 'pan', 'tilt', 'r', 'g', 'b', 'zoom', 'strobe', 'gobo', 'grot'];

/** The encoders a feature tab shows; the MA layout pads the row to at least five (quirk Q20, orig:1996). */
export function encoderList(feat: FeatureTab, mode: LayoutMode): readonly EncoderAttr[] {
  const list = FEATURE_ENCODERS[feat];
  if (mode !== 'ma') return list;
  return [...list, ...MA_FILL.filter((a) => !list.includes(a))].slice(0, Math.max(5, list.length));
}
