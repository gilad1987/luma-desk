/**
 * The physical range of one axis from the fixture's own GDTF channel function (`PhysicalFrom`, `PhysicalTo` of the
 * Pan or Tilt function): degrees at the lowest and at the highest DMX value. The order carries the maker's sign: one
 * maker writes Pan -270 to 270, another 270 to -270, and the second head turns the other way for the same DMX value.
 */
export interface AxisRange {
  readonly physicalFrom: number;
  readonly physicalTo: number;
}

/** The pan and tilt ranges of one fixture; an axis the GDTF does not give takes the desk default of the caller. */
export interface PanTiltRanges {
  readonly pan?: AxisRange;
  readonly tilt?: AxisRange;
}

/**
 * The physical angle in degrees of an axis at `share`, the DMX value as a share of its full range (0 to 1, clamped):
 * linear from `PhysicalFrom` to `PhysicalTo`, as the GDTF channel function defines it. Without a range of the
 * fixture the desk default applies.
 *
 * Contract for the code that turns the joints (see `docs/mvr-fixture-frames.md` for the sources). The angle is about
 * the GDTF axis of the part in its own frame: pan about +Z of the yoke, tilt about +X of the head (GDTF: "the pan
 * axis is Z aligned, and the tilt axis is X aligned", right-handed coordinates). GDTF does not state which way a
 * positive angle turns. Two public sources point to the right-hand rule on both axes: the open-source BlenderDMX
 * add-on, and a 2019 maintainer comment in issue 24 of `mvrdevelopment/spec` ("we have a right handed coordinate
 * system. So positive values would be CCW"; the issue is open). The decision: a fixture with trusted GDTF ranges
 * turns by the right-hand rule on both axes, with the maker's sign from the range; any other fixture keeps the desk
 * rule (pan the same way, tilt the other way: `syncPose` sets `rotation.x = -tilt`, in step with `dirFrom`).
 *
 * NOT WIRED. The draw (`syncPose`) and every solve (`aimAt`, `reachAim`, `aimErrorDeg`) read one formula, `dirFrom`
 * in `src/domain/aim.ts`, which sees no optics. Turning only the joints here would draw a head that looks away from
 * its own beam cone and from the point a cue aims at. The doc lists what must change together.
 */
export function physicalAngle(share: number, range: AxisRange | undefined, deskDefault: AxisRange): number {
  const { physicalFrom, physicalTo } = range ?? deskDefault;
  return physicalFrom + Math.min(1, Math.max(0, share)) * (physicalTo - physicalFrom);
}
