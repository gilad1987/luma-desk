import type { Vector3 } from 'three';
import type { Fixture } from '../../domain/Fixture';

/** A linear RGB triple on 0..1, the colour form the fixture sync computes per fixture. */
export type RgbTriple = readonly [r: number, g: number, b: number];

/** The three audience zones, left to right; one tuple slot per zone light. */
export type ZoneIndex = 0 | 1 | 2;

/** Zone indices in light order, so loops over zones keep tuple-typed access. */
export const ZONE_INDICES: readonly ZoneIndex[] = [0, 1, 2];

/** A running colour sum. */
export interface RgbSum {
  r: number;
  g: number;
  b: number;
}

/** A beam that lands on the stage floor nearby; the brightest twelve become real spot lights. */
export interface KeyLightCandidate {
  readonly fixture: Fixture;
  readonly score: number;
  readonly intensity: number;
  readonly color: RgbTriple;
  readonly zoom: number;
  /** Distance from the fixture to the hit surface. */
  readonly length: number;
  readonly position: Vector3;
  readonly direction: Vector3;
}

const createEmptySum = (): RgbSum => ({ r: 0, g: 0, b: 0 });

/** The audience zone a beam landing at world x lights: left of -13, right of 13, else centre. */
function zoneIndexAt(x: number): ZoneIndex {
  if (x < -13) return 0;
  if (x > 13) return 2;
  return 1;
}

/**
 * What the beams contributed to the shared scene lights this frame. The fixture sync fills it per fixture and the
 * scene and key lights read it once, so the aggregate maths has one owner.
 */
export class LightFrame {
  readonly stage: RgbSum = createEmptySum();
  readonly zones: readonly [RgbSum, RgbSum, RgbSum] = [createEmptySum(), createEmptySum(), createEmptySum()];
  /** Sum of blinder intensities; they light the whole audience. */
  blinders = 0;
  readonly keyCandidates: KeyLightCandidate[] = [];
  /** Every sum, built once so `reset` allocates nothing per frame. */
  private readonly sums: readonly RgbSum[] = [this.stage, ...this.zones];

  /** Starts a new frame. */
  reset(): void {
    for (let i = 0; i < this.sums.length; i++) {
      const sum = this.sums[i];
      if (!sum) continue;
      sum.r = 0;
      sum.g = 0;
      sum.b = 0;
    }
    this.blinders = 0;
    this.keyCandidates.length = 0;
  }

  /** Adds a stage-floor hit; the product order (colour x intensity x power) is kept for float parity. */
  addStage(color: RgbTriple, intensity: number, power: number): void {
    this.stage.r += color[0] * intensity * power;
    this.stage.g += color[1] * intensity * power;
    this.stage.b += color[2] * intensity * power;
  }

  /** Adds an audience hit at world x to its zone. */
  addAudience(x: number, color: RgbTriple, weight: number): void {
    const zone = this.zones[zoneIndexAt(x)];
    zone.r += color[0] * weight;
    zone.g += color[1] * weight;
    zone.b += color[2] * weight;
  }

  /** Adds one blinder's intensity. */
  addBlinder(intensity: number): void {
    this.blinders += intensity;
  }

  /** Offers a beam as a key light; order is kept so equal scores sort as before. */
  addKeyCandidate(candidate: KeyLightCandidate): void {
    this.keyCandidates.push(candidate);
  }
}
