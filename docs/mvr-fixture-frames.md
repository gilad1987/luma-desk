# MVR fixture frames: body orientation, pan and tilt

The rule for every code that places, turns or aims a fixture of an MVR import. The first-look code follows it.

## Frames

- The desk world is three.js: metres, Y up. An MVR point `(x, y, z)` in millimetres is the desk point
  `(x, z, -y) / 1000` plus the fit offset of the import (`mvr.offset`).
- GDTF draws a device hanging: +Z up to the base plate, the beam along -Z at rest. GDTF X, Y and Z are the desk
  X, -Z and Y. In the desk frame the rest beam is `(0, -1, 0)` and the base is at +Y.
- `StageFixture.rotation` is a unit quaternion `[x, y, z, w]` in the desk world. It turns the hanging rest pose into
  the real body pose. It is the rotation part of the fixture's MVR `<Matrix>`, changed to desk axes, and nothing else.

## When a fixture has a `rotation`

- A fixture of a file from another tool has a `rotation` for every matrix that is not the hanging rest pose
  (0.01 degrees). A unit turned over to stand on the floor has `rotation` `[1, 0, 0, 0]`. Its body and its pan zero
  face where the file says.
- A fixture without a `rotation` is in the desk's own rest pose of its `mount`: hanging, or the desk floor pose.
- The desk floor pose (no `rotation`, `mount: 'floor'`) exists only for fixtures made on the desk: templates, the
  built-in rig, and stages saved before this rule. It is not a turned-over body: it is drawn turned about Z and aims
  by the floor formula of `dirFrom`, a mirror of "hung and turned over".
- A desk export writes the turned-over matrix for both. The luma link of a fixture with a `rotation` has
  `ownRotation: true`; the import keeps the matrix as `rotation` only with that flag. A link without the flag (a
  desk floor unit, every older export) gives the desk floor pose back.

## What `mount` means

- `mount` comes from the matrix: `floor` when the rest beam (GDTF -Z) points up in the world, else `hang`. It gives
  the role, the mount height and the rest pose of a fixture without a `rotation`.
- `mount === 'floor'` no longer means "no rotation". Test `mount === 'floor'` for "stands on the floor" and
  `!rotation` for "desk rest pose"; do not combine them to find floor units.

## Pan and tilt

- With a `rotation`: the beam is `rotation` applied to `(sin t sin p, -cos t, sin t cos p)`, `p` pan and `t` tilt
  in degrees turned to radians (`dirFrom`). `aimAt` is the inverse. `mount` is not read.
- Without a `rotation`: `hang` uses the same vector; `floor` uses `(sin t sin p, cos t, sin t cos p)`.
- The body joints: the yoke turns about its own +Y (GDTF +Z) by `+pan`; the head turns about its own +X (GDTF +X)
  by `-tilt`. `flip` (pan turned by `-pan`) is set only for the desk floor pose, never with a `rotation`.
- A static body (no axis) turns as a whole about its hanging point, by the shortest arc from the rest beam to the
  beam direction in the body frame.
- The beam cone of a GDTF body starts at the origin of its GDTF Beam geometry. A unit with several beams has a lens
  disc at every beam origin and one cone from the centre of them.
- A body with a pan or tilt axis keeps that origin as a point in the frame of the part that carries the lens (the
  head). The frame update moves the point through the world matrix of that part (`LightSync`, `beamFrom`). A lens
  beside the tilt axis thus turns with the head, and the cone starts on the drawn lens disc at every pan and tilt
  (2 mm, the gap of the disc). It is not "the tilt axis plus a depth along the beam".

## The sign of pan and tilt: evidence

- GDTF spec (github.com/mvrdevelopment/spec, gdtf-spec.md, "Model"): "the pan axis is Z aligned, and the tilt axis
  is X aligned"; "Right-handed Cartesian Coordinates". Attribute table: Pan "sideward movement (horizontal axis)",
  Tilt "upward and the downward movement (vertical axis)". Channel function: `PhysicalFrom` "Physical start value",
  `PhysicalTo` "Physical end value". The spec does not say which way a positive angle turns.
- libMVRgdtf (github.com/mvrdevelopment/libMVRgdtf): a reader and writer; it holds no pan or tilt kinematics.
- BlenderDMX (github.com/open-stage/blender-dmx, fixture.py): the DMX value maps linearly from `physical_from` to
  `physical_to` (`dmx_to_physical`); pan sets `rotation_euler[2]` (+Z) and tilt `rotation_euler[0]` (+X) of the
  geometry to that angle, with no sign change. That is the right-hand rule on both axes.
- The desk: pan by the right-hand rule about GDTF +Z, tilt against it about GDTF +X.
- Issue 24 of github.com/mvrdevelopment/spec, "Define direction of rotation and direction of Pan/Tilt": a 2019
  maintainer comment says "we have a right handed coordinate system. So positive values would be CCW", and that a
  maker inverts an axis through `PhysicalFrom` and `PhysicalTo`. The issue is still open, so the spec text is silent.

## The sign of pan and tilt: decision (2026-11-18)

