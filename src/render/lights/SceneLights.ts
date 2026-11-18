import { PointLight, type Light, type Scene } from 'three';
import type { Venue } from '../venue/Venue';
import { addHouseLights } from './addHouseLights';
import { addZoneLights, type ZoneLights } from './addZoneLights';
import { ZONE_INDICES, type LightFrame, type RgbSum } from './LightFrame';

/** Sets a light to the normalised colour of a sum and returns the sum's peak channel (0 when dark). */
function applyNormalisedColour(light: PointLight, sum: RgbSum): number {
  const peak = Math.max(sum.r, sum.g, sum.b);
  if (peak > 0) light.color.setRGB(sum.r / peak, sum.g / peak, sum.b / peak);
  return peak;
}

/**
 * The shared scene lights that stand in for light bouncing off the stage and crowd: stage bounce, blinder wash,
 * three audience zones, house lights and the LED screen glow. Build step 2 of the scene lights; it runs right after
 * the LED wall. The fixture sync writes the screen light directly and the rest through `update`.
 */
export class SceneLights {
  readonly stageLight: PointLight;
  readonly audienceLight: PointLight;
  private readonly zoneLights: ZoneLights;
  private readonly houseLights: readonly Light[];
  /** Lit by the LED screen fixture in its own branch of the fixture sync. */
  readonly screenLight: PointLight;
  private readonly venue: Pick<Venue, 'wallFloodlight'>;
  private houseLevel = 0.3;

  /**
   * `venue` is the live venue: its old-city floodlight exists but is forced dark every frame (render quirk, 02 §4.8),
   * and a venue switch brings a new floodlight or none.
   */
  constructor(scene: Scene, venue: Pick<Venue, 'wallFloodlight'>) {
    this.stageLight = new PointLight(0xffffff, 0, 34, 1.5);
    this.stageLight.position.set(0, 9, -10);
    scene.add(this.stageLight);
    this.audienceLight = new PointLight(0xffa860, 0, 95, 1);
    this.audienceLight.position.set(0, 18, 10);
    scene.add(this.audienceLight);
    this.zoneLights = addZoneLights(scene);
    this.houseLights = addHouseLights(scene);
    this.screenLight = new PointLight(0xffffff, 0, 40, 1.2);
    this.screenLight.position.set(0, 8, -16);
    scene.add(this.screenLight);
    this.venue = venue;
  }

  /** The house light dimmer, 0..1 (the UI slider divided by 100). */
  setHouseLevel(level: number): void {
    this.houseLevel = level;
  }

  /** Applies this frame's beam contributions; call after the fixture sync filled the frame. */
  update(frame: LightFrame): void {
    const stagePeak = applyNormalisedColour(this.stageLight, frame.stage);
    this.stageLight.intensity = stagePeak > 0 ? Math.min(stagePeak * 0.12, 6) : 0;
    this.audienceLight.intensity = frame.blinders * 4;
    for (const zone of ZONE_INDICES) {
      const light = this.zoneLights[zone];
      const peak = applyNormalisedColour(light, frame.zones[zone]);
      light.intensity = peak > 0 ? Math.min(peak * 4.5, 70) : 0;
      light.intensity += frame.blinders * 6;
    }
    // indexed loop, no closure: this runs every frame
    for (let i = 0; i < this.houseLights.length; i++) {
      const light = this.houseLights[i];
      if (light) light.intensity = this.houseLevel * (i === 2 ? 500 : 1100);
    }
    const wallLight = this.venue.wallFloodlight;
    if (wallLight) wallLight.intensity = 0;
  }
}
