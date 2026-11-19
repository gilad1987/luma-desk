/**
 * A value the GDTF writes that the import does not use, so the desk type's default stays in place. `missing`: the
 * channel function has no `PhysicalFrom` and `PhysicalTo`. `noRange`: the range is at most 1 wide, which is the
 * GDTF default 0 to 1 or an empty range (zoom 0 to 0). `tooSmall`: a pan range under 90 degrees, which no moving
 * head has. `outOfRange`: an angle that is not above 0 and at most 180 degrees. `specDefaults`: the `Beam` holds
 * only GDTF default values (flux 10000, angles 25, 6000 K, 1000 W), which is what a writer leaves when it knows
 * nothing. `zero`: a luminous flux of 0. `belowBeam`: a field angle under the beam angle, which cannot be, as the
 * field (10 % of peak) is never narrower than the beam (50 % of peak). `implausible`: a luminous flux that is more
 * lumens per watt of the beam's stated power than its lamp type can give (`beamFlux`). `loneDefault`: one GDTF
 * default value among real ones that nothing else in the file confirms (`outputOptics`). `indirect`: the mode mixes
 * colour only through indirect attributes (`ColorRGB_*`), which name no emitter, so it gets no colour system.
 */
export interface OpticsDrop {
  readonly part:
    | 'pan'
    | 'tilt'
    | 'zoom'
    | 'beam'
    | 'beamAngle'
    | 'fieldAngle'
    | 'flux'
    | 'lampType'
    | 'colorTemperature'
    | 'cri'
    | 'colorMixing';
  readonly reason:
    | 'indirect'
    | 'missing'
    | 'noRange'
    | 'tooSmall'
    | 'outOfRange'
    | 'specDefaults'
    | 'zero'
    | 'belowBeam'
    | 'implausible'
    | 'loneDefault';
}
