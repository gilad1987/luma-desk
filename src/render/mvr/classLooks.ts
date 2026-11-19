import { Color, MeshStandardMaterial, SRGBColorSpace, type Material } from 'three';
import { followHall } from '../lighting/hallReflection';
import { MIN_ALBEDO } from '../lighting/surfacePhotometry';
import type { SceneryClass } from './materialClass';
import type { Tone } from './sceneryTone';

/** How one scenery class draws: its sRGB lightness span, roughness, metalness and share of the hall reflection. */
interface ClassLook {
  /** sRGB lightness for a dark file colour and for a light one: a black truss stays darker than a silver one. */
  readonly dark: number;
  readonly light: number;
  readonly roughness: number;
  readonly metalness: number;
  /** How much of the hall environment the surface reflects: 0 for cloth, which must show no sheen. */
  readonly reflection: number;
}

/**
 * Physically based values per class. Bases stay dark, as stage surfaces are at night, but light enough to read under
 * white work light. Metals reflect the hall (`createHallEnvironment`) with a soft highlight; cloth is fully rough and
 * reflects nothing; deck and speaker keep a dull satin sheen; the figure is a light neutral matte so people read.
 */
const LOOKS: Readonly<Record<SceneryClass, ClassLook>> = {
  truss: { dark: 0.22, light: 0.64, roughness: 0.38, metalness: 0.9, reflection: 1 },
  scaffold: { dark: 0.18, light: 0.4, roughness: 0.5, metalness: 0.75, reflection: 1 },
  deck: { dark: 0.07, light: 0.16, roughness: 0.55, metalness: 0, reflection: 0.5 },
  cloth: { dark: 0.05, light: 0.12, roughness: 1, metalness: 0, reflection: 0 },
  wall: { dark: 0.14, light: 0.36, roughness: 0.92, metalness: 0, reflection: 0.2 },
  speaker: { dark: 0.07, light: 0.12, roughness: 0.7, metalness: 0.15, reflection: 0.4 },
  figure: { dark: 0.5, light: 0.62, roughness: 0.85, metalness: 0, reflection: 0.3 },
  default: { dark: 0.1, light: 0.36, roughness: 0.8, metalness: 0, reflection: 0.3 },
};

/** Saturation of the file hue in a class colour: enough to tell a red deck from a blue one, never a CAD glare. */
const TINT = 0.12;

const held = (channel: number): number => Math.max(channel, MIN_ALBEDO);

/** The draw settings a class look keeps from the file material. */
export type Surface = Pick<Material, 'side' | 'transparent' | 'opacity'>;

/**
 * A new material for `sceneryClass` in the file colour's `tone`: the class lightness span picked by the tone's level,
 * the tone's hue at a low tint, and the hall map of the stage as its reflection when the class reflects
 * (`followHall`: the one map that the fixture bodies mirror too).
 */
export function classMaterial(sceneryClass: SceneryClass, tone: Tone, surface: Surface): MeshStandardMaterial {
  const look = LOOKS[sceneryClass];
  const lightness = look.dark + (tone.level / 2) * (look.light - look.dark);
  const color = new Color().setHSL(tone.hue ?? 0, tone.hue === undefined ? 0 : TINT, lightness, SRGBColorSpace);
  // One rule for both passes: the light pass holds a base colour at `MIN_ALBEDO`, so the deck, where the pools of
  // the rig meet the house light, has that floor under the hall light too. Else the key stood 10 to 37 times over
  // the house on a deck (the balance says 2.83, `keyToHouse`) and the deck was near black at House 30.
  if (sceneryClass === 'deck') color.setRGB(held(color.r), held(color.g), held(color.b));
  const { side, transparent, opacity } = surface;
  const { roughness, metalness, reflection } = look;
  const material = new MeshStandardMaterial({ color, roughness, metalness, side, transparent, opacity });
  // the reflection follows the house level and the lit rig (`hallLevel`): a dark hall gives nothing to mirror
  if (reflection > 0) followHall(material, reflection);
  return material;
}