- Two public sources point to the right-hand rule on both axes. No source points the other way.
- Decision: a fixture that carries trusted GDTF pan and tilt ranges (`FixtureOptics.pan`, `FixtureOptics.tilt`:
  `from` at DMX 0, `to` at full, the maker's sign kept) turns by the right-hand rule about GDTF +Z and +X. The desk
  value of an axis is a share of the desk range; the share maps linearly from `from` to `to` (`physicalAngle`).
- A fixture without trusted ranges, every built-in fixture and the demo show keep the desk rule.
- Status: NOT wired. `physicalAngle` is tested (`physicalAngle.test.ts`, `physicalAngle.tilt.test.ts`) and unused.

### Why it is not wired, and what must change together

- One formula gives the beam direction: `dirFrom` in `src/domain/aim.ts`. The draw reads it (`syncPose`: the cone
  direction, then the joints by `+pan` and `-tilt`). Every solve reads it or its inverse `aimAt` (`reachAim` and
  `aimErrorDeg` in `src/show/mvrLook/reach.ts`, presets, the first look). `dirFrom` sees `mount` and `rotation` only.
- A change of the joints alone draws a head that looks away from its own cone and from the cue target.
- The full change, in one unit:
  1. `Fixture` (`src/domain/Fixture.ts`, built in `deriveRig`) carries the trusted pan and tilt ranges.
  2. `dirFrom` maps desk pan and tilt to physical angles for such a fixture, then uses
     `(sin t sin p, -cos t, sin t cos p)` with the tilt sign of the right-hand rule. `aimAt` is the exact inverse
     and clamps to the fixture's own range, which can be smaller or larger than the desk range.
  3. `syncPose` sets the joints from the same physical angles (`rotation.y = +pan`, `rotation.x = +tilt`).
  4. `reachAim` clamps to the fixture's range, not to `ATTR.pan` and `ATTR.tilt`.
  5. The DMX output of pan and tilt must use the same share, or the real head and the drawn head differ.
- Risk: every stored preset and cue of a saved MVR show with trusted ranges aims to another place after the change.
  Saved shows must load unchanged, so the change needs a version mark on the design (or on each fixture) and the
  old formula for shows without it. The parity suite and the built-in baselines must stay bit-exact.

## The file's static pan and tilt: `<CustomCommands>` (2026-11-18)

- MVR 1.6, CustomCommand: "The Custom command contains the command that will be executed on the fixture. The
  definition from the syntax for the command aligns with the DIN SPEC 15800:2022-02, 11.2.1.2.3, Channel Functions,
  for command based control systems." "With this feature you can also control static properties for fixture that
  cannot be controlled via DMX." The Fixture example: `Body_Pan,f 50` and `Yoke_Tilt,f 50`.
- GDTF, Channel Function: `"/FIXTURE_ID/CUSTOM_NAME_CHANNELFUCTION ,f FLOAT_VALUE_PHYSICAL"` and
  `"/FIXTURE_ID/CUSTOM_NAME_CHANNELFUCTION/percent ,f FLOAT_VALUE_PERCENT"`. `CustomName` default: "Node Name of the
  Channel function Example: Head_Dimmer.Dimmer.Dimmer".
- The reader (`parseCustomCommand`, `commandAxis` in `src/domain/stage/mvrCommand.ts`): `name ,f float`, with or
  without the id path and `/percent`. The axis is the second part of a dotted name (`Pan`, `Tilt`), or the ending
  `_Pan` or `_Tilt` of a one-part name. Any other command is kept and counted, and not used.
- The value is a physical angle of the GDTF axis, in degrees. The desk does NOT change its own rule for it. It
  converts: the beam of GDTF pan `P` and tilt `T` by the right-hand rule (pan about +Z, then tilt about +X, rest
  beam -Z) is `(-sin T sin P, sin T cos P, -cos T)` in the GDTF frame and `(-sin T sin P, -cos T, -sin T cos P)` in
  the desk frame. `dirFrom` draws `(sin t sin p, -cos t, sin t cos p)`. So desk pan is `P` and desk tilt is `-T`
  (`deskAimOf` in `src/domain/stage/mvrRestAim.ts`). The desk floor pose draws a turned-over body by a mirror
  formula; there desk pan is `180 - P` and desk tilt is `-T`.
- Evidence for the right-hand rule: the two sources of "The sign of pan and tilt: evidence" above. The test
  `tests/unit/mvr/restAim.convert.test.ts` turns the rest beam with three.js axis rotations and compares it with
  `dirFrom` for five body poses.
- Pan wraps by whole turns into the desk range (-270 to 270). A tilt outside -135 to 135 has no desk value: it
  stops at the limit, and the summary names those fixtures in one line.
- The `/percent` form is a share of the range of the channel function. The desk reads it only when the fixture has
  trusted GDTF ranges (`FixtureOptics.pan`, `FixtureOptics.tilt`); without them the command is not used.
- `<DMXInvertPan>` and `<DMXInvertTilt>` do not change the pose. MVR: "Defines of all Pan Channels of the fixture
  should be DMX Inverted": the flag is about the DMX value of the channel. A command gives the physical value (GDTF:
  "FLOAT_VALUE_PHYSICAL is the physical value that the fixture should adopt"), so the head stands at the commanded
  angle with or without the flag. The desk stores both flags and writes them again in an export; it does not mirror
  the angle. None of the 15 measured files sets either flag.
- A value no head can adopt: with trusted GDTF ranges a command past `PhysicalFrom` or `PhysicalTo` stops at that
  end. Without them a value beyond 3600 degrees is not used. The summary names the fixtures in one line.
- Where it applies: the import writes the pose as `StageFixture.fixed` of a moving fixture (`withRestAim` in
  `src/mvr/import/restAim.ts`). `resetOutput` starts every frame from `fixed`, so it is the pose before any cue and
  after a clear. A cue that sets pan and tilt wins, so the first look is the same as before for the groups it aims.
- No information: when every fixture with pan and tilt commands has the same values (many files write 0 and 0 on
  all), no pose is taken and the summary says so. A file with the desk's own data keeps the poses of that data.
