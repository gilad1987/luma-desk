import {
  BoxGeometry,
  MeshBasicMaterial,
  PlaneGeometry,
  type Material,
  type Mesh,
  type Object3D,
  type PointLight,
  type ShaderMaterial,
} from 'three';
import type { Fixture } from '../../domain/Fixture';
import type { StageDeck, StageScreen } from '../../domain/stage/StageDesign';
import type { ScreenSlot } from '../fixtures/FixtureVisuals';
import { addMesh } from '../shared';
import { createLedWallMaterial, type LedWallUniforms } from './ledWallMaterial';

/** The LED strip under the deck nosing, coloured by the screen fixture. */
type LedStrip = Mesh<BoxGeometry, MeshBasicMaterial>;

/** One built LED wall: the screen fixture it belongs to and everything that fixture drives. */
export interface BuiltScreen {
  readonly fixtureId: number;
  /** The wall itself; also the screen fixture's visual and pick target. */
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  readonly uniforms: LedWallUniforms;
  readonly strip: LedStrip;
}

function buildStrip(parent: Object3D, deck: StageDeck): LedStrip {
  return addMesh(
    parent,
    new BoxGeometry(deck.x1 - deck.x0, 0.06, 0.06),
    new MeshBasicMaterial({ color: 0x000000, toneMapped: false }),
    { position: [(deck.x0 + deck.x1) / 2, deck.height - 0.12, deck.z1 + 0.06] },
  );
}

/**
 * Builds one LED wall in the legacy order: the wall, its side screens (they share its material, so they show the
 * same picture) each with a frame, the deck strip, then the wall's frame.
 */
function buildScreen(parent: Object3D, s: StageScreen, dark: Material, strip: () => LedStrip): BuiltScreen {
  const width = s.x1 - s.x0,
    height = s.y1 - s.y0,
    centre = [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2] as const;
  // the legacy code built the geometry first, then the material: each takes the next uuid
  const geometry = new PlaneGeometry(width, height);
  const material = createLedWallMaterial();
  const mesh = addMesh(parent, geometry, material, { position: [...centre, s.z] });
  for (const side of s.sides ?? []) {
    const [x, y, z] = side.at,
      out = Math.sign(x) || 1,
      rotation = [0, side.yaw, 0] as const;
    addMesh(parent, new PlaneGeometry(side.width, side.height), material, { position: side.at, rotation });
    addMesh(parent, new BoxGeometry(side.width + 0.5, side.height + 0.45, 0.35), dark, {
      position: [x + out * 0.07, y, z - 0.2],
      rotation,
    });
  }
  const built = { fixtureId: s.fixtureId, mesh, uniforms: material.uniforms, strip: strip() };
  addMesh(parent, new BoxGeometry(width + 0.4, height + 0.4, 0.3), dark, { position: [...centre, s.z - 0.2] });
  return built;
}

/** Builds every LED wall of a design; the first wall builds the one deck strip and every wall drives it. */
export function buildScreens(
  parent: Object3D,
  screens: readonly StageScreen[],
  deck: StageDeck,
  dark: Material,
): BuiltScreen[] {
  let strip: LedStrip | null = null;
  return screens.map((s) => buildScreen(parent, s, dark, () => (strip ??= buildStrip(parent, deck))));
}

/** The fixture slots of the built walls, by screen fixture id; all walls spill through the one screen light. */
export function screenSlotsOf(screens: readonly BuiltScreen[], light: PointLight): Map<number, ScreenSlot> {
  return new Map(
    screens.map((s) => [s.fixtureId, { mesh: s.mesh, targets: { uniforms: s.uniforms, light, strip: s.strip } }]),
  );
}

/** The fixtures that get a visual: a screen fixture whose wall is not built (no wall, or `ledWall` hidden) has none. */
export function withWalls(fixtures: readonly Fixture[], slots: ReadonlyMap<number, ScreenSlot>): readonly Fixture[] {
  return fixtures.filter((f) => f.T.shape !== 'screen' || slots.has(f.id));
}
